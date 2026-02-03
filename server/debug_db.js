const db = require('./db/index.js');

console.log('--- ALL USERS ---');
const users = db.prepare('SELECT id, email, password_hash FROM users').all();
console.log(users);

console.log('--- ALL PROFILES ---');
const profiles = db.prepare('SELECT * FROM profiles').all();
console.log(profiles);
