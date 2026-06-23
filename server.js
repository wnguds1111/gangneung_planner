const express = require('express');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static(__dirname));

// Initialize Database connection
let pool = null;
const dbUrl = process.env.DATABASE_URL;

if (dbUrl) {
  console.log("🔌 Database connection string detected. Connecting to PostgreSQL...");
  pool = new Pool({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  // Create table if it doesn't exist
  pool.query(`
    CREATE TABLE IF NOT EXISTS planner (
      id VARCHAR(50) PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `).then(() => {
    console.log("✅ PostgreSQL Table 'planner' is ready.");
  }).catch(err => {
    console.error("❌ Failed to initialize table. Falling back to local file system.", err);
    pool = null;
  });
} else {
  console.log("ℹ️ No DATABASE_URL found. Running with local data.json filesystem fallback.");
}

const LOCAL_DATA_PATH = path.join(__dirname, 'data.json');

// GET Plan Data
app.get('/api/plan', async (req, res) => {
  if (pool) {
    try {
      const result = await pool.query("SELECT data FROM planner WHERE id = 'gangneung'");
      if (result.rows.length > 0) {
        return res.json(result.rows[0].data);
      }
      return res.json(null);
    } catch (err) {
      console.error("Database read error:", err);
      // Fallback on database error
    }
  }

  // Fallback to local file
  try {
    if (fs.existsSync(LOCAL_DATA_PATH)) {
      const raw = fs.readFileSync(LOCAL_DATA_PATH, 'utf8');
      return res.json(JSON.parse(raw));
    }
    return res.json(null);
  } catch (err) {
    console.error("Local read error:", err);
    return res.status(500).json({ error: "Failed to read plan data" });
  }
});

// POST Save Plan Data
app.post('/api/plan', async (req, res) => {
  const planData = req.body;
  if (!planData) {
    return res.status(400).json({ error: "Invalid plan data" });
  }

  if (pool) {
    try {
      await pool.query(`
        INSERT INTO planner (id, data, updated_at)
        VALUES ('gangneung', $1, CURRENT_TIMESTAMP)
        ON CONFLICT (id)
        DO UPDATE SET data = $1, updated_at = CURRENT_TIMESTAMP
      `, [planData]);
      return res.json({ success: true, message: "Saved to database" });
    } catch (err) {
      console.error("Database write error:", err);
      // Fallback on database error
    }
  }

  // Fallback to local file
  try {
    fs.writeFileSync(LOCAL_DATA_PATH, JSON.stringify(planData, null, 2), 'utf8');
    return res.json({ success: true, message: "Saved to local file" });
  } catch (err) {
    console.error("Local write error:", err);
    return res.status(500).json({ error: "Failed to write plan data" });
  }
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Gangneung Planner Server running on port ${PORT}`);
});
