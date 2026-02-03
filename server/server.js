
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('./db/index');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me-in-prod';

// --- MIDDLEWARE & SECURITY ---
app.use(helmet({
    contentSecurityPolicy: false,
})); // Sets key security headers (CSP disabled for devtools/local access)
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allow localhost and local network IPs
        const allowedOrigins = [
            'http://localhost:5173',
            'http://localhost:8080',
            'http://localhost:8081',
            'http://localhost:8082'
        ];

        // Dynamic check for network IPs (192.168.x.x)
        if (allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('http://192.168.') || origin.startsWith('http://localhost:')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json());

// Rate Limiting (Brute force protection)
// Rate Limiting (Brute force protection)
const loginLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute (relaxed for dev)
    max: 1000, // Limit each IP to 1000 requests per window (very relaxed for dev)
    message: { error: 'Too many login attempts, please try again later' }, // JSON response
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// --- HELPER: AUTH MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) return res.status(401).json({ error: 'Access token required' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// --- ROUTES ---

// --- ROUTES ---

// 0. ROOT CHECK
app.get('/', (req, res) => {
    res.send('Climate Mosaic API Service is running. 🚀');
});

// 1. SIGNUP
app.post('/auth/signup', async (req, res) => {
    const { email, password, full_name } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    try {
        // Hash password
        const salt = await bcrypt.genSalt(12); // High secure salt rounds
        const hashedPassword = await bcrypt.hash(password, salt);
        const userId = uuidv4();
        const profileId = uuidv4();

        // Transaction for atomicity
        const insertUser = db.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)');
        const insertProfile = db.prepare('INSERT INTO profiles (id, user_id, full_name, role) VALUES (?, ?, ?, ?)');

        const transaction = db.transaction(() => {
            insertUser.run(userId, email, hashedPassword);
            insertProfile.run(profileId, userId, full_name || '', 'user');
        });

        transaction();

        // Auto-login: Generate Token immediately
        const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '7d' });

        // Fetch the created profile
        const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(profileId);

        // Security Log
        db.prepare('INSERT INTO audit_logs (id, user_id, action, ip_address) VALUES (?, ?, ?, ?)')
            .run(uuidv4(), userId, 'SIGNUP_AUTO_LOGIN', req.ip);

        res.status(201).json({ message: 'User created successfully', token, user: { ...profile, email } });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(409).json({ error: 'Email already exists' });
        }
        console.error('Signup Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 2. LOGIN
app.post('/auth/login', loginLimiter, async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

        if (!user) {
            console.warn(`Login failed: User ${email} not found`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            console.warn(`Login failed: Password mismatch for ${email}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate Token
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        // Generate profile info to return
        const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(user.id);

        // Security Log
        db.prepare('INSERT INTO audit_logs (id, user_id, action, ip_address) VALUES (?, ?, ?, ?)')
            .run(uuidv4(), user.id, 'LOGIN', req.ip);

        res.json({ token, user: { ...profile, email: user.email } });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 3. GET PROFILE (Protected)
app.get('/user/profile', authenticateToken, (req, res) => {
    try {
        const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.user.id);
        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        // Return profile combined with essential user info (email)
        res.json({ ...profile, email: req.user.email });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// 4. UPDATE PROFILE (Protected)
app.put('/user/profile', authenticateToken, (req, res) => {
    const { full_name, location, website, avatar_url } = req.body;

    try {
        const stmt = db.prepare(`
            UPDATE profiles 
            SET full_name = COALESCE(?, full_name),
                location = COALESCE(?, location),
                website = COALESCE(?, website),
                avatar_url = COALESCE(?, avatar_url),
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `);

        stmt.run(full_name, location, website, avatar_url, req.user.id);

        const updated = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.user.id);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Update failed' });
    }
});

// 5. QUANTUM WEATHER ANALYSIS (Proxy to Microservice)
app.post('/weather/quantum-analyze', async (req, res) => {
    const { weather, location } = req.body; // Expecting wrapped object now
    const weatherData = weather || req.body; // Fallback for old calls

    // --- CACHING MECHANISM ---
    // Simple in-memory cache to reduce load
    // Key: CityName_Hour (approximate) - simplistic but effective for demo
    const cacheKey = location && location.name ? `${location.name}_${new Date().getHours()}` : null;

    // In a real app, use Redis. Here, we'll rely on the DB logs as a cache if recent enough
    if (location && location.name) {
        const recentLog = db.prepare(`
            SELECT * FROM quantum_logs 
            WHERE city = ? AND timestamp > datetime('now', '-10 minutes')
            ORDER BY timestamp DESC LIMIT 1
        `).get(location.name);

        if (recentLog) {
            console.log(`Serving cached Quantum Data for ${location.name}`);
            return res.json({
                storm_probability: recentLog.storm_probability,
                rain_confidence: recentLog.rain_confidence,
                atmospheric_chaos: recentLog.atmospheric_chaos,
                forecast_reliability: recentLog.forecast_reliability,
                quantum_summary: recentLog.quantum_summary,
                top_states: JSON.parse(recentLog.top_states_json || '[]'),
                volatility: recentLog.volatility || 0,
                cyclone_index: recentLog.cyclone_index || 0,
                flood_risk: recentLog.flood_risk || 0,
                final_risk_score: recentLog.final_risk_score || 0,
                cached: true
            });
        }
    }

    // Default to localhost, but allow override
    const QUANTUM_SERVICE_URL = process.env.QUANTUM_API_URL || 'http://localhost:8000';

    try {
        console.log(`Forwarding to Quantum Engine: ${QUANTUM_SERVICE_URL}/quantum/analyze`);

        const response = await fetch(`${QUANTUM_SERVICE_URL}/quantum/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(weatherData)
        });

        if (!response.ok) {
            throw new Error(`Quantum Service Error: ${response.statusText}`);
        }

        const data = await response.json();

        // --- TEMPORAL QUANTUM PHYSICS ENGINE ---
        let chaosVelocity = 0;
        let chaosAcceleration = 0;
        let pressureDropRate = 0;
        let cycloneMomentum = 0;
        let stateDrift = 0;
        let stateLockIn = false;

        // Fetch TWO previous logs for 2nd derivative (acceleration)
        if (location && location.name) {
            const logs = db.prepare(`
                SELECT * FROM quantum_logs 
                WHERE city = ? 
                ORDER BY timestamp DESC LIMIT 2
            `).all(location.name); // [MostRecent, 2ndMostRecent]

            const now = data;
            const prev1 = logs[0]; // T-1 (e.g. 5-10 mins ago)
            const prev2 = logs[1]; // T-2 (e.g. 10-20 mins ago)

            if (prev1) {
                // 1. Chaos Velocity (dChaos/dt)
                chaosVelocity = now.atmospheric_chaos - prev1.atmospheric_chaos;

                // 2. Pressure Drop Rate (Used for Cyclone Momentum)
                // We don't store raw pressure in logs? We should have. 
                // But we can infer it or we assume T-1 pressure was normal if not tracked.
                // Wait, logs table doesn't have pressure column? 
                // Let's rely on Cyclone Index change or proxy pressure via cyclone_index which captures pressure factor
                // Better: Use `cyclone_index` drift as momentum proxy if pressure log missing.
                // Or simply calculate from current vs previous Risk Index.

                // Let's implement State Drift
                // Prob of dominant state now vs previous prob of *that same state* if it existed
                // Simplified: Change in dominant prob
                const nowDominantProb = now.top_states && now.top_states.length > 0 ? now.top_states[0].probability : 0;
                // We stored top_states_json
                const prevStates = JSON.parse(prev1.top_states_json || '[]');
                const prevSameState = prevStates.find(s => s.state === (now.top_states[0]?.state));
                const prevProb = prevSameState ? prevSameState.probability : 0;

                stateDrift = nowDominantProb - prevProb;

                // 3. Cyclone Momentum
                // Momentum = (Chaos Velocity) * (Current Wind Speed [Proxy: Storm Prob?])
                // Or strictly: PressureDrop * Wind.
                // Let's use Chaos Velocity as Pressure Drop proxy (Chaos often precedes pressure drop)
                cycloneMomentum = (chaosVelocity * 10) + (data.cyclone_index - (prev1.cyclone_index || 0));

                // 4. Chaos Acceleration (d2Chaos/dt2)
                if (prev2) {
                    const prevVelocity = prev1.atmospheric_chaos - prev2.atmospheric_chaos;
                    chaosAcceleration = chaosVelocity - prevVelocity;

                    // 5. State Lock-In Detection
                    // If dominant state prob increased T-2 -> T-1 -> Now
                    if (stateDrift > 0 && (prevProb > (prevStates[0]?.probability || 0))) { // Very rough proxy
                        stateLockIn = true;
                    }
                }
            }
        }

        // --- UPDATED FINAL RISK ENGINE ---
        // (0.3 × storm_prob) + (0.3 × chaos) + (0.2 × volatility) + (0.2 × CycloneMomentumNormalized)
        // Normalize momentum (usually small -0.1 to 0.1, we scale it up)
        const momentumFactor = Math.min(1.0, Math.max(0, cycloneMomentum * 5)); // Cap at 1.0

        const finalRiskScore = (
            (0.3 * data.storm_probability) +
            (0.3 * data.atmospheric_chaos) +
            (0.2 * (data.volatility || 0)) +
            (0.2 * momentumFactor)
        );

        // LOG TO DATABASE (Time Evolution)
        if (location && location.name) {
            try {
                const logId = uuidv4();
                const stmt = db.prepare(`
                    INSERT INTO quantum_logs (
                        id, city, latitude, longitude, 
                        storm_probability, rain_confidence, atmospheric_chaos, forecast_reliability, 
                        dominant_state, quantum_summary, top_states_json,
                        volatility, cyclone_index, flood_risk, final_risk_score,
                        chaos_velocity, chaos_acceleration, cyclone_momentum, state_drift
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);

                stmt.run(
                    logId,
                    location.name,
                    location.lat,
                    location.lon,
                    data.storm_probability,
                    data.rain_confidence,
                    data.atmospheric_chaos,
                    data.forecast_reliability,
                    data.top_states && data.top_states.length > 0 ? data.top_states[0].state : 'Unknown',
                    data.quantum_summary,
                    JSON.stringify(data.top_states || []),
                    data.volatility || 0,
                    data.cyclone_index || 0,
                    data.flood_risk || 0,
                    finalRiskScore,
                    chaosVelocity,
                    chaosAcceleration,
                    cycloneMomentum,
                    stateDrift
                );
            } catch (dbErr) {
                console.error("Database Log Error:", dbErr);
            }
        }

        // Return augmented data
        res.json({
            ...data,
            final_risk_score: finalRiskScore,
            chaos_velocity: chaosVelocity,
            chaos_acceleration: chaosAcceleration,
            cyclone_momentum: cycloneMomentum,
            state_drift: stateDrift,
            state_lock_in: stateLockIn
        });
    } catch (error) {
        console.error('Quantum Intelligence Unavailable:', error.message);
        res.status(503).json({
            error: "Quantum Service Unavailable",
            details: "Please ensure the Python Quantum Service is running",
            fallback_data: {
                storm_probability: 0,
                rain_confidence: 0,
                atmospheric_chaos: 0,
                forecast_reliability: 0,
                quantum_summary: "Quantum Link Offline. Classic models only.",
                top_states: []
            }
        });
    }
});

// 5.1 QUANTUM HISTORY (Timeline)
app.get('/weather/quantum-history', (req, res) => {
    const { city } = req.query;
    if (!city) return res.status(400).json({ error: "City required" });

    try {
        const history = db.prepare(`
            SELECT * FROM quantum_logs 
            WHERE city LIKE ? 
            ORDER BY timestamp DESC 
            LIMIT 50
        `).all(`%${city}%`);

        // Parse JSON fields
        const parsedHistory = history.map(h => ({
            ...h,
            top_states: JSON.parse(h.top_states_json || '[]')
        }));

        res.json(parsedHistory);
    } catch (err) {
        console.error("History Fetch Error:", err);
        res.status(500).json({ error: "Failed to fetch history" });
    }
});

// 5.2 QUANTUM BATCH (Multi-City)
app.post('/weather/quantum-batch', async (req, res) => {
    const { requests } = req.body; // Array of { weather, location }
    if (!requests || !Array.isArray(requests)) return res.status(400).json({ error: "Invalid batch request" });

    const QUANTUM_SERVICE_URL = process.env.QUANTUM_API_URL || 'http://localhost:8000';
    const results = [];

    // Process sequentially or parallel. Parallel is better.
    await Promise.all(requests.map(async (reqItem) => {
        try {
            const response = await fetch(`${QUANTUM_SERVICE_URL}/quantum/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reqItem.weather)
            });

            if (response.ok) {
                const data = await response.json();

                // Log it too
                if (reqItem.location) {
                    try {
                        const stmt = db.prepare(`
                            INSERT INTO quantum_logs (
                                id, city, latitude, longitude, 
                                storm_probability, rain_confidence, atmospheric_chaos, forecast_reliability, 
                                dominant_state, quantum_summary, top_states_json
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `);
                        stmt.run(
                            uuidv4(),
                            reqItem.location.name,
                            reqItem.location.lat,
                            reqItem.location.lon,
                            data.storm_probability,
                            data.rain_confidence,
                            data.atmospheric_chaos,
                            data.forecast_reliability,
                            data.top_states?.[0]?.state || 'Unknown',
                            data.quantum_summary,
                            JSON.stringify(data.top_states || [])
                        );
                    } catch (e) { console.error("Batch Log Error", e); }
                }

                results.push({ location: reqItem.location, analysis: data });
            } else {
                results.push({ location: reqItem.location, error: "Failed" });
            }
        } catch (e) {
            results.push({ location: reqItem.location, error: e.message });
        }
    }));

    res.json(results);
});

// 6. GEOLOCATION PROXY (Fixes CORS issues)
app.get('/api/location', async (req, res) => {
    try {
        // use ip-api.com which is free and easy (no https needed for server-to-server)
        // client IP is often ::1 on localhost, so we let the API detect the public IP of the server request
        const response = await fetch('http://ip-api.com/json/');
        const data = await response.json();

        if (data.status === 'success') {
            res.json({
                lat: data.lat,
                lon: data.lon,
                city: data.city,
                country: data.country
            });
        } else {
            res.status(404).json({ error: 'Location not found' });
        }
    } catch (error) {
        console.error("Geo Proxy Error:", error);
        res.status(500).json({ error: 'Failed to fetch location' });
    }
});

// Start Server
const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Security: Active`);
    console.log(`Database: SQLite`);
});

// Keep process alive just in case
setInterval(() => { }, 1000 * 60 * 60);

process.on('exit', (code) => {
    console.log(`Process exiting with code: ${code}`);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT. Shutting down.');
    server.close(() => {
        process.exit(0);
    });
});
