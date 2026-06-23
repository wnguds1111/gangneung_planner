/* ==============================================
   GANGNEUNG PLANNER — app.js
   Local Storage 기반 지출/동선 CRUD & Google Maps 연동
   ============================================== */

const STORAGE_KEY = "gangneung_planner_data";

// ─── State ───
let planData = null;
let currentDay = 1;
let dayEditMode = false;

// ─── Default Data ───
const defaultData = {
  departDate: "2026-07-24T00:00:00+09:00",
  memberCount: 2,
  members: ["나", "친구 1"],
  expenses: [],
  memos: [],
  days: {
    1: [
      { id: 1001, time: "10:00", name: "경포해변", lat: 37.7951, lng: 128.9181, memo: "시원한 동해 바다 뷰 감상 🌊" },
      { id: 1002, time: "12:30", name: "초당순두부마을", lat: 37.7891, lng: 128.9137, memo: "강릉 초당 순두부와 모두부 점심 🫘" },
      { id: 1003, time: "15:00", name: "안목해변 카페거리", lat: 37.7719, lng: 128.9486, memo: "바다가 한눈에 보이는 카페에서 휴식 ☕" },
      { id: 1004, time: "18:00", name: "강릉 중앙시장", lat: 37.7541, lng: 128.8986, memo: "닭강정, 어묵고로케 등 시장 간식 투어 🍗" }
    ],
    2: [
      { id: 2001, time: "09:00", name: "정동진 해돋이", lat: 37.6914, lng: 129.0345, memo: "동해 바다에서 맞이하는 일출 🌅" },
      { id: 2002, time: "12:00", name: "하슬라아트월드", lat: 37.7088, lng: 129.0116, memo: "바다와 조각이 어우러진 현대 미술관 🎨" },
      { id: 2003, time: "16:00", name: "경포대 호수 산책", lat: 37.7955, lng: 128.8967, memo: "잔잔한 경포호 둘레길 산책 🌿" }
    ],
    3: [
      { id: 3001, time: "10:00", name: "강릉 선교장", lat: 37.7865, lng: 128.8856, memo: "300년 역사의 아름다운 한옥 고택 방문 🏡" },
      { id: 3002, time: "13:00", name: "오죽헌", lat: 37.7792, lng: 128.8795, memo: "신사임당과 율곡 이이의 생가 관람 📜" },
      { id: 3003, time: "16:00", name: "강릉역 KTX", lat: 37.7634, lng: 128.8990, memo: "아쉬움을 뒤로하고 서울행 열차 탑승 🚅" }
    ]
  }
};

// ─── Init ───
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  renderExpenses();
  renderDayTabs();
  renderTimeline();
  renderMemos();
  
  // Auto-activate Map
  activateMap();
  
  // Twinkling Starfield & Countdown timer
  generateStarField();
  startCountdown();
});

// ─── Local Storage: Load / Save ───
function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(planData));
  } catch(e) {
    console.error("Save error:", e);
  }
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      planData = JSON.parse(saved);
      if (!planData.expenses) planData.expenses = [];
      if (!planData.memos) planData.memos = [];
      if (!planData.memberCount) planData.memberCount = planData.members ? planData.members.length : 2;
      if (!planData.members) {
        planData.members = ["나"];
        for (let i = 1; i < planData.memberCount; i++) {
          planData.members.push(`친구 ${i}`);
        }
      }
      if (!planData.days) planData.days = JSON.parse(JSON.stringify(defaultData.days));
      console.log("✅ 강릉 플래너 로드 완료");
    } else {
      planData = JSON.parse(JSON.stringify(defaultData));
      saveData();
      console.log("📝 기본 데이터 생성");
    }
  } catch (e) {
    console.error("Load error:", e);
    planData = JSON.parse(JSON.stringify(defaultData));
  }
}

// ─── Tab ───
function switchTab(tab, btn) {
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  const panel = document.getElementById("panel-" + tab);
  if (panel) panel.classList.add("active");
  btn.classList.add("active");
  
  // Trigger map resize if map tab is chosen
  if (tab === 'route' && googleMapInstance) {
    setTimeout(() => {
      google.maps.event.trigger(googleMapInstance, "resize");
      updateGoogleMapMarkers();
    }, 150);
  }
}

