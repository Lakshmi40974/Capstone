# 🤖 Auto Software Development Team Platform

> A multi-agent AI-powered platform that autonomously builds software — from requirements to deployment — using a team of 14 specialized AI agents powered by Google Gemini.

---

## 🚀 Overview

This capstone project simulates a **full software development team** using AI agents. Given a project description, the platform orchestrates 14 specialized agents that collaborate to produce complete, production-ready software — including architecture, code, tests, documentation, and DevOps configuration.

---

## 🧠 Agent Team

| Agent | Role |
|---|---|
| 🗂️ Product Manager | Requirement analysis & user stories |
| 🏗️ Software Architect | System design, UML & ER diagrams |
| 🎨 UI/UX Designer | Design system & accessibility guidelines |
| 🔬 Research Agent | Technology selection & feasibility |
| 🗄️ Database Engineer | Schema design, ORM models, migrations |
| ⚙️ Backend Developer | FastAPI routes & business logic |
| 💻 Frontend Developer | React/Next.js UI components |
| 🔍 Code Reviewer | Static analysis & refactoring |
| 🔒 Security Agent | OWASP audit & vulnerability detection |
| 🧪 QA Testing Agent | Unit & integration test generation |
| ⚡ Performance Agent | Bottleneck profiling & optimization |
| 🐞 Debugging Agent | Exception parsing & auto-healing |
| 🚢 DevOps Agent | Docker, CI/CD & deployment configs |
| 📄 Documentation Agent | README, API docs & user guides |

---

## 🛠️ Tech Stack

**Backend**
- Python 3.10+
- FastAPI + Uvicorn
- Google Gemini API (`gemini-1.5-flash`)
- SQLite (via custom MemoryManager)
- WebSockets (real-time streaming)

**Frontend**
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Real-time WebSocket log streaming

---

## 📁 Project Structure

```
capstone/
├── backend/
│   ├── agents.py          # 14 AI agent definitions
│   ├── orchestrator.py    # Multi-agent pipeline
│   ├── memory.py          # SQLite memory & log manager
│   ├── main.py            # FastAPI app & REST/WebSocket routes
│   ├── requirements.txt
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── app/           # Next.js pages
│   │   └── components/    # AgentWorkflow, AnalyticsDashboard, FileExplorer
│   └── package.json
├── setup.bat              # One-click launcher (Windows)
└── README.md
```

---

## ⚡ Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Google Gemini API Key ([get one here](https://aistudio.google.com/app/apikey))

### 1. Clone the repo
```bash
git clone https://github.com/Lakshmi40974/Capstone.git
cd Capstone
```

### 2. Setup Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

### 3. Setup Frontend
```bash
cd frontend
npm install
```

### 4. Launch (Windows)
Double-click `setup.bat` — it starts both servers automatically.

Or manually:
```bash
# Terminal 1 — Backend
python -m uvicorn backend.main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend && npm run dev
```

### 5. Open the app
- **Frontend Dashboard:** http://localhost:3000
- **Backend API Docs:** http://localhost:8000/docs

---

## 🔧 Configuration

1. Open the app at http://localhost:3000
2. Go to **Settings**
3. Enter your **Gemini API Key**
4. Optionally add a **GitHub Token** for repo integration

---

## ✨ Features

- ✅ Create software projects from a plain-English description
- ✅ 14 AI agents collaborate in a real pipeline
- ✅ Real-time WebSocket log streaming
- ✅ File explorer to browse generated code
- ✅ Analytics dashboard (agents, files, token usage, success rate)
- ✅ Chat directly with any individual agent
- ✅ Export generated project as a ZIP file
- ✅ SQLite-based persistent memory across sessions

---

## 📸 Screenshots

> Coming soon

---

## 📄 License

MIT License © 2025 Lakshmi

---

## 🙏 Acknowledgements

- [Google Gemini](https://deepmind.google/technologies/gemini/) — LLM backbone
- [FastAPI](https://fastapi.tiangolo.com/) — Backend framework
- [Next.js](https://nextjs.org/) — Frontend framework
