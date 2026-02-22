<div align="center">

# PolicyPulse AI

### Autonomous Compliance Monitoring Platform

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-47A248?style=flat&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Gemini AI](https://img.shields.io/badge/Gemini-1.5_Flash-4285F4?style=flat&logo=google&logoColor=white)](https://aistudio.google.com)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat&logo=docker&logoColor=white)](https://docker.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Built for HACKFEST 2.0**

[Features](#-features)  [Architecture](#-architecture)  [Quick Start](#-quick-start)  [Docker](#-docker)  [API Docs](#-api-reference)  [Demo](#-demo-credentials)

</div>

---

## Problem Statement

Organizations waste thousands of hours manually reviewing compliance against GDPR, SOC 2 Type II, and ISO 27001. Violations go undetected for months, resulting in **regulatory fines, data breaches, and audit failures**.

**PolicyPulse AI** changes this: upload any compliance policy PDF and the platform autonomously extracts rules, monitors your entire company database in real-time, detects violations, and deploys AI agents to remediate them — all without human intervention.

---

## Features

### Core Platform
| Feature | Description |
|---|---|
| **PDF Policy Ingestion** | Upload compliance PDFs  Gemini AI extracts structured, enforceable rules automatically |
| **Autonomous Violation Detection** | Rule engine scans employees, servers, vendors, and data stores with confidence scoring |
| **Compliance Dashboard** | Live score dial, violation trend charts, severity breakdown, AI executive summary |
| **Full Audit Reports** | Tabbed reports with charts, AI summary, agent stats, policy/rule/violation breakdown |
| **AI Chatbot** | Floating assistant with live DB context, 8 predefined questions + free-text (Gemini 1.5 Flash) |

### Agentic AI System
| Feature | Description |
|---|---|
| **ReAct Agent** | Perceive  Reason  Act  Reflect loop; autonomously remediates violations step-by-step |
| **Multi-Agent Orchestrator** | 4 specialist agents (Security, Privacy, Vendor, Operations) with domain routing |
| **Risk Predictor** | Proactively scans records *before* violations occur, predicts upcoming compliance risks |
| **Policy Advisor** | Analyzes violation patterns and suggests new policy rules to close coverage gaps |
| **Batch Remediation** | Run all agents on critical violations simultaneously with summary stats |

### Management
| Feature | Description |
|---|---|
| **Role-Based Auth** | JWT authentication with Admin / Compliance Officer / Viewer roles |
| **User Management** | Admin panel to view, reassign roles, and delete users |
| **Records Management** | Upload CSV/JSON records, manual entry, bulk import, external DB connect |
| **Scheduled Scanning** | Configurable background scanner (default: every 30 minutes) |

---

## Architecture

```

                     React 19 + TypeScript                     
   Dashboard  Violations  Policies  Records  Agent Center  
                 Reports  Users  AI Chatbot                   

                          REST API (JWT)

                  FastAPI (Python 3.11)                         
                                                               
       
     Rule Engine             AI Services                  
    Policy Parser            
    Violation Det.      ReAct      Orchestrator       
    Scheduler           Agent      (4 Agents)         
            
                               
                          Risk       Policy             
                          Predict.   Advisor            
                               
                          
                                                              
                        Google Gemini 1.5 Flash                

                         

                    MongoDB (Motor async)                       
  policies  rules  violations  company_records  users       
  scan_history                                                  

```

### Agent ReAct Loop
```
Violation Detected
       
  PERCEIVE  fetch violation + record + rule details
       
  REASON   Gemini analyzes context, selects tool
       
   ACT     resolve / update_field / escalate / get_score
       
  REFLECT  validate outcome, update confidence score
       
  Done / Loop (max 5 iterations)
```

---

## Tech Stack

**Frontend**
- React 19 + TypeScript + Vite 6
- Tailwind CSS v4 + Framer Motion
- Recharts (AreaChart, PieChart)
- React Router DOM v7
- Lucide React icons

**Backend**
- Python 3.11 + FastAPI + Uvicorn
- Motor (async MongoDB driver)
- PyJWT + Passlib (bcrypt)
- Google Generative AI (Gemini 1.5 Flash)
- PDFPlumber (PDF text extraction)
- APScheduler (background tasks)

**Infrastructure**
- MongoDB 7.0
- Docker + Docker Compose
- nginx (production frontend)

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- MongoDB running locally on port 27017
- Google Gemini API key — [get one free](https://aistudio.google.com/app/apikey)

### 1. Clone & configure

```bash
git clone https://github.com/Md-javid/HACKFEST-2-0.git
cd HACKFEST-2-0

# Backend environment
cp backend/.env.example backend/.env
# Edit backend/.env and set your GEMINI_API_KEY
```

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python seed_data.py               # Seed demo data
uvicorn main:app --reload --port 8000
```

Backend runs at **http://localhost:8000**
API docs at **http://localhost:8000/docs**

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:3000**

---

## Docker

The fastest way to run the full stack.

### Setup

```bash
# 1. Copy and configure environment
cp backend/.env.example backend/.env
# Set GEMINI_API_KEY in backend/.env

# 2. Build and start all services
docker compose up --build

# 3. Open in browser
open http://localhost
```

**Services started:**
| Service | Container | Port |
|---|---|---|
| Frontend (nginx) | policypulse-frontend | 80 |
| Backend (FastAPI) | policypulse-backend | 8000 (internal) |
| Database (MongoDB) | policypulse-mongo | 27017 (internal) |

### Useful commands

```bash
# Run in background
docker compose up -d --build

# View logs
docker compose logs -f backend

# Seed demo data inside container
docker compose exec backend python seed_data.py

# Stop
docker compose down

# Stop and remove all data
docker compose down -v
```

---

## Demo Credentials

After running `python seed_data.py` (or `docker compose exec backend python seed_data.py`):

| Role | Email | Password |
|---|---|---|
| **Admin** | admin@policypulse.ai | admin123 |
| **Compliance Officer** | officer@policypulse.ai | officer123 |
| **Viewer** | viewer@policypulse.ai | viewer123 |

**Pre-loaded demo data:**
- 1 compliance policy (GDPR / SOC 2 / ISO 27001)
- 10 enforcement rules
- 13 company records (employees, servers, vendors, data stores)
- 8 violations (critical  low, various statuses)

---

## Environment Variables

Create `backend/.env` from `backend/.env.example`:

| Variable | Default | Description |
|---|---|---|
| `MONGODB_URL` | `mongodb://localhost:27017` | MongoDB connection string |
| `DATABASE_NAME` | `policypulse` | MongoDB database name |
| `GEMINI_API_KEY` | — | **Required.** Google Gemini API key |
| `AI_PROVIDER` | `gemini` | AI provider (`gemini`) |
| `JWT_SECRET_KEY` | — | **Change in production.** Random 256-bit string |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | JWT token lifetime (minutes) |
| `FRONTEND_URL` | `http://localhost:3000` | CORS allowed origin |
| `SCAN_INTERVAL_MINUTES` | `30` | Background scan interval |
| `UPLOAD_DIR` | `./uploads` | Policy PDF upload directory |

---

## Project Structure

```
HACKFEST-2-0/
 backend/
    main.py                    # FastAPI app entry point
    seed_data.py               # Demo data seeder
    requirements.txt
    Dockerfile
    .env.example
    app/
        api/routes/
           agent.py           # ReAct agent & orchestrator endpoints
           ai.py              # Gemini chat & overview
           auth.py            # JWT auth endpoints
           dashboard.py       # Stats, reports, reset
           policies.py        # PDF upload & policy management
           records.py         # Company records CRUD
           violations.py      # Violation management
        core/
           config.py          # Settings (pydantic)
           database.py        # MongoDB connection + seed
        services/
            agent_service.py       # ReAct agent (628 lines)
            orchestrator_service.py # Multi-agent orchestrator
            risk_predictor_service.py # Proactive risk scanning
            policy_advisor_service.py # Rule gap analysis
            ai_service.py          # Gemini integration
            rule_engine.py         # Violation detection engine
            scheduler.py           # Background scan scheduler
 frontend/
    src/
       app/
          dashboard/page.tsx     # Main dashboard
          violations/page.tsx    # Violations + agent UI
          policies/page.tsx      # Policy management
          records/page.tsx       # Records management
          monitoring/page.tsx    # Agent Control Center
          reports/page.tsx       # Audit reports
          users/page.tsx         # User management
          login/page.tsx         # Auth page
       components/
          layout/               # Sidebar, Topbar, AuthGuard
          ui/                   # Reusable components
       lib/
           api.ts                # Axios API client
           auth-context.tsx      # Auth state
    Dockerfile
    nginx.conf
 docker-compose.yml
 README.md
```

---

## API Reference

FastAPI auto-generates interactive docs at **http://localhost:8000/docs**

Key endpoints:

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login, returns JWT |
| `GET` | `/api/dashboard/stats` | Live compliance stats |
| `GET` | `/api/dashboard/report` | Full audit report |
| `POST` | `/api/policies/upload` | Upload policy PDF |
| `POST` | `/api/policies/demo-upload` | Generate Gemini demo policy |
| `GET` | `/api/violations/` | List violations (filter by severity/status) |
| `POST` | `/api/violations/scan` | Trigger manual compliance scan |
| `POST` | `/api/agent/remediate/{id}` | Run ReAct agent on a violation |
| `POST` | `/api/agent/orchestrate-batch` | Run all specialist agents |
| `POST` | `/api/agent/predict-risks` | Proactive risk prediction |
| `POST` | `/api/agent/suggest-policies` | AI policy gap suggestions |
| `GET` | `/api/ai/overview` | Gemini compliance executive summary |
| `POST` | `/api/ai/chat` | AI chatbot query |

---

## Screenshots

> Dashboard — live compliance score, trend charts, violation summary, AI executive summary

> Agent Center — multi-agent orchestrator, risk predictor, policy advisor

> Reports — tabbed audit report with charts, AI summary, agent stats

> Violations — severity-filtered list with AI agent remediation

---
---

<div align="center">

Built with :heart: by Javi FOR EVERYONE!

**Stack:** Python  FastAPI  React  TypeScript  MongoDB  Google Gemini AI  Docker

</div>
