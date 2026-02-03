# Weather Mind 🌪️

**Weather Mind** is a next-generation "Quantum-Enhanced" weather intelligence platform. It combines traditional meteorological data with a specialized "Quantum Intelligence" engine to provide predictive risk analysis, storm tracking, and advanced atmospheric insights.

## 🚀 Features

*   **Real-time Weather Dashboard**: Live tracking of temperature, wind, humidity, and pressure.
*   **Quantum Risk Analysis**: Proprietary algorithms (simulated) that calculate:
    *   Storm Probability
    *   Atmospheric Chaos Index
    *   Rain Confidence & Volatility
    *   Cyclone Momentum & State Drift
*   **Interactive Forecasts**: Hourly and daily breakdowns with rich visualizations.
*   **Disaster Intelligence HUD**: A heads-up display for monitoring critical alerts and system status.
*   **User Profiles**: Personalized experience with location tracking and preferences.

## 🛠️ Tech Stack

### Frontend
*   **React** (Vite)
*   **TypeScript**
*   **Tailwind CSS** (Styling)
*   **Shadcn/UI** (Component Library)
*   **Recharts** (Data Visualization)
*   **Framer Motion** (Animations)

### Backend
*   **Node.js / Express**: REST API handling user auth, profiles, and data orchestration.
*   **SQLite**: Lightweight, file-based database for persistence.
*   **JWT**: Secure authentication.

### Microservices
*   **Python (FastAPI/Uvicorn)**: "Quantum Service" dedicated to complex numerical analysis and neural network simulations for weather prediction.

## 📂 Project Structure

```bash
climate-mosaic-main/
├── src/                    # Frontend Source Code
│   ├── components/         # React Components (Dashboard, Weather, UI)
│   ├── contexts/           # React Context (Auth, Settings)
│   ├── hooks/              # Custom Hooks
│   ├── layouts/            # Page Layouts
│   ├── lib/                # Utilities & API Clients
│   ├── pages/              # Route Pages (Index, Auth, Profile)
│   └── main.tsx            # Entry Point
├── server/                 # Backend Node.js Server
│   ├── db/                 # SQLite Database files
│   └── server.js           # Main Express App & Routes
├── quantum_service/        # Python Microservice
│   ├── engine.py           # Quantum Analysis Logic
│   ├── neural_net.py       # Simulated ML Models
│   └── main.py             # FastAPI Entry Point
├── public/                 # Static Assets
└── README.md               # Project Documentation
```

## ⚡ Getting Started

### Prerequisites
*   Node.js (v18+)
*   Python (v3.9+)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/nightfang660-hub/weather-mind.git
    cd weather-mind
    ```

2.  **Install Frontend & Backend Dependencies**
    ```bash
    npm install
    # This also installs server dependencies
    ```

3.  **Setup Python Environment**
    ```bash
    cd quantum_service
    python -m venv ../venv
    source ../venv/bin/activate  # or venv\Scripts\activate on Windows
    pip install -r requirements.txt
    cd ..
    ```

4.  **Run the Application**
    ```bash
    npm run dev
    ```
    This single command launches:
    *   Frontend: `http://localhost:8080`
    *   Backend API: `http://localhost:3000`
    *   Quantum Service: `http://localhost:8000`

## 🔒 Security

*   **Helmet.js**: Secure HTTP headers.
*   **Bcrypt**: Password hashing.
*   **JWT**: Token-based stateless authentication.
*   **Rate Limiting**: Protection against brute-force attacks.

## 📄 License

This project is proprietary and confidential.
