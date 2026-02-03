-- SQLite Schema for Weather-Clip
-- High security, relational design.

PRAGMA foreign_keys = ON;

-- 1. USERS (Authentication)
-- Stores credentials securely. NO plain text passwords.
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, -- UUID
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
);

-- 2. PROFILES (Public/Protected Data)
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    website TEXT,
    location TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 3. SEARCH HISTORY (Private)
CREATE TABLE IF NOT EXISTS search_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    query TEXT NOT NULL,
    location_data TEXT, -- JSON string
    searched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 4. SECURITY LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    ip_address TEXT,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);

-- 5. QUANTUM LOGS (Time Evolution Engine)
CREATE TABLE IF NOT EXISTS quantum_logs (
    id TEXT PRIMARY KEY,
    city TEXT,
    latitude REAL,
    longitude REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    storm_probability REAL,
    rain_confidence REAL,
    atmospheric_chaos REAL,
    forecast_reliability REAL,
    dominant_state TEXT,
    quantum_summary TEXT,
    top_states_json TEXT, -- Existing
    volatility REAL DEFAULT 0,
    cyclone_index REAL DEFAULT 0,
    flood_risk REAL DEFAULT 0,
    final_risk_score REAL DEFAULT 0,

-- Temporal Quantum Physics Columns
chaos_velocity REAL DEFAULT 0,
    chaos_acceleration REAL DEFAULT 0,
    pressure_drop_rate REAL DEFAULT 0,
    cyclone_momentum REAL DEFAULT 0,
    state_drift REAL DEFAULT 0
);