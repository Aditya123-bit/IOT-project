# 🌡️ Real-Time Temperature and Humidity Monitoring Dashboard

An IoT-based project that collects real-time temperature and humidity data from ESP8266 hardware and displays it on a live web dashboard.

---

# 🚀 Features

- 🌡️ Real-time Temperature Monitoring
- 💧 Live Humidity Tracking
- 📡 ESP8266 WiFi Connectivity
- 🌐 Live Web Dashboard
- 📊 Real-time Sensor Data Updates
- 📱 Responsive User Interface
- 🔔 Alert System for High Temperature
- ☁️ Data Communication using APIs

---

# 🛠️ Tech Stack

## Hardware Components

- ESP8266 NodeMCU
- DHT11 / DHT22 Sensor
- Breadboard
- Jumper Wires
- USB Cable

## Software Technologies

- HTML
- Tailwind CSS
- JavaScript
- Node.js
- Express.js
- JSON Database
- Arduino IDE

---

# 📂 Project Structure

```bash
RealTime-Temperature-Humidity-Dashboard/
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   ├── script.js
│
├── backend/
│   ├── server.js
│   ├── routes/
│   ├── database/
│
├── hardware/
│   ├── esp8266_code.ino
│
├── README.md
```

---

# ⚙️ Hardware Connections

## DHT11 / DHT22 Sensor Connection

| Sensor Pin | ESP8266 Pin |
|------------|-------------|
| VCC | 3.3V |
| GND | GND |
| DATA | D4 |

---

# 🧠 Working Principle

1. DHT sensor reads temperature and humidity values.
2. ESP8266 processes sensor data.
3. ESP8266 sends data to the backend server using WiFi.
4. Backend APIs store and manage the data.
5. Web dashboard fetches and displays live sensor readings.
6. Users can monitor environmental conditions in real time.

---

# 🌐 Web Dashboard Features

- Live Temperature Display
- Real-time Humidity Monitoring
- Responsive Dashboard UI
- Auto-refresh Sensor Data
- Device Connection Status

---

# ▶️ Installation & Setup

## 1️⃣ Clone Repository

```bash
git clone https://github.com/Aditya123-bit/IOT-project
```

---

## 2️⃣ Install Backend Dependencies

```bash
cd backend
npm install
```

---

## 3️⃣ Run Backend Server

```bash
node server.js
```

---

## 4️⃣ Upload ESP8266 Code

- Open Arduino IDE
- Install ESP8266 Board Package
- Select NodeMCU 1.0
- Upload `.ino` code to ESP8266

---

# 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/data | Fetch sensor data |
| POST | /api/update | Update temperature & humidity |
| GET | /api/status | Device status |

---

# 📈 Future Enhancements

- ☁️ Cloud Database Integration
- 📱 Mobile Application Support
- 📊 Historical Data Graphs
- 🔔 SMS/Email Alerts
- 🤖 AI-based Weather Prediction

---


# 📌 Applications

- Smart Home Monitoring
- Weather Monitoring System
- Industrial Environment Monitoring
- IoT Learning Projects
- Real-time Data Visualization

---

# 🌍 Live Website

https://iot-project-yp1z.onrender.com

---

# 📜 License

This project is developed for educational and learning purposes.