// ================================================================
//  MEMBER / PEOPLE CONTROL
// ================================================================
function adjustPeople(delta) {
  if (!planData) return;
  const newCount = Math.max(1, (planData.memberCount || 2) + delta);
  planData.memberCount = newCount;
  
  // Re-generate members array
  const newMembers = ["나"];
  for (let i = 1; i < newCount; i++) {
    newMembers.push(`친구 ${i}`);
  }
  planData.members = newMembers;
  
  saveData();
  renderExpenses();
}

// ================================================================
//  EXPENSE — CRUD + Render
// ================================================================
function openExpenseModal(id) {
  const e = planData.expenses.find(x => x.id === id);
  document.getElementById("editExpenseId").value = id || "";
  document.getElementById("expenseModalTitle").textContent = id ? "💸 지출 수정" : "💸 지출 등록";
  document.getElementById("expenseCategory").value = e?.category || "식비";
  document.getElementById("expenseTitle").value = e?.title || "";
  document.getElementById("expenseAmount").value = e?.amount || "";
  document.getElementById("expenseMemo").value = e?.memo || "";

  updatePayerSelect(e?.payer);
  document.getElementById("expenseModal").classList.add("active");
}

function closeExpenseModal() { document.getElementById("expenseModal").classList.remove("active"); }

function updatePayerSelect(selectedPayer) {
  const sel = document.getElementById("expensePayer");
  if (!sel) return;
  sel.innerHTML = planData.members.map(m =>
    `<option value="${escHtml(m)}" ${m === selectedPayer ? 'selected' : ''}>${escHtml(m)}</option>`
  ).join("") + `<option value="공동" ${selectedPayer === '공동' ? 'selected' : ''}>👥 공동</option>`;
}

function saveExpense() {
  const title = document.getElementById("expenseTitle").value.trim();
  const amount = parseInt(document.getElementById("expenseAmount").value) || 0;
  if (!title || !amount) { alert("내역과 금액을 입력해 주세요."); return; }

  const existingId = document.getElementById("editExpenseId").value;
  const entry = {
    id: existingId || String(Date.now()),
    category: document.getElementById("expenseCategory").value,
    title,
    amount,
    payer: document.getElementById("expensePayer").value || planData.members[0],
    memo: document.getElementById("expenseMemo").value.trim()
  };

  const idx = planData.expenses.findIndex(x => x.id === entry.id);
  if (idx >= 0) planData.expenses[idx] = entry;
  else planData.expenses.push(entry);

  closeExpenseModal();
  renderExpenses();
  saveData();
}

function deleteExpense(id) {
  if (!confirm("이 지출을 삭제할까요?")) return;
  planData.expenses = planData.expenses.filter(x => x.id !== id);
  renderExpenses();
  saveData();
}

function renderExpenses() {
  if (!planData) return;
  const emptyEl = document.getElementById("expenseEmptyState");
  const gridEl = document.getElementById("expenseGrid");
  const settleEl = document.getElementById("settlementSection");
  if (!emptyEl || !gridEl) return;

  // Summary
  const totalKrw = planData.expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const memberCount = planData.memberCount || planData.members.length || 1;
  const perPerson = Math.round(totalKrw / memberCount);

  document.getElementById("summaryTotalKrw").textContent = "₩ " + fmtPrice(totalKrw);
  document.getElementById("summaryPerPerson").textContent = "₩ " + fmtPrice(perPerson);
  document.getElementById("summaryPeople").textContent = memberCount + "명";

  if (planData.expenses.length === 0) {
    emptyEl.style.display = "flex";
    gridEl.style.display = "none";
    if (settleEl) settleEl.style.display = "none";
    return;
  }

  emptyEl.style.display = "none";
  gridEl.style.display = "grid";

  const catEmoji = {
    "교통": "🚗", "숙박": "🏨", "식비": "🍽️", "관광": "🏄", "쇼핑": "🛍️", "기타": "📦"
  };

  const CLAY_CLASSES = ["card-pink", "card-teal", "card-lavender", "card-peach", "card-ochre", "card-cream"];

  gridEl.innerHTML = planData.expenses.map((e, idx) => {
    const clayClass = CLAY_CLASSES[idx % CLAY_CLASSES.length];
    return `
    <div class="expense-card ${clayClass}">
      <div class="expense-emoji-circle">${catEmoji[e.category] || "📦"}</div>
      <div class="expense-info">
        <div class="expense-title-row">
          <span class="expense-name">${escHtml(e.title)}</span>
          <span class="expense-payer-tag">${escHtml(e.payer || "")}</span>
        </div>
        ${e.memo ? `<div class="expense-memo-desc">${escHtml(e.memo)}</div>` : ""}
      </div>
      <div class="expense-right-side">
        <div class="expense-amount-val">₩${fmtPrice(e.amount)}</div>
        <div class="expense-action-buttons">
          <button class="btn-card-action" onclick="openExpenseModal('${e.id}')" title="수정">✏️</button>
          <button class="btn-card-action del" onclick="deleteExpense('${e.id}')" title="삭제">🗑</button>
        </div>
      </div>
    </div>
  `;
  }).join("");

  renderSettlement();
}

