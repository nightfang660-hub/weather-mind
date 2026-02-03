const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const isProduction = process.env.NODE_ENV === 'production';

let db;

if (isProduction) {
    // --- POSTGRESQL (Production / Vercel) ---
    const { Pool } = require('pg');

    // Use connection string from env (Supabase)
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Required for Supabase
    });

    console.log('Database Driver: PostgreSQL (Production)');

    db = {
        query: (text, params) => pool.query(text, params),
        prepare: () => { throw new Error("Sync prepare() not supported in Postgres mode"); },
        transaction: (cb) => { throw new Error("Sync transaction() not supported in Postgres mode"); }
    };

} else {
    // --- SQLITE (Development / Local) ---
    const Database = require('better-sqlite3');
    const dbPath = path.join(__dirname, 'app.db');

    const sqlite = new Database(dbPath);
    console.log('Database Driver: SQLite (Development) at', dbPath);

    // Initialize Schema
    try {
        const schemaPath = path.join(__dirname, 'schema.sql');
        if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, 'utf8');
            sqlite.exec(schema);
        }
    } catch (e) {
        console.error("Schema Init Error:", e.message);
    }

    // ADAPTER: Mimic Postgres Async API for local SQLite
    db = {
        // Wrap SQLite sync calls in a Promise to match Postgres API
        query: async (text, params = []) => {
            // Convert $1, $2 or $xyz -> ?
            // Note: Postgres uses $1, $2. SQLite uses ?. 
            // Simple regex replacement assumes strictly ordered params.
            let queryText = text.replace(/\$\d+/g, '?');

            try {
                // Determine if it's select or write
                const lowText = queryText.trim().toLowerCase();

                if (lowText.startsWith('select') || lowText.startsWith('with')) {
                    const stmt = sqlite.prepare(queryText);
                    const rows = stmt.all(...params);
                    return { rows, rowCount: rows.length };
                } else {
                    // For INSERT/UPDATE/DELETE
                    // Check if it's an INSERT ... RETURNING *
                    if (lowText.includes('returning')) {
                        // SQLite supports RETURNING since 3.35, better-sqlite3 supports it.
                        // However, we rely on standard .run() vs .all() usually.
                        // If RETURNING is present, we should use .all() or .get()
                        const stmt = sqlite.prepare(queryText);
                        // If we expect multiple or single, usually Postgres query returns .rows
                        const rows = stmt.all(...params);
                        return { rows, rowCount: rows.length };
                    }

                    const stmt = sqlite.prepare(queryText);
                    const info = stmt.run(...params);
                    return { rows: [], rowCount: info.changes };
                }
            } catch (err) {
                // Map SQLite constraint errors to Postgres codes
                if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                    err.code = '23505'; // Postgres Unique Violation
                }
                throw err;
            }
        },

        // Expose raw sqlite for sync usage if absolutely needed (but we should avoid it for compat)
        _raw: sqlite
    };
}

module.exports = db;