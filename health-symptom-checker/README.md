# Agentic AI Health Symptom Checker — Powered by IBM Granite

> An AI-driven health symptom checker that uses **IBM Granite on watsonx.ai** to analyze user-described symptoms and return educational health information including probable conditions, urgency levels, home remedies, and when to see a doctor.

---

## 🏗️ Project Structure

```
health-symptom-checker/
├── backend/                   ← Node.js + Express API server
│   ├── server.js              ← Main entry point
│   ├── granite.service.js     ← IBM watsonx.ai / Granite integration
│   ├── prompt.builder.js      ← Prompt engineering for Granite
│   ├── routes/
│   │   └── symptoms.js        ← POST /api/symptoms/analyze endpoint
│   ├── package.json
│   └── env.example            ← Copy to .env and fill credentials
│
└── frontend/                  ← Static HTML/CSS/JS frontend
    ├── index.html             ← Main app page
    ├── css/
    │   └── style.css          ← IBM Carbon-inspired stylesheet
    └── js/
        └── app.js             ← Frontend logic (fetch, render, history)
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js 18+** — [Download](https://nodejs.org)
- **IBM Cloud account** — [Sign up free](https://cloud.ibm.com/registration)
- **watsonx.ai project** — [Create project](https://dataplatform.cloud.ibm.com)

---

### 2. Get IBM Credentials

#### IBM Cloud API Key
1. Go to [IBM Cloud IAM → API Keys](https://cloud.ibm.com/iam/apikeys)
2. Click **Create an IBM Cloud API key**
3. Copy the key (you only see it once)

#### watsonx.ai Project ID
1. Open [watsonx.ai](https://dataplatform.cloud.ibm.com/wx/home)
2. Create or open a project
3. Go to **Manage → General** tab
4. Copy the **Project ID**

---

### 3. Configure Environment

```bash
cd health-symptom-checker/backend

# Windows (PowerShell)
Copy-Item env.example .env

# macOS / Linux
cp env.example .env
```

Edit `.env` and fill in your credentials:

```env
IBM_API_KEY=your_actual_ibm_cloud_api_key
WATSONX_PROJECT_ID=your_actual_watsonx_project_id
WATSONX_URL=https://us-south.ml.cloud.ibm.com
GRANITE_MODEL_ID=ibm/granite-13b-instruct-v2
PORT=3000
```

---

### 4. Install & Run Backend

```bash
cd health-symptom-checker/backend
npm install
npm start
```

Server starts at: **http://localhost:3000**

---

### 5. Open Frontend

Open in browser:
```
http://localhost:3000
```
*(The Express server also serves the frontend statically.)*

Or open `frontend/index.html` directly in a browser (with VS Code Live Server on port 5500 — the CORS config allows this).

---

## 🔌 API Reference

### `POST /api/symptoms/analyze`

**Request body:**
```json
{
  "symptoms": "I have a sore throat, fever, and body aches for 2 days",
  "language": "English",
  "age": "28",
  "gender": "Female"
}
```

**Response:**
```json
{
  "success": true,
  "language": "English",
  "symptoms": "...",
  "analysis": {
    "possibleConditions": [
      { "name": "Influenza (Flu)", "description": "...", "matchScore": "High" }
    ],
    "urgencyLevel": "Moderate",
    "urgencyReason": "Symptoms suggest viral illness; monitor for worsening.",
    "homeRemedies": ["Rest and stay hydrated", "Honey and ginger tea", "..."],
    "whenToSeeDoctor": ["Fever above 103°F (39.4°C)", "Difficulty breathing", "..."],
    "preventiveTips": ["Wash hands regularly", "Get flu vaccine annually", "..."],
    "disclaimer": "...",
    "sources": ["WHO Guidelines", "CDC Health Information", "MedlinePlus"]
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "poweredBy": "IBM Granite via watsonx.ai"
}
```

### `GET /api/symptoms/health`
Returns server health status and configured model ID.

---

## 🌍 Supported Languages

Auto-detection is built in. Explicitly supported options in the UI:
English, Spanish, French, German, Hindi, Portuguese, Arabic, Chinese, Japanese, Tamil, Telugu

---

## 🔒 Safety & Compliance

- All responses include an **educational disclaimer**
- No personal health data is stored (stateless API)
- Rate limiting: 60 requests / 15 minutes per IP
- Helmet.js security headers enabled
- Content is explicitly framed as **educational only**, not a diagnosis

---

## 🛠️ IBM Technologies Used

| Technology | Purpose |
|---|---|
| **IBM Granite 13B Instruct** | Core AI model for symptom analysis |
| **IBM watsonx.ai** | Model hosting & inference API |
| **IBM Cloud IAM** | API key authentication |
| **IBM Cloud Lite** | Free-tier cloud services |

---

## 📋 Disclaimer

This application is for **educational and informational purposes only**. It does not provide medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional for medical concerns.

---

*© 2024 IBM Health AI Project — Built with IBM Cloud Lite & IBM Granite*