function renderSettlement() {
  const settleEl = document.getElementById("settlementSection");
  const resultEl = document.getElementById("settlementResult");
  if (!settleEl || !resultEl) return;

  if (planData.expenses.length === 0 || planData.memberCount < 2) {
    settleEl.style.display = "none";
    return;
  }

  const totalKrw = planData.expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const perPerson = Math.round(totalKrw / planData.memberCount);

  // Calculate paid amounts
  const paid = {};
  planData.members.forEach(m => paid[m] = 0);
  
  // Calculate dynamic splits
  let sharedCost = 0;
  planData.expenses.forEach(e => {
    if (e.payer === "공동") {
      sharedCost += (e.amount || 0);
    } else if (e.payer && paid.hasOwnProperty(e.payer)) {
      paid[e.payer] += (e.amount || 0);
    }
  });

  // Share cost is already split equally and doesn't belong to any specific creditor.
  // Each member's balance: Paid - Per Person
  const diffs = {};
  planData.members.forEach(m => {
    diffs[m] = paid[m] - perPerson;
  });

  const debtors = [];
  const creditors = [];
  planData.members.forEach(m => {
    if (diffs[m] < 0) debtors.push({ name: m, owes: -diffs[m] });
    else if (diffs[m] > 0) creditors.push({ name: m, owed: diffs[m] });
  });

  // Match debtors to creditors
  const transfers = [];
  let di = 0, ci = 0;
  while (di < debtors.length && ci < creditors.length) {
    const amount = Math.min(debtors[di].owes, creditors[ci].owed);
    if (amount > 0) {
      transfers.push({ from: debtors[di].name, to: creditors[ci].name, amount: Math.round(amount) });
    }
    debtors[di].owes -= amount;
    creditors[ci].owed -= amount;
    if (debtors[di].owes < 1) di++;
    if (creditors[ci].owed < 1) ci++;
  }

  if (transfers.length === 0) {
    settleEl.style.display = "none";
    return;
  }

  settleEl.style.display = "block";
  resultEl.innerHTML = transfers.map(t => `
    <div class="settle-card">
      <span class="settle-debtor">${escHtml(t.from)}</span>
      <span class="settle-arrow-icon">→</span>
      <span class="settle-creditor">${escHtml(t.to)}</span>
      <span class="settle-amount-display">₩${fmtPrice(t.amount)}</span>
    </div>
  `).join("");
}

