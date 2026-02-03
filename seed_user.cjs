const db = require('./server/db/index');
const bcrypt = require('./server/node_modules/bcryptjs');
const { v4: uuidv4 } = require('./server/node_modules/uuid');

async function seed() {
    console.log("Starting seed...");
    const email = 'admin@example.com';
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const profileId = uuidv4();

    try {
        const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (existing) {
            console.log("User already exists. Updating password.");
            db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(hashedPassword, email);
        } else {
            console.log("Creating new user.");
            // Transaction for atomicity
            const insertUser = db.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)');
            const insertProfile = db.prepare('INSERT INTO profiles (id, user_id, full_name, role) VALUES (?, ?, ?, ?)');

            const transaction = db.transaction(() => {
                insertUser.run(userId, email, hashedPassword);
                insertProfile.run(profileId, userId, 'Admin User', 'user');
            });
            transaction();
        }
        console.log("Seed complete. Credentials: " + email + " / " + password);
    } catch (e) {
        console.error("Seed error:", e);
    }
}

seed();
