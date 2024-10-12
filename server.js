const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const port = 3000;

// Path to the SQLite database file
const dbPath = path.join(__dirname, 'myproject', 'Website', 'database.db');

// Ensure the directory exists
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

// Create or open the SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
    }
});

// Create the Users table if it does not exist
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS Users (Username TEXT PRIMARY KEY, Password TEXT, Bio TEXT)", (err) => {
        if (err) {
            console.error('Error creating table:', err.message);
        }
    });
});

const profilesDir = path.join(__dirname, 'myproject', 'Website', 'profiles');
if (!fs.existsSync(profilesDir)) {
    fs.mkdirSync(profilesDir, { recursive: true });
}

// Global Middleware
app.use(bodyParser.json()); // Middleware to parse JSON
app.use(express.static(path.join(__dirname))); // Serve static files

const extractUsername = (req, res, next) => {
    console.log('Request body in extractUsername middleware:', req.body); // Debug log
    if (req.body && req.body.usernameorg) {
        req.usernameorg = req.body.usernameorg; // Store usernameorg for later use
    }
    next();
};




// Routes
app.get('/', (req, res) => {
    res.send('Welcome to the registration server!');
});

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const sql = 'INSERT INTO Users (Username, Password) VALUES (?, ?)';
    const params = [username, password];
    db.run(sql, params, function (err) {
        if (err) {
            console.error('Error during registration:', err.message);
            res.status(500).send(`Server error: ${err.message}`);
        } else {
            console.log(`User registered with Username: ${username}`);
            res.status(200).send('Registration successful!');
        }
    });
});

// Set up multer for file handling
const upload = multer({ dest: 'uploads/' }); // Temporarily store files in 'uploads' directory

// Route to handle profile image upload
app.post('/uploadProfileImage', upload.single('profileImage'), (req, res) => {
    const username = req.body.username;
    const tempPath = req.file.path;
    const targetPath = path.join(__dirname, 'myproject', 'Website', 'profiles', `${username}.png`);

    fs.rename(tempPath, targetPath, (err) => {
        if (err) {
            console.error('Error saving profile image:', err.message);
            return res.status(500).send('Error saving profile image.');
        }
        res.status(200).send('Profile image uploaded successfully.');
    });
});

app.post('/uploadFile', upload.single('file'), (req, res) => {
    const username = req.body.username;
    const file = req.file;

    if (!username || !file) {
        return res.status(400).send('Username and file are required.');
    }

    const userDir = path.join(__dirname, 'myproject', 'Website', 'profiles', username);

    // Create the user's folder if it doesn't exist
    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
    }

    const targetPath = path.join(userDir, file.originalname);

    fs.rename(file.path, targetPath, (err) => {
        if (err) {
            console.error('Error saving file:', err.message);
            return res.status(500).send('Error saving file.');
        }
        res.status(200).send('File uploaded successfully.');
    });
});


app.get('/listUserFiles', (req, res) => {
    const username = req.query.username;
    const userDir = path.join(__dirname, 'myproject', 'Website', 'profiles', username);

    if (!fs.existsSync(userDir)) {
        return res.status(404).send('User folder not found.');
    }

    fs.readdir(userDir, (err, files) => {
        if (err) {
            return res.status(500).send('Error reading folder.');
        }

        // Generate file details
        const fileDetails = files.map(file => {
            const filePath = path.join(userDir, file);
            const stats = fs.statSync(filePath);

            return {
                name: file,
                type: path.extname(file).slice(1),
                size: stats.size
            };
        });

        console.log('Files:', fileDetails); // Log files details
        res.json({ files: fileDetails });
    });
});






app.get('/downloadFile', (req, res) => {
    const username = req.query.username;
    const filename = req.query.filename;
    const filePath = path.join(__dirname, 'myproject', 'Website', 'profiles', username, filename);

    if (fs.existsSync(filePath)) {
        res.download(filePath, filename, (err) => {
            if (err) {
                console.error('Error downloading file:', err);
                res.status(500).send('Error downloading file');
            }
        });
    } else {
        res.status(404).send('File not found');
    }
});


app.post('/deleteUserFile', (req, res) => {
    const { username, fileName } = req.body;
    const filePath = path.join(__dirname, 'myproject', 'Website', 'profiles', username, fileName);

    if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error('Error deleting file:', err);
                return res.status(500).json({ success: false, message: 'Error deleting file' });
            }
            res.json({ success: true });
        });
    } else {
        res.status(404).json({ success: false, message: 'File not found' });
    }
});


// PROFILE Search SHT
const stringSimilarity = require('string-similarity');

app.get('/getUserProfileImage', (req, res) => {
    const username = req.query.username.toLowerCase();
    const profileDir = path.join(__dirname, 'myproject', 'Website', 'profiles');

    fs.readdir(profileDir, (err, files) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error reading profiles directory' });
        }

        const usernames = files
            .filter(file => file.endsWith('.png'))
            .map(file => path.basename(file, '.png').toLowerCase());

        const matches = stringSimilarity.findBestMatch(username, usernames);
        const bestMatch = matches.bestMatch;

        if (bestMatch.rating > 0.4) {
            const bestMatchUsername = bestMatch.target;
            return res.json({ 
                success: true, 
                username: bestMatchUsername, // Add this line
                imageUrl: `/myproject/Website/profiles/${bestMatchUsername}.png` 
            });
        } else {
            return res.json({ success: false, message: 'No similar profile image found.' });
        }
    });
});




app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM Users WHERE Username = ?', [username], (err, row) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ message: 'Database error' });
        }
        if (row) {
            if (row.Password === password) {
                res.status(200).json({ success: true, message: 'Login successful' });
            } else {
                res.status(401).send('Incorrect password');
            }
        } else {
            res.status(401).json({ message: 'User does not exist' });
        }
    });
});
app.get('/getBio', (req, res) => {
    const { username } = req.query;
    console.log('Fetching bio for username:', username); // Log the username
    const sql = 'SELECT Bio FROM Users WHERE LOWER(Username) = LOWER(?)'; // Case-insensitive query
    db.get(sql, [username], (err, row) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ message: 'Database error' });
        }
        if (row) {
            res.json({ bio: row.Bio || 'None yet.' });
        } else {
            res.json({ bio: 'None yet.' });
        }
    });
});



// Other existing server routes...


app.post('/updateBio', (req, res) => {
    const { username, bio } = req.body;
    const sql = 'UPDATE Users SET Bio = ? WHERE Username = ?';
    db.run(sql, [bio, username], function (err) {
        if (err) {
            console.error('Error updating bio:', err.message);
            return res.status(500).send(`Server error: ${err.message}`);
        } else {
            res.status(200).send('Bio updated successfully!');
        }
    });
});

  
// Properly handle server shutdown
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database connection:', err.message);
        }
        process.exit(0);
    });
});



app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
