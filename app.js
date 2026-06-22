/* ==============================================
   GANGNEUNG PLANNER — app.js
   Local Storage 기반 예약/지출/동선 CRUD
   ============================================== */

const STORAGE_KEY = "gangneung_planner_data";

// ─── State ───
let planData = null;
let currentDay = 1;
let bookingFilter = "all";
let dayEditMode = false;

// ─── Default Data ───
const defaultData = {
  departDate: "2026-08-01T00:00:00+09:00",
  members: ["나", "친구1"],
  bookings: [],
  expenses: [],
  memos: [],
  days: {
    1: [
      { id: 1001, time: "10:00", name: "경포해변", memo: "바다 뷰 감상 & 사진 찍기 📸" },
      { id: 1002, time: "12:30", name: "초당순두부마을", memo: "강릉 3대 순두부 맛집 🫘" },
      { id: 1003, time: "15:00", name: "안목해변 카페거리", memo: "바다 보며 커피 한 잔 ☕" },
      { id: 1004, time: "18:00", name: "강릉 중앙시장", memo: "닭강정 & 먹거리 탐방 🍗" }
    ],
    2: [
      { id: 2001, time: "09:00", name: "정동진 해돋이", memo: "일출 명소! 새벽에 출발 🌅" },
      { id: 2002, time: "12:00", name: "하슬라아트월드", memo: "바다 뷰 조각공원 & 뮤지엄 🎨" },
      { id: 2003, time: "16:00", name: "경포대 호수 산책", memo: "호수 둘레길 산책 🌿" }
    ]
  }
};

// ─── Init ───
document.addEventListener("DOMContentLoaded", () => {
  generateOceanParticles();
  loadData();
  startCountdown();
  renderBookings();
  renderExpenses();
  renderMembers();
  renderDayTabs();
  renderTimeline();
  renderMemos();
});

function generateOceanParticles() {
  const f = document.getElementById("oceanParticles");
  if (!f) return;
  for (let i = 0; i < 60; i++) {
    const s = document.createElement("div");
    s.className = "ocean-dot";
    s.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*100}%;--dur:${3+Math.random()*5}s;--op:${0.2+Math.random()*0.6};animation-delay:${Math.random()*6}s;`;
    f.appendChild(s);
  }
}

// ─── Countdown ───
function startCountdown() {
  const update = () => {
    const target = new Date(planData.departDate).getTime();
    const diff = target - Date.now();
    if (diff <= 0) { ["cdDays","cdHours","cdMins","cdSecs"].forEach(id => { const el = document.getElementById(id); if(el) el.textContent = "00"; }); return; }
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
      if (!planData.bookings) planData.bookings = [];
      if (!planData.expenses) planData.expenses = [];
      if (!planData.memos) planData.memos = [];
      if (!planData.members) planData.members = ["나", "친구1"];
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
}

// ================================================================
//  BOOKING — CRUD + Render
// ================================================================
function openBookingModal(id) {
  const b = planData.bookings.find(x => x.id === id);
  document.getElementById("bookingEditId").value = id || "";
  document.getElementById("bookingModalTitle").textContent = id ? "📋 예약 수정" : "📋 예약 추가";
  document.getElementById("bm_category").value = b?.category || "숙소";
  document.getElementById("bm_name").value = b?.name || "";
  document.getElementById("bm_date").value = b?.date || "";
  document.getElementById("bm_time").value = b?.time || "";
  document.getElementById("bm_price").value = b?.price || "";
  document.getElementById("bm_status").value = b?.status || "confirmed";
  document.getElementById("bm_link").value = b?.link || "";
  document.getElementById("bm_memo").value = b?.memo || "";
  document.getElementById("bookingModal").classList.add("active");
}
function closeBookingModal() { document.getElementById("bookingModal").classList.remove("active"); }

function saveBooking() {
  const name = document.getElementById("bm_name").value.trim();
  if (!name) { alert("예약명을 입력해 주세요."); return; }

  const existingId = document.getElementById("bookingEditId").value;
  const entry = {
    id: existingId || String(Date.now()),
    category: document.getElementById("bm_category").value,
    name,
    date: document.getElementById("bm_date").value,
    time: document.getElementById("bm_time").value,
    price: parseInt(document.getElementById("bm_price").value) || 0,
    status: document.getElementById("bm_status").value,
    link: document.getElementById("bm_link").value.trim(),
    memo: document.getElementById("bm_memo").value.trim()
  };

  const idx = planData.bookings.findIndex(x => x.id === entry.id);
  if (idx >= 0) planData.bookings[idx] = entry;
  else planData.bookings.push(entry);

  closeBookingModal();
  renderBookings();
  saveData();
}

function deleteBooking(id) {
  if (!confirm("이 예약을 삭제할까요?")) return;
  planData.bookings = planData.bookings.filter(x => x.id !== id);
  renderBookings();
  saveData();
}

function filterBookings(cat, btn) {
  bookingFilter = cat;
  document.querySelectorAll("#bookingFilterBar .filter-chip").forEach(c => c.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderBookings();
}

function renderBookings() {
  if (!planData) return;
  const emptyEl = document.getElementById("bookingEmptyState");
  const gridEl = document.getElementById("bookingGrid");
  const bannerEl = document.getElementById("bookingSummaryBanner");
  if (!emptyEl || !gridEl) return;

  let list = [...planData.bookings];
  if (bookingFilter !== "all") list = list.filter(b => b.category === bookingFilter);

  // Sort by date
  list.sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));

  if (planData.bookings.length === 0) {
    emptyEl.style.display = "flex";
    gridEl.style.display = "none";
    if (bannerEl) bannerEl.style.display = "none";
    return;
  }

  emptyEl.style.display = "none";
  gridEl.style.display = "";

  // Summary
  if (bannerEl) {
    bannerEl.style.display = "flex";
    const total = planData.bookings.length;
    const confirmed = planData.bookings.filter(b => b.status === "confirmed").length;
    const pending = planData.bookings.filter(b => b.status === "pending").length;
    document.getElementById("summaryBookingCount").textContent = total + "건";
    document.getElementById("summaryConfirmed").textContent = confirmed + "건";
    document.getElementById("summaryPending").textContent = pending + "건";
  }

  const catEmoji = {
    "숙소": "🏨", "교통": "🚗", "맛집": "🍽️", "액티비티": "🏄", "기타": "📦"
  };
  const statusLabel = {
    "confirmed": "✅ 확정", "pending": "⏳ 미확정", "cancelled": "❌ 취소"
  };

  gridEl.innerHTML = list.map(b => {
    const dateStr = b.date ? formatDate(b.date) : "";
    const timeStr = b.time || "";
    const dateTimeStr = [dateStr, timeStr].filter(Boolean).join(" ");

    return `
    <div class="glass-card booking-card" data-cat="${b.category}">
      <div class="booking-top">
        <div class="booking-info">
          <div class="booking-cat" data-cat="${b.category}">${catEmoji[b.category] || "📦"} ${b.category}</div>
          <div class="booking-name">${escHtml(b.name)}</div>
          ${dateTimeStr ? `<div class="booking-date">📅 ${dateTimeStr}</div>` : ""}
        </div>
        <div class="booking-right">
          ${b.price ? `<div class="booking-price">₩${fmtPrice(b.price)}</div>` : ""}
          <div class="booking-status ${b.status}">${statusLabel[b.status] || b.status}</div>
        </div>
      </div>
      <div class="booking-bottom">
        ${b.memo ? `<div class="booking-memo">${escHtml(b.memo)}</div>` : '<div></div>'}
        <div class="booking-actions">
          ${b.link ? `<a href="${b.link}" target="_blank" class="btn-action" title="링크">🔗</a>` : ""}
          <button class="btn-action" onclick="openBookingModal('${b.id}')" title="수정">✏️</button>
          <button class="btn-action del" onclick="deleteBooking('${b.id}')" title="삭제">🗑</button>
        </div>
      </div>
    </div>`;
  }).join("");
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

  // 결제자 select 갱신
  updatePayerSelect(e?.payer);
  document.getElementById("expenseModal").classList.add("active");
}
function closeExpenseModal() { document.getElementById("expenseModal").classList.remove("active"); }

function updatePayerSelect(selectedPayer) {
  const sel = document.getElementById("expensePayer");
  if (!sel) return;
  sel.innerHTML = planData.members.map(m =>
    `<option value="${escHtml(m)}" ${m === selectedPayer ? 'selected' : ''}>${escHtml(m)}</option>`
  ).join("") + `<option value="공동">👥 공동</option>`;
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
  const memberCount = planData.members.length || 1;
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
  gridEl.style.display = "";

  const catEmoji = {
    "교통": "🚗", "숙박": "🏨", "식비": "🍽️", "관광": "🏄", "쇼핑": "🛍️", "기타": "📦"
  };

  gridEl.innerHTML = planData.expenses.map(e => `
    <div class="glass-card expense-card">
      <div class="expense-emoji" data-cat="${e.category}">${catEmoji[e.category] || "📦"}</div>
      <div class="expense-info">
        <div class="expense-title-row">
          <span class="expense-name">${escHtml(e.title)}</span>
          <span class="expense-payer">${escHtml(e.payer || "")}</span>
        </div>
        ${e.memo ? `<div class="expense-memo-text">${escHtml(e.memo)}</div>` : ""}
      </div>
      <div class="expense-right">
        <div class="expense-amount">₩${fmtPrice(e.amount)}</div>
        <div class="expense-actions">
          <button class="btn-action" onclick="openExpenseModal('${e.id}')" title="수정">✏️</button>
          <button class="btn-action del" onclick="deleteExpense('${e.id}')" title="삭제">🗑</button>
        </div>
      </div>
    </div>
  `).join("");

  // 정산 계산
  renderSettlement();
}

function renderSettlement() {
  const settleEl = document.getElementById("settlementSection");
  const resultEl = document.getElementById("settlementResult");
  if (!settleEl || !resultEl) return;

  if (planData.expenses.length === 0 || planData.members.length < 2) {
    settleEl.style.display = "none";
    return;
  }

  const totalKrw = planData.expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const perPerson = Math.round(totalKrw / planData.members.length);

  // 각 멤버가 낸 총액
  const paid = {};
  planData.members.forEach(m => paid[m] = 0);
  planData.expenses.forEach(e => {
    if (e.payer && paid.hasOwnProperty(e.payer)) {
      paid[e.payer] += (e.amount || 0);
    }
  });

  // 정산: 더 낸 사람에게 적게 낸 사람이 보내야 할 금액
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

  // Simple settlement
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
    <div class="settle-row">
      <span style="font-weight:700; color:var(--accent-coral);">${escHtml(t.from)}</span>
      <span class="settle-arrow">→</span>
      <span style="font-weight:700; color:var(--accent-emerald);">${escHtml(t.to)}</span>
      <span class="settle-amount">₩${fmtPrice(t.amount)}</span>
    </div>
  `).join("");
}

