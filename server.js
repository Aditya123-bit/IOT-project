const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ---- File Paths ----
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE  = path.join(DATA_DIR, 'db.json');
const LCD_FILE = path.join(DATA_DIR, 'lcd.txt');

// ---- Create data folder if not exists ----
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// ---- Init DB if not exists ----
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], sensor_data: [] }, null, 2));
}

// ---- Init lcd.txt if not exists ----
if (!fs.existsSync(LCD_FILE)) {
  fs.writeFileSync(LCD_FILE, 'Hello SISTec!');
}

// ==============================
//     Local JSON DB Helpers
// ==============================

function readDB() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ---- IST Time ----
function getIST() {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const date = ist.toISOString().slice(0, 10).split('-').reverse().join('-');
  let [h, m] = ist.toISOString().slice(11, 16).split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return { date, time: `${h}:${m.toString().padStart(2, '0')} ${ampm}` };
}

// ---- Middleware ----
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'sistec_secret_2026', resave: false, saveUninitialized: false }));
app.use(express.static(path.join(__dirname, 'public')));

// ---- Auth Middleware ----
function requireLogin(req, res, next) {
  if (req.session && req.session.user) next();
  else res.redirect('/index.html');
}

// ==============================
//        AUTH ROUTES
// ==============================

app.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  const db = readDB();
  if (db.users.find(u => u.email === email)) {
    return res.send('<script>alert("Email already registered!"); window.location="/register.html";</script>');
  }
  db.users.push({ name, email, password });
  writeDB(db);
  res.send('<script>alert("Registered successfully! Please login."); window.location="/index.html";</script>');
});

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

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/index.html'); });

app.get('/api/me', requireLogin, (req, res) => {
  res.json({ name: req.session.user.name, email: req.session.user.email });
});

// ==============================
//       DASHBOARD ROUTES
// ==============================

app.get('/dashboard.html', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/api/latest', requireLogin, (req, res) => {
  const db = readDB();
  const records = db.sensor_data;
  if (!records || records.length === 0) {
    return res.json({ temperature: '--', humidity: '--', time: '--', date: '--' });
  }
  res.json(records[records.length - 1]);
});

app.get('/api/all', requireLogin, (req, res) => {
  const db = readDB();
  res.json(db.sensor_data || []);
});

app.delete('/api/delete/:id', requireLogin, (req, res) => {
  const db = readDB();
  db.sensor_data = db.sensor_data.filter(r => r.id !== parseInt(req.params.id));
  writeDB(db);
  res.json({ success: true });
});

app.post('/api/lcd-save', requireLogin, (req, res) => {
  let { text } = req.body;
  if (!text) return res.json({ success: false });
  fs.writeFileSync(LCD_FILE, text.slice(0, 16));
  res.json({ success: true });
});

// ==============================
//     ESP8266 APIs (Public)
// ==============================

// API 1: Save Temperature & Humidity
// GET /api/sensor?temp=25.5&humidity=60
app.get('/api/sensor', (req, res) => {
  const { temp, humidity } = req.query;
  if (!temp || !humidity) return res.status(400).send('Missing temp or humidity');
  const db = readDB();
  const { date, time } = getIST();
  const newId = db.sensor_data.length > 0
    ? db.sensor_data[db.sensor_data.length - 1].id + 1
    : 1;
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

// API 2: Fetch LCD text
// GET /api/lcd
app.get('/api/lcd', (req, res) => {
  if (!fs.existsSync(LCD_FILE)) return res.send('Hello SISTec!');
  res.send(fs.readFileSync(LCD_FILE, 'utf8'));
});

// ==============================
//   API 3: Export for Google Colab
//   GET /api/export?key=sistec2026
// ==============================
app.get('/api/export', (req, res) => {
  const { key } = req.query;

  // API Key check
  if (key !== 'sistec2026') {
    return res.status(401).json({ error: 'Unauthorized. Wrong API key.' });
  }

  const db = readDB();
  const records = db.sensor_data || [];

  if (records.length === 0) {
    return res.json({ status: 'success', total_records: 0, data: [] });
  }

  // Clean data for ML
  const mlData = records.map((r, i) => ({
    index: i + 1,
    temperature: r.temperature,
    humidity: r.humidity,
    date: r.date,
    time: r.time
  }));

  // Summary stats
  const temps = records.map(r => r.temperature);
  const humis = records.map(r => r.humidity);
  const avg = arr => (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2);

  res.json({
    status: 'success',
    project: 'SISTec IoT Application 2026',
    total_records: records.length,
    summary: {
      temperature: { avg: parseFloat(avg(temps)), min: Math.min(...temps), max: Math.max(...temps) },
      humidity:    { avg: parseFloat(avg(humis)), min: Math.min(...humis), max: Math.max(...humis) }
    },
    data: mlData
  });
});

// ---- Start Server ----
app.listen(PORT, () => console.log(`SISTec IoT Server running on port ${PORT}`));