// ================================================================
//  ROUTE / ITINERARY — CRUD + Render
// ================================================================
function openRouteModal(id) {
  const existingItem = id ? findRouteItem(id) : null;
  document.getElementById("routeEditId").value = id || "";
  document.getElementById("routeModalTitle").textContent = id ? "📍 장소 수정" : "📍 새 장소 추가";
  document.getElementById("routeTime").value = existingItem?.time || "";
  document.getElementById("routeName").value = existingItem?.name || "";
  document.getElementById("routeMemo").value = existingItem?.memo || "";
  document.getElementById("routeLat").value = existingItem?.lat || "";
  document.getElementById("routeLng").value = existingItem?.lng || "";

  const statusEl = document.getElementById("coordStatus");
  if (existingItem?.lat && existingItem?.lng) {
    statusEl.textContent = `📍 위치 감지됨: ${parseFloat(existingItem.lat).toFixed(5)}, ${parseFloat(existingItem.lng).toFixed(5)}`;
    statusEl.style.color = "var(--success)";
  } else {
    statusEl.textContent = "위치 미지정 (장소 검색을 이용하세요)";
    statusEl.style.color = "var(--muted)";
  }

  // Day select
  const daySelect = document.getElementById("routeDay");
  const dayKeys = Object.keys(planData.days).sort((a,b) => Number(a) - Number(b));
  daySelect.innerHTML = dayKeys.map(k => `<option value="${k}" ${Number(k) === currentDay ? 'selected' : ''}>Day ${k}</option>`).join("");
  
  if (existingItem) {
    for (const [day, items] of Object.entries(planData.days)) {
      if (items.find(it => it.id == id)) {
        daySelect.value = day;
        break;
      }
    }
  }

  document.getElementById("routeModal").classList.add("active");
}

function closeRouteModal() { document.getElementById("routeModal").classList.remove("active"); }

function findRouteItem(id) {
  for (const items of Object.values(planData.days)) {
    const found = items.find(it => it.id == id);
    if (found) return found;
  }
  return null;
}

function saveRoute() {
  const name = document.getElementById("routeName").value.trim();
  if (!name) { alert("장소명을 입력해 주세요."); return; }

  const day = document.getElementById("routeDay").value;
  const existingId = document.getElementById("routeEditId").value;
  
  const latVal = document.getElementById("routeLat").value;
  const lngVal = document.getElementById("routeLng").value;

  const entry = {
    id: existingId ? Number(existingId) : Date.now(),
    time: document.getElementById("routeTime").value,
    name,
    lat: latVal ? parseFloat(latVal) : null,
    lng: lngVal ? parseFloat(lngVal) : null,
    memo: document.getElementById("routeMemo").value.trim()
  };

  if (existingId) {
    for (const [d, items] of Object.entries(planData.days)) {
      planData.days[d] = items.filter(it => it.id != existingId);
    }
  }

  if (!planData.days[day]) planData.days[day] = [];
  planData.days[day].push(entry);
  
  // Sort by time
  planData.days[day].sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  closeRouteModal();
  currentDay = Number(day);
  renderDayTabs();
  renderTimeline();
  updateGoogleMapMarkers();
  saveData();
}

function deleteRoute(id) {
  if (!confirm("이 장소를 삭제할까요?")) return;
  for (const [d, items] of Object.entries(planData.days)) {
    planData.days[d] = items.filter(it => it.id != id);
  }
  renderTimeline();
  updateGoogleMapMarkers();
  saveData();
}

function addDay() {
  const keys = Object.keys(planData.days).map(Number);
  const next = keys.length > 0 ? Math.max(...keys) + 1 : 1;
  planData.days[next] = [];
  currentDay = next;
  renderDayTabs();
  renderTimeline();
  updateGoogleMapMarkers();
  saveData();
}

function removeDay(day) {
  if (!confirm(`Day ${day} 전체를 삭제할까요?`)) return;
  delete planData.days[day];
  const keys = Object.keys(planData.days).map(Number).sort((a,b) => a-b);
  currentDay = keys.length > 0 ? keys[0] : 1;
  if (keys.length === 0) planData.days[1] = [];
  renderDayTabs();
  renderTimeline();
  updateGoogleMapMarkers();
  saveData();
}

function toggleDayEditMode() {
  dayEditMode = !dayEditMode;
  const tabs = document.getElementById("dayTabsMini");
  const btn = document.getElementById("btnEditDays");
  const addDayBtn = document.getElementById("btnAddDay");
  const addPlaceBtn = document.getElementById("btnAddPlace");
  if (dayEditMode) {
    tabs.classList.add("edit-mode");
    btn.textContent = "✅ 완료";
    if (addDayBtn) addDayBtn.style.display = "inline-block";
    if (addPlaceBtn) addPlaceBtn.style.display = "inline-block";
  } else {
    tabs.classList.remove("edit-mode");
    btn.textContent = "✏️ 편집";
    if (addDayBtn) addDayBtn.style.display = "none";
    if (addPlaceBtn) addPlaceBtn.style.display = "none";
  }
}

