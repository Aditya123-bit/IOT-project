const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ---- File Paths ----
const DB_FILE = path.join(__dirname, 'data', 'db.json');
const LCD_FILE = path.join(__dirname, 'data', 'lcd.txt');

// ---- Create data folder if not exists ----
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

// ---- Init DB if not exists ----
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], sensor_data: [] }, null, 2));
}

// ---- Init lcd.txt if not exists ----
if (!fs.existsSync(LCD_FILE)) {
  fs.writeFileSync(LCD_FILE, 'Hello SISTec!');
}

// ---- Helper Functions ----
function readDB() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Get IST time
function getIST() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset);
  const date = ist.toISOString().slice(0, 10).split('-').reverse().join('-'); // DD-MM-YYYY
  const timeStr = ist.toISOString().slice(11, 16); // HH:MM
  // Format to 12hr
  let [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const time = `${h}:${m.toString().padStart(2,'0')} ${ampm}`;
  return { date, time };
}

// ---- Middleware ----
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'sistec_secret_2026',
  resave: false,
  saveUninitialized: false
}));
app.use(express.static(path.join(__dirname, 'public')));

// ---- Auth Middleware ----
function requireLogin(req, res, next) {
  if (req.session && req.session.user) {
    next();
  } else {
    res.redirect('/index.html');
  }
}

// ==============================
//        AUTH ROUTES
// ==============================

// Register
app.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  const db = readDB();
  const exists = db.users.find(u => u.email === email);
  if (exists) {
    return res.send('<script>alert("Email already registered!"); window.location="/register.html";</script>');
  }
  db.users.push({ name, email, password });
  writeDB(db);
  res.send('<script>alert("Registered successfully! Please login."); window.location="/index.html";</script>');
});

// Login
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.send('<script>alert("Invalid email or password!"); window.location="/index.html";</script>');
  }
  req.session.user = { name: user.name, email: user.email };
  res.redirect('/dashboard.html');
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/index.html');
});

// Get logged in user info (for dashboard)
app.get('/api/me', requireLogin, (req, res) => {
  res.json({ name: req.session.user.name, email: req.session.user.email });
});

// ==============================
//       DASHBOARD ROUTES
// ==============================

// Protect dashboard page
app.get('/dashboard.html', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Get latest sensor data
app.get('/api/latest', requireLogin, (req, res) => {
  const db = readDB();
  const records = db.sensor_data;
  if (records.length === 0) {
    return res.json({ temperature: '--', humidity: '--', time: '--', date: '--' });
  }
  const latest = records[records.length - 1];
  res.json(latest);
});

// Get all sensor data
app.get('/api/all', requireLogin, (req, res) => {
  const db = readDB();
  res.json(db.sensor_data);
});

// Delete a record
app.delete('/api/delete/:id', requireLogin, (req, res) => {
  const db = readDB();
  const id = parseInt(req.params.id);
  db.sensor_data = db.sensor_data.filter(r => r.id !== id);
  writeDB(db);
  res.json({ success: true });
});

// Save LCD text
app.post('/api/lcd-save', requireLogin, (req, res) => {
  let { text } = req.body;
  if (!text) return res.json({ success: false });
  text = text.slice(0, 16); // max 16 chars
  fs.writeFileSync(LCD_FILE, text);
  res.json({ success: true });
});

// ==============================
//     ESP8266 APIs (Public)
// ==============================

// API 1: Save Temperature & Humidity (called by ESP8266)
// Example: GET /api/sensor?temp=25.5&humidity=60
app.get('/api/sensor', (req, res) => {
  const { temp, humidity } = req.query;
  if (!temp || !humidity) {
    return res.status(400).send('Missing temp or humidity');
  }
  const db = readDB();
  const { date, time } = getIST();
  const newId = db.sensor_data.length > 0 ? db.sensor_data[db.sensor_data.length - 1].id + 1 : 1;
  db.sensor_data.push({
    id: newId,
    temperature: parseFloat(temp),
    humidity: parseFloat(humidity),
    time,
    date
  });
  writeDB(db);
  res.send('OK');
});

// API 2: Fetch LCD text (called by ESP8266)
// Example: GET /api/lcd
app.get('/api/lcd', (req, res) => {
  if (!fs.existsSync(LCD_FILE)) {
    return res.send('Hello SISTec!');
  }
  const text = fs.readFileSync(LCD_FILE, 'utf8');
  res.send(text);
});

// ---- Start Server ----
app.listen(PORT, () => {
  console.log(`SISTec IoT Server running on port ${PORT}`);
});
