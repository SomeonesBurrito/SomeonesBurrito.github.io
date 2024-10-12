const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Path to your SQLite database file
const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.all("SELECT * FROM Users", (err, rows) => {
        if (err) {
            console.error('Error querying database:', err.message);
        } else {
            console.log('Users:', rows);
        }
    });
});

db.close();