function selectDay(day) {
  currentDay = Number(day);
  renderDayTabs();
  renderTimeline();
  updateGoogleMapMarkers();
}

function renderDayTabs() {
  const el = document.getElementById("dayTabsMini");
  if (!el) return;
  const keys = Object.keys(planData.days).sort((a,b) => Number(a) - Number(b));
  el.innerHTML = keys.map(k => {
    const isActive = Number(k) === currentDay;
    const count = (planData.days[k] || []).length;
    return `
      <button class="day-tab-pill ${isActive ? 'active' : ''}" onclick="selectDay(${k})">
        Day ${k} <span class="day-count-badge">${count}</span>
        <span class="day-del-icon" onclick="event.stopPropagation(); removeDay(${k})">✕</span>
      </button>`;
  }).join("");
}

function renderTimeline() {
  const el = document.getElementById("timelineList");
  if (!el) return;
  const items = planData.days[currentDay] || [];

  if (items.length === 0) {
    el.innerHTML = `<div class="timeline-empty">아직 등록된 장소가 없어요 🏖️</div>`;
    return;
  }

  el.innerHTML = items.map((it, index) => `
    <div class="timeline-card-item" onclick="openRouteModal(${it.id})">
      <div class="timeline-node-index">${index + 1}</div>
      <div class="timeline-content-body">
        <div class="timeline-time-text">${it.time || "시간 미정"}</div>
        <div class="timeline-place-name">📍 ${escHtml(it.name)}</div>
        ${it.memo ? `<div class="timeline-memo-text">${escHtml(it.memo)}</div>` : ""}
      </div>
      <div class="timeline-action-container" onclick="event.stopPropagation()">
        <button class="btn-card-action" onclick="openRouteModal(${it.id})" title="수정">✏️</button>
        <button class="btn-card-action del" onclick="deleteRoute(${it.id})" title="삭제">🗑</button>
      </div>
    </div>
  `).join("");
}

// ================================================================
//  GOOGLE MAPS INTEGRATION
// ================================================================
let googleMapInstance = null;
let gmMarkers = [];
let gmPolyline = null;

const DAY_COLORS = [
  { marker: "#0284c7", border: "#ffffff", line: "#0284c7" }, // Ocean Blue
  { marker: "#1e3a8a", border: "#ffffff", line: "#1e3a8a" }, // Royal Navy
  { marker: "#0f766e", border: "#ffffff", line: "#0f766e" }, // Deep Teal
  { marker: "#3b82f6", border: "#ffffff", line: "#3b82f6" }, // Steel Blue
  { marker: "#6366f1", border: "#ffffff", line: "#6366f1" }  // Indigo/Lavender Blue
];

const DEFAULT_API_KEY = "AIzaSyA4_3OvP8rbcye4IHzZrj-W6Tga6GudylQ";

