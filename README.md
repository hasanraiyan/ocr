# DocuSense: AI-Powered Document Extraction Platform

DocuSense is a full-stack Intelligent Document Processing (IDP) platform that ingests scanned documents (PDFs, PNGs, JPGs) and extracts structured JSON data using **Google Gemini's multimodal vision** — no OCR middleware required.

It uses a **LangGraph** stateful workflow on the backend and a **Next.js 16** split-screen dashboard on the frontend.

---

## Architecture & Workflow

Documents are passed directly to Gemini as images. Gemini reads text, layout, and context natively without any OCR or preprocessing pipeline.

```
[ Upload API ]
      │
validate_file
      │
prepare_images  (rasterize PDF pages → PNG / use image as-is)
      │
extract_with_llm  (Gemini multimodal → structured JSON)
      │
save_result  (SQLite / Supabase PostgreSQL)
```

---

## Tech Stack

### Backend (`backend/`)
- **FastAPI** — async API with background task execution
- **LangGraph** — stateful workflow orchestration
- **langchain-google-genai** — Gemini multimodal extraction with structured output
- **PyMuPDF** — PDF page rasterization to PNG
- **SQLAlchemy + aiosqlite** — async ORM (SQLite locally, Supabase/Neon PostgreSQL in production)

### Frontend (`frontend/`)
- **Next.js 16** (App Router) + **React 19** + **Tailwind v4**
- **shadcn/ui** — cards, badges, progress bars, buttons
- **Real-time status polling** — 1.5s interval, renders exact pipeline node states
- **Split-screen viewer** — document preview on the left, extracted JSON cards on the right

---

## Quick Start: Docker Compose

### 1. Prerequisites
Docker and Docker Compose installed.

### 2. Environment Setup
```bash
cp backend/.env.example backend/.env
```
Fill in `backend/.env`:
```ini
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/postgres
GEMINI_API_KEY=your_gemini_api_key_here
UPLOAD_DIR=./uploads
```

### 3. Run
```bash
docker compose up --build
```
- Backend: `http://localhost:8000`
- Frontend: `http://localhost:3000`

---

## Local Setup

### Backend
```bash
cd backend
python -m venv .venv

# Windows PowerShell
.venv\Scripts\Activate.ps1
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
python verify_pipeline.py     # verify DB + LangGraph compile
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Visit `http://localhost:3000`.

---

## API Endpoints

### POST `/api/documents/process`
Upload a document. Returns a job ID immediately; processing runs in the background.

**Response:**
```json
{
  "documentId": "4a5c92df-4217-48f1-a1e6-234cb38d998c",
  "filename": "graduation_degree.pdf",
  "status": "PENDING"
}
```

### GET `/api/documents/{id}/result`
Poll for status and extracted data.

**Response (completed):**
```json
{
  "id": "4a5c92df-4217-48f1-a1e6-234cb38d998c",
  "filename": "graduation_degree.pdf",
  "status": "COMPLETED",
  "extracted_data": {
    "holder": { "name": "Jane Doe", "fatherName": "John Doe", "dob": "1998-04-12" },
    "credential": { "degree": "Bachelor of Science", "institution": "State University", "year": "2020", "cgpa": "3.8" },
    "issuer": { "name": "Board of Trustees" },
    "confidence": { "name": 98.0, "degree": 95.0 },
    "rawText": "STATE UNIVERSITY..."
  }
}
```

### GET `/api/documents/`
Returns chronological list of all processing runs.

---

## Pipeline Status Values

| Status | Meaning |
|---|---|
| `PENDING` | Job queued |
| `VALIDATING` | File format check |
| `CONVERTING` | PDF → PNG rasterization |
| `AI_EXTRACTION` | Gemini processing images |
| `COMPLETED` | Done |
| `FAILED` | Error (check `error_message`) |