// ================================================================
//  MEMBERS
// ================================================================
function openMemberModal() { document.getElementById("memberModal").classList.add("active"); document.getElementById("memberName").value = ""; }
function closeMemberModal() { document.getElementById("memberModal").classList.remove("active"); }

function addMember() {
  const name = document.getElementById("memberName").value.trim();
  if (!name) { alert("이름을 입력해 주세요."); return; }
  if (planData.members.includes(name)) { alert("이미 존재하는 멤버입니다."); return; }
  planData.members.push(name);
  closeMemberModal();
  renderMembers();
  renderExpenses();
  saveData();
}

function removeMember(name) {
  if (!confirm(`"${name}" 멤버를 삭제할까요?`)) return;
  planData.members = planData.members.filter(m => m !== name);
  renderMembers();
  renderExpenses();
  saveData();
}

function renderMembers() {
  const el = document.getElementById("membersList");
  if (!el) return;
  el.innerHTML = planData.members.map(m => `
    <div class="member-chip">
      👤 ${escHtml(m)}
      <span class="member-del" onclick="removeMember('${escHtml(m)}')" title="삭제">✕</span>
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

  // Day select
  const daySelect = document.getElementById("routeDay");
  const dayKeys = Object.keys(planData.days).sort((a,b) => Number(a) - Number(b));
  daySelect.innerHTML = dayKeys.map(k => `<option value="${k}" ${Number(k) === currentDay ? 'selected' : ''}>Day ${k}</option>`).join("");
  if (existingItem) {
    // find which day this item belongs to
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

  const entry = {
    id: existingId ? Number(existingId) : Date.now(),
    time: document.getElementById("routeTime").value,
    name,
    memo: document.getElementById("routeMemo").value.trim()
  };

  if (existingId) {
    // Remove from all days first
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
  saveData();
}

function deleteRoute(id) {
  if (!confirm("이 장소를 삭제할까요?")) return;
  for (const [d, items] of Object.entries(planData.days)) {
    planData.days[d] = items.filter(it => it.id != id);
  }
  renderTimeline();
  saveData();
}

function addDay() {
  const keys = Object.keys(planData.days).map(Number);
  const next = keys.length > 0 ? Math.max(...keys) + 1 : 1;
  planData.days[next] = [];
  currentDay = next;
  renderDayTabs();
  renderTimeline();
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
  saveData();
}

function toggleDayEditMode() {
  dayEditMode = !dayEditMode;
  const tabs = document.getElementById("dayTabsMini");
  const btn = document.getElementById("btnEditDays");
  if (dayEditMode) {
    tabs.classList.add("edit-mode");
    btn.textContent = "✅ 완료";
  } else {
    tabs.classList.remove("edit-mode");
    btn.textContent = "✏️ 편집";
  }
}

function selectDay(day) {
  currentDay = Number(day);
  renderDayTabs();
  renderTimeline();
}

function renderDayTabs() {
  const el = document.getElementById("dayTabsMini");
  if (!el) return;
  const keys = Object.keys(planData.days).sort((a,b) => Number(a) - Number(b));
  el.innerHTML = keys.map(k => {
    const isActive = Number(k) === currentDay;
    const count = (planData.days[k] || []).length;
    return `
      <button class="day-tab ${isActive ? 'active' : ''}" onclick="selectDay(${k})">
        Day ${k} <span style="font-size:10px; opacity:0.7;">(${count})</span>
        <span class="day-del" onclick="event.stopPropagation(); removeDay(${k})">🗑</span>
      </button>`;
  }).join("");
}

function renderTimeline() {
  const el = document.getElementById("timelineList");
  if (!el) return;
  const items = planData.days[currentDay] || [];

  if (items.length === 0) {
    el.innerHTML = `<div style="padding:24px; text-align:center; color:var(--muted); font-size:13px;">아직 등록된 장소가 없어요 🏖️</div>`;
    return;
  }

  el.innerHTML = items.map(it => `
    <div class="tl-item" onclick="openRouteModal(${it.id})">
      <div class="tl-time">${it.time || "시간 미정"}</div>
      <div class="tl-name">📍 ${escHtml(it.name)}</div>
      ${it.memo ? `<div class="tl-memo">${escHtml(it.memo)}</div>` : ""}
      <div class="tl-actions" onclick="event.stopPropagation()">
        <button class="btn-action" onclick="openRouteModal(${it.id})" title="수정">✏️</button>
        <button class="btn-action del" onclick="deleteRoute(${it.id})" title="삭제">🗑</button>
      </div>
    </div>
  `).join("");
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