function activateMap() {
  const apiKey = localStorage.getItem("gmap_api_key") || DEFAULT_API_KEY;
  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMap`;
  script.async = true;
  document.head.appendChild(script);
  script.onerror = () => {
    console.error("Failed to load Google Maps script.");
    const placeholderSub = document.querySelector(".map-placeholder-sub");
    if (placeholderSub) {
      placeholderSub.textContent = "API 키가 올바르지 않거나 로드에 실패했습니다. 올바른 키를 입력해주세요.";
      placeholderSub.style.color = "var(--error)";
    }
  };
}

window.initGoogleMap = function() {
  const placeholder = document.getElementById("mapPlaceholder");
  if (placeholder) placeholder.style.display = "none";
  const mapDiv = document.getElementById("googleMap");
  if (mapDiv) mapDiv.style.display = "block";
  
  googleMapInstance = new google.maps.Map(mapDiv, {
    center: { lat: 37.7519, lng: 128.8761 }, // Gangneung center
    zoom: 12,
    streetViewControl: false
  });
  
  initPlaceAutocomplete();
  updateGoogleMapMarkers();
};

let autocompleteInstance = null;

function initPlaceAutocomplete() {
  const input = document.getElementById("routeName");
  if (!input || !google || !google.maps || !google.maps.places) return;
  
  autocompleteInstance = new google.maps.places.Autocomplete(input, {
    fields: ["geometry", "name", "formatted_address"],
    componentRestrictions: { country: "kr" }
  });
  
  autocompleteInstance.addListener("place_changed", () => {
    const place = autocompleteInstance.getPlace();
    const statusEl = document.getElementById("coordStatus");
    if (place.geometry && place.geometry.location) {
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      document.getElementById("routeLat").value = lat;
      document.getElementById("routeLng").value = lng;
      if (statusEl) {
        statusEl.textContent = `📍 위치 감지됨: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        statusEl.style.color = "var(--success)";
      }
    } else {
      document.getElementById("routeLat").value = "";
      document.getElementById("routeLng").value = "";
      if (statusEl) {
        statusEl.textContent = "위치 미지정 (정확한 장소를 검색해주세요)";
        statusEl.style.color = "var(--error)";
      }
    }
  });
}

function updateGoogleMapMarkers() {
  if (!googleMapInstance || !planData) return;
  gmMarkers.forEach(m => m.setMap(null));
  gmMarkers = [];
  if (gmPolyline) { gmPolyline.setMap(null); gmPolyline = null; }

  const c = DAY_COLORS[(currentDay - 1) % DAY_COLORS.length];
  const items = (planData.days[currentDay] || []).sort((a,b) => (a.time || "").localeCompare(b.time || ""));
  const bounds = new google.maps.LatLngBounds();
  const path = [];
  
  items.forEach((item, idx) => {
    if (!item.lat || !item.lng) return;
    const pos = { lat: parseFloat(item.lat), lng: parseFloat(item.lng) };
    const marker = new google.maps.Marker({
      position: pos,
      map: googleMapInstance,
      title: item.name,
      label: { text: String(idx + 1), color: "#fff", fontWeight: "900", fontSize: "12px" },
      icon: { path: google.maps.SymbolPath.CIRCLE, scale: 14, fillColor: c.marker, fillOpacity: 1, strokeColor: c.border, strokeWeight: 2.5 },
      zIndex: idx + 1
    });
    
    const iw = new google.maps.InfoWindow({
      content: `<div style="font-family:inherit;padding:4px;color:var(--ink);">
        <strong style="font-size:14px;">${item.name}</strong>
        <br><span style="font-size:12px;color:var(--muted);">${item.memo || ""}</span>
        <br><span style="font-size:11px;color:var(--muted-soft);">⏰ ${item.time || "--:--"}</span>
      </div>`
    });
    
    marker.addListener("click", () => iw.open(googleMapInstance, marker));
    gmMarkers.push(marker);
    path.push(pos);
    bounds.extend(pos);
  });
  
  if (path.length > 1) {
    gmPolyline = new google.maps.Polyline({
      path, map: googleMapInstance,
      strokeColor: c.line, strokeOpacity: 0,
      icons: [
        { icon: { path: "M 0,-1 0,1", strokeOpacity: 0.7, strokeColor: c.line, strokeWeight: 3, scale: 4 }, offset: "0", repeat: "12px" },
        { icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 4.5, fillColor: c.line, fillOpacity: 1, strokeColor: "#0a0a0a", strokeWeight: 1 }, offset: "100%", repeat: "0" },
        { icon: { path: google.maps.SymbolPath.FORWARD_OPEN_ARROW, scale: 3, strokeColor: c.line, strokeOpacity: 0.5, strokeWeight: 2 }, offset: "50%", repeat: "120px" }
      ]
    });
    googleMapInstance.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 });
  } else if (path.length === 1) {
    googleMapInstance.setCenter(path[0]);
    googleMapInstance.setZoom(14);
  } else {
    googleMapInstance.setCenter({ lat: 37.7519, lng: 128.8761 });
    googleMapInstance.setZoom(12);
  }
}

