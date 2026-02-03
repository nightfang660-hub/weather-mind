
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
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // unsafe-inline often needed for Vite dev
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
            connectSrc: ["'self'", "http://localhost:*", "ws://localhost:*", "https://*.supabase.co", "http://ip-api.com"]
        },
    },
}));

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        const allowedOrigins = [
            'http://localhost:5173',
            'http://localhost:8080',
            'http://localhost:8081',
            'http://localhost:8082'
        ];
        if (allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('http://192.168.') || origin.startsWith('http://localhost:')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json());

// Rate Limiting (Protection against Brute Force)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
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
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);
        const userId = uuidv4();
        const profileId = uuidv4();

        // 1. Insert User
        await db.query(
            'INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)',
            [userId, email, hashedPassword]
        );

        // 2. Insert Profile
        await db.query(
            'INSERT INTO profiles (id, user_id, full_name, role) VALUES ($1, $2, $3, $4)',
            [profileId, userId, full_name || '', 'user']
        );

        // Auto-login: Generate Token
        const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '7d' });

        // Fetch the created profile
        const profileRes = await db.query('SELECT * FROM profiles WHERE id = $1', [profileId]);
        const profile = profileRes.rows[0];

        // Security Log
        await db.query(
            'INSERT INTO audit_logs (id, user_id, action, ip_address) VALUES ($1, $2, $3, $4)',
            [uuidv4(), userId, 'SIGNUP_AUTO_LOGIN', req.ip]
        );

        res.status(201).json({ message: 'User created successfully', token, user: { ...profile, email } });
    } catch (error) {
        // Postgres Unique Violation Code: 23505
        if (error.code === '23505') {
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
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

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

        // Generate profile info
        const profileRes = await db.query('SELECT * FROM profiles WHERE user_id = $1', [user.id]);
        const profile = profileRes.rows[0];

        // Security Log
        await db.query(
            'INSERT INTO audit_logs (id, user_id, action, ip_address) VALUES ($1, $2, $3, $4)',
            [uuidv4(), user.id, 'LOGIN', req.ip]
        );

        res.json({ token, user: { ...profile, email: user.email } });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 3. GET PROFILE (Protected)
app.get('/user/profile', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM profiles WHERE user_id = $1', [req.user.id]);
        const profile = result.rows[0];

        if (!profile) return res.status(404).json({ error: 'Profile not found' });

        res.json({ ...profile, email: req.user.email });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// 4. UPDATE PROFILE (Protected)
app.put('/user/profile', authenticateToken, async (req, res) => {
    const { full_name, location, website, avatar_url } = req.body;

    try {
        // Postgres OK with COALESCE
        await db.query(`
            UPDATE profiles 
            SET full_name = COALESCE($1, full_name),
                location = COALESCE($2, location),
                website = COALESCE($3, website),
                avatar_url = COALESCE($4, avatar_url),
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $5
        `, [full_name, location, website, avatar_url, req.user.id]);

        const result = await db.query('SELECT * FROM profiles WHERE user_id = $1', [req.user.id]);
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Update Error:", error);
        res.status(500).json({ error: 'Update failed' });
    }
});

// 5. QUANTUM WEATHER ANALYSIS (Proxy to Microservice)
app.post('/weather/quantum-analyze', async (req, res) => {
    const { weather, location } = req.body;
    const weatherData = weather || req.body;

    // Cache Key
    const cacheKey = location && location.name ? `${location.name}_${new Date().getHours()}` : null;

    if (location && location.name) {
        // Postgres date math: timestamp > NOW() - INTERVAL '10 minutes'
        // For Hybrid Compatibility: We use ISO string date comparison.
        const cutoffTime = new Date(Date.now() - 10 * 60000).toISOString();

        const recentLogRes = await db.query(`
            SELECT * FROM quantum_logs 
            WHERE city = $1 AND timestamp > $2
            ORDER BY timestamp DESC LIMIT 1
        `, [location.name, cutoffTime]);

        const recentLog = recentLogRes.rows[0];

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
        let cycloneMomentum = 0;
        let stateDrift = 0;
        let stateLockIn = false;

        // Fetch previous logs
        if (location && location.name) {
            const logsRes = await db.query(`
                SELECT * FROM quantum_logs 
                WHERE city = $1 
                ORDER BY timestamp DESC LIMIT 2
            `, [location.name]);
            const logs = logsRes.rows;

            const now = data;
            const prev1 = logs[0]; // T-1 
            const prev2 = logs[1]; // T-2 

            if (prev1) {
                chaosVelocity = now.atmospheric_chaos - prev1.atmospheric_chaos;

                const nowDominantProb = now.top_states && now.top_states.length > 0 ? now.top_states[0].probability : 0;
                const prevStates = JSON.parse(prev1.top_states_json || '[]');
                const prevSameState = prevStates.find(s => s.state === (now.top_states[0]?.state));
                const prevProb = prevSameState ? prevSameState.probability : 0;

                stateDrift = nowDominantProb - prevProb;
                cycloneMomentum = (chaosVelocity * 10) + (data.cyclone_index - (prev1.cyclone_index || 0));

                if (prev2) {
                    const prevVelocity = prev1.atmospheric_chaos - prev2.atmospheric_chaos;
                    chaosAcceleration = chaosVelocity - prevVelocity;

                    if (stateDrift > 0 && (prevProb > (prevStates[0]?.probability || 0))) {
                        stateLockIn = true;
                    }
                }
            }
        }

        const momentumFactor = Math.min(1.0, Math.max(0, cycloneMomentum * 5));

        const finalRiskScore = (
            (0.3 * data.storm_probability) +
            (0.3 * data.atmospheric_chaos) +
            (0.2 * (data.volatility || 0)) +
            (0.2 * momentumFactor)
        );

        // LOG TO DATABASE
        if (location && location.name) {
            try {
                const logId = uuidv4();
                await db.query(`
                    INSERT INTO quantum_logs (
                        id, city, latitude, longitude, 
                        storm_probability, rain_confidence, atmospheric_chaos, forecast_reliability, 
                        dominant_state, quantum_summary, top_states_json,
                        volatility, cyclone_index, flood_risk, final_risk_score,
                        chaos_velocity, chaos_acceleration, cyclone_momentum, state_drift
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
                `, [
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
                ]);
            } catch (dbErr) {
                console.error("Database Log Error:", dbErr);
            }
        }

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
app.get('/weather/quantum-history', async (req, res) => {
    const { city } = req.query;
    if (!city) return res.status(400).json({ error: "City required" });

    try {
        const result = await db.query(`
            SELECT * FROM quantum_logs 
            WHERE city LIKE $1 
            ORDER BY timestamp DESC 
            LIMIT 50
        `, [`%${city}%`]);

        const history = result.rows;

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
    const { requests } = req.body;
    if (!requests || !Array.isArray(requests)) return res.status(400).json({ error: "Invalid batch request" });

    const QUANTUM_SERVICE_URL = process.env.QUANTUM_API_URL || 'http://localhost:8000';
    const results = [];

    await Promise.all(requests.map(async (reqItem) => {
        try {
            const response = await fetch(`${QUANTUM_SERVICE_URL}/quantum/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reqItem.weather)
            });

            if (response.ok) {
                const data = await response.json();

                if (reqItem.location) {
                    try {
                        await db.query(`
                            INSERT INTO quantum_logs (
                                id, city, latitude, longitude, 
                                storm_probability, rain_confidence, atmospheric_chaos, forecast_reliability, 
                                dominant_state, quantum_summary, top_states_json
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                        `, [
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
                        ]);
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

// Start Server only if run directly
if (require.main === module) {
    const server = app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log(`Security: Active`);

        // Check DB Type
        // If the adapter exposed a type property, we could log it. 
        // But the index.js already logs it on start.
    });

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
}

module.exports = app;
