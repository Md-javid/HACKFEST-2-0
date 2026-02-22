# PolicyPulse AI

> **AI-powered compliance monitoring platform** with real-time policy enforcement, Gemini-driven insights, and agentic violation detection.

---

## Features

| Category | Details |
|---|---|
| **Compliance Dashboard** | Live metrics, compliance score dial, trend charts, severity breakdown |
| **Gen AI — PDF Extraction** | Upload policy PDFs → Gemini extracts structured rules automatically |
| **Gen AI — AI Overview** | Agentic executive summary: top risks, immediate actions, insights |
| **AI Chatbot** | Floating chatbot with 8 predefined questions + free-text, powered by Gemini 1.5 Flash with live DB context |
| **Demo Policy** | One-click demo → Gemini generates 10 realistic GDPR/SOC2/ISO27001 rules instantly |
| **Policy Management** | Upload, view, and manage compliance policies with AI analysis on every upload |
| **Record Scanning** | Automatic rule evaluation against employee, server, vendor, and data store records |
| **Violation Tracking** | Severity-tagged violations (critical/high/medium/low) with status workflow |
| **Reports** | Exportable compliance reports with AI-generated summaries |
| **Auth** | JWT-based auth with role support (admin, compliance_officer, viewer) |

---

## Tech Stack

**Backend**
- Python 3.11+ · FastAPI · Motor (async MongoDB) · PyPDF2 · passlib · python-jose

**Frontend**
- React 19 · TypeScript · Vite 6 · Tailwind CSS v4 · Framer Motion · Lucide React

**AI**
- Google Gemini 1.5 Flash (via `google-generativeai`)
- Temperature-tuned per task: chat (0.5), overview (0.4), PDF analysis (0.3), demo generation (0.7)

**Database**
- MongoDB 6+ (local or Atlas)

---

## Quickstart

### Prerequisites

- Python 3.11+
- Node.js 18+
- MongoDB running on `localhost:27017`
- Google Gemini API key — [get one here](https://aistudio.google.com/app/apikey)

---

### 1 — Clone the repo

```bash
git clone https://github.com/your-username/policypulse-ai.git
cd policypulse-ai
```

---

### 2 — Backend setup

```bash
cd backend

# Create and activate virtual environment
python -m venv ../.venv
# Windows:
..\.venv\Scripts\activate
# macOS/Linux:
source ../.venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and set GEMINI_API_KEY and JWT_SECRET_KEY

# Seed sample data (creates 3 users, 10 rules, 20 records, 8 violations)
python seed_data.py

# Start backend (from backend/ folder)
uvicorn main:app --reload --port 8000
```

Backend runs at: **http://localhost:8000**  
API docs: **http://localhost:8000/docs**

---

### 3 — Frontend setup

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env if your backend is not on port 8000

# Start dev server
npm run dev
```

Frontend runs at: **http://localhost:3000**

---

### 4 — Login

| Role | Email | Password |
|---|---|---|
| Admin | `admin@policypulse.ai` | `admin123` |
| Compliance Officer | `officer@policypulse.ai` | `officer123` |
| Viewer | `viewer@policypulse.ai` | `viewer123` |

---

## Environment Variables

### Backend (`backend/.env`)

```env
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=policypulse
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET_KEY=your-random-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=1440
UPLOAD_DIR=./uploads
SCAN_INTERVAL_MINUTES=30
FRONTEND_URL=http://localhost:3000
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:8000
```

---

## Project Structure

```
policypulse-ai/
├── backend/
│   ├── main.py                  # FastAPI entry point
│   ├── requirements.txt
│   ├── seed_data.py             # Sample data seeder
│   ├── .env.example
│   ├── uploads/                 # Uploaded PDFs
│   └── app/
│       ├── api/routes/
│       │   ├── ai.py            # /api/ai/* — Gemini endpoints
│       │   ├── auth.py          # /api/auth/*
│       │   ├── dashboard.py     # /api/dashboard/*
│       │   ├── policies.py      # /api/policies/*
│       │   ├── records.py       # /api/records/*
│       │   └── violations.py    # /api/violations/*
│       ├── core/
│       │   ├── config.py        # Settings (env vars)
│       │   └── database.py      # MongoDB motor client
│       ├── services/
│       │   ├── ai_service.py    # Gemini AI — chat/overview/PDF/demo
│       │   ├── auth_service.py
│       │   ├── rule_engine.py   # Compliance rule evaluator
│       │   └── scheduler.py     # Auto-scan scheduler
│       └── utils/
│           └── pdf_parser.py    # PDF text extraction
│
└── frontend/
    ├── src/
    │   ├── app/                 # Page routes (React Router)
    │   │   ├── dashboard/
    │   │   ├── policies/
    │   │   ├── records/
    │   │   ├── violations/
    │   │   ├── reports/
    │   │   └── users/
    │   ├── components/
    │   │   ├── ui/
    │   │   │   ├── AIChatbot.tsx    # Floating Gemini chatbot
    │   │   │   ├── ComplianceDial.tsx
    │   │   │   ├── GlassCard.tsx
    │   │   │   └── ...
    │   │   └── layout/
    │   │       ├── Sidebar.tsx
    │   │       └── Topbar.tsx
    │   └── lib/
    │       ├── api.ts           # Axios API client
    │       └── auth-context.tsx
    └── .env.example
```

---

## AI Endpoints

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/ai/chat` | Chat with Gemini using live DB context |
| `GET` | `/api/ai/overview` | Agentic executive compliance overview |
| `GET` | `/api/ai/questions` | Returns 10 predefined quick questions |
| `POST` | `/api/ai/analyze-text` | Analyze a policy text snippet |
| `POST` | `/api/policies/demo-upload` | Generate demo policy + AI rules |
| `POST` | `/api/policies/upload` | Upload PDF + AI extraction + rule generation |

---

## Scripts

```bash
# Start both servers (Windows)
start_backend.bat
start_frontend.bat

# Seed sample data
cd backend && python seed_data.py

# Build frontend for production
cd frontend && npm run build
```

---

## License

MIT — see [LICENSE](LICENSE)