function saveCustomApiKey() {
  const input = document.getElementById("apiKeyInput");
  if (!input) return;
  const key = input.value.trim();
  if (key) {
    localStorage.setItem("gmap_api_key", key);
    alert("Google Maps API 키가 저장되었습니다. 지도를 다시 로드합니다.");
    location.reload();
  }
}

function toggleMapSettings() {
  const content = document.getElementById("mapSettingsContent");
  if (content) {
    content.style.display = content.style.display === "none" ? "flex" : "none";
  }
}

// ================================================================
//  MEMO WIDGET
// ================================================================
function toggleMemoWidget() {
  const popup = document.getElementById("memoCardPopup");
  if (popup) {
    popup.classList.toggle("active");
    if (popup.classList.contains("active")) {
      renderMemos();
      const input = document.getElementById("memoInput");
      if (input) input.focus();
    }
  }
}

function postMemo() {
  const input = document.getElementById("memoInput");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  planData.memos.push({
    id: String(Date.now()),
    text,
    time: new Date().toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
  });

  input.value = "";
  renderMemos();
  saveData();
}

function deleteMemo(id) {
  planData.memos = planData.memos.filter(m => m.id !== id);
  renderMemos();
  saveData();
}

function renderMemos() {
  const el = document.getElementById("memoBoard");
  if (!el) return;

  if (planData.memos.length === 0) {
    el.innerHTML = `<div style="padding:24px; text-align:center; color:var(--muted); font-size:13px;">메모가 없어요. 여행 아이디어를 남겨보세요! 💡</div>`;
    return;
  }

  el.innerHTML = [...planData.memos].reverse().map(m => `
    <div class="memo-item">
      ${escHtml(m.text)}
      <div class="memo-time">${m.time || ""}</div>
      <button class="memo-del" onclick="deleteMemo('${m.id}')">✕</button>
    </div>
  `).join("");

  el.scrollTop = 0;
}

// ================================================================
//  HELPERS
// ================================================================
function fmtPrice(n) { return Number(n).toLocaleString(); }

function escHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const wk = ["일","월","화","수","목","금","토"][d.getDay()];
  return `${m}/${day} (${wk})`;
}

// ================================================================
//  SYDNEY-STYLE ANIMATIONS & TIMERS (GANGNEUNG CUSTOMIZED)
// ================================================================

function generateStarField() {
  const field = document.getElementById("starField");
  if (!field) return;
  field.innerHTML = "";
  for (let i = 0; i < 40; i++) {
    const star = document.createElement("div");
    star.className = "star";
    star.style.cssText = `
      position: absolute;
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      width: ${2 + Math.random() * 3}px;
      height: ${2 + Math.random() * 3}px;
      background: rgba(255, 255, 255, 0.75);
      border-radius: 50%;
      animation: twinkle ${2 + Math.random() * 3}s ease-in-out infinite;
      animation-delay: ${Math.random() * 2}s;
    `;
    field.appendChild(star);
  }
}

function startCountdown() {
  const update = () => {
    if (!planData || !planData.departDate) return;
    const target = new Date(planData.departDate).getTime();
    const diff = target - Date.now();
    if (diff <= 0) {
      ["cdDays","cdHours","cdMins","cdSecs"].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.textContent = "00";
      });
      return;
    }
    const d = Math.floor(diff/86400000);
    const h = Math.floor((diff%86400000)/3600000);
    const m = Math.floor((diff%3600000)/60000);
    const s = Math.floor((diff%60000)/1000);
    
    const cdD = document.getElementById("cdDays"); if(cdD) cdD.textContent = String(d).padStart(2,"0");
    const cdH = document.getElementById("cdHours"); if(cdH) cdH.textContent = String(h).padStart(2,"0");
    const cdM = document.getElementById("cdMins"); if(cdM) cdM.textContent = String(m).padStart(2,"0");
    const cdS = document.getElementById("cdSecs"); if(cdS) cdS.textContent = String(s).padStart(2,"0");
  };
  update();
  setInterval(update, 1000);
}


