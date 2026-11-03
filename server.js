const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Database connection pool using Render PostgreSQL connection string
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Setup table on startup
pool.query(`
  CREATE TABLE IF NOT EXISTS materials (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    quantity INT NOT NULL,
    status VARCHAR(50),
    site_location VARCHAR(100),
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8)
  );
`).catch(err => console.error("Table creation error:", err));

// API Route: Get all materials from database
app.get('/api/materials', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM materials ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API Route: Add a new material shipment to database
app.post('/api/materials', async (req, res) => {
  const { name, category, quantity, status, site_location, lat, lng } = req.body;
  try {
    const newMaterial = await pool.query(
      `INSERT INTO materials (name, category, quantity, status, site_location, lat, lng) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, category, quantity, status, site_location, lat, lng]
    );
    res.json(newMaterial.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve static frontend files (your index.html should be in the same folder)
app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));