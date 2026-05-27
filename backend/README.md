# DocuSense Backend: Stateful LangGraph & FastAPI OCR Pipeline

DocuSense is a production-grade, asynchronous document intelligence, layout analysis, and structured entity extraction backend. It combines high-performance image preprocessing (`OpenCV`), layout-aware character recognition (`EasyOCR`), standard page-parsing loaders (`PyMuPDF`), stateful graph orchestration (`LangGraph`), and structured large language model parsing (`LangChain` + `Gemini API`) in a robust FastAPI server.

---

## 🏗️ System Architecture & Workflow

DocuSense orchestrates the document processing pipeline using a **StateGraph**. This modular layout allows independent step validation, quality assessment, and automatic contrast retry branching:

```
                  [ START ]
                      │
            validate_file_node
                      │
           convert_document_node (PyMuPDF)
                      │
         ┌── preprocess_images_node (OpenCV) ◀───┐
         │            │                           │
         │       run_ocr_node (EasyOCR)           │
         │            │                           │
         │     [ Quality Check ] ─────────────────┘
         │            │  (Length < 30 & Retries < 2)
         │            │
         │            ▼ (Pass)
         │    extract_with_llm_node (Gemini LCEL)
         │            │
         └──────────▶ │
                      ▼
               save_result_node (SQLite / Supabase)
                      │
                   [ END ]
```

---

## 🛠️ Tech Stack & Core Libraries

*   **API & Engine Framework**: `FastAPI` (lifespan driven, background task executed).
*   **Orchestration Engine**: `LangGraph` (stateful, cyclic routing, checkpoint async DB logging).
*   **Core Abstractions**: `LangChain-Core` & `LangChain-Community` (standard `Document` structures).
*   **Structured AI Extractor**: `langchain-google-genai` (LCEL prompt-model-parser chain talking to `Gemini 3.5 Flash`).
*   **Ingestion Engine**: `PyMuPDF` / `fitz` (high-fidelity vector text parser and high-speed page rasterizer).
*   **Preprocessing Suite**: `OpenCV` (bilateral denoising filters, adaptive histogram equalization, Hough line orientations deskewing).
*   **OCR & Layout Engine**: `EasyOCR` (neural-net character reader outputting clean text bounding box corner coordinates).
*   **Database ORM**: `SQLAlchemy` (asynchronous declarative mapping, automatic table migration, fully compatible with local **SQLite** or cloud **Supabase/Neon PostgreSQL**).

---

## 🚀 Setup & Execution Instructions

### 1. Prerequisites
*   Python 3.10, 3.11, or 3.12 installed on your machine.
*   A **Gemini API Key** (Get a free key from Google AI Studio).

### 2. Environment Setup
Clone the repository, navigate into the backend folder, and establish your virtual environment:

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment:
*   **Windows (PowerShell)**: `.venv\Scripts\Activate.ps1`
*   **Windows (Command Prompt)**: `.venv\Scripts\activate.bat`
*   **macOS / Linux**: `source .venv/bin/activate`

Install the required packages:
```bash
pip install -r requirements.txt
```

### 3. Environment Variables Configuration
Copy the template configuration file to create your active environment settings:
```bash
cp .env.example .env
```

Open `.env` and fill out your configuration parameters:
```ini
DATABASE_URL=sqlite+aiosqlite:///./docusense.db
GEMINI_API_KEY=your_gemini_api_key_here
UPLOAD_DIR=./uploads
```
*Note: To swap to Supabase or cloud PostgreSQL, simply update the `DATABASE_URL` in `.env` to use the async driver: `postgresql+asyncpg://postgres:password@host:port/dbname`.*

### 4. Running Verification
Execute the local integration verification script to test database engines, compile the LangGraph workflow, and load the EasyOCR models:
```bash
python verify_pipeline.py
```

### 5. Starting the FastAPI Server
Launch the server in hot-reload development mode using Uvicorn:
```bash
uvicorn app.main:app --reload
```
The server will boot up on `http://localhost:8000`. You can visit the interactive API documentation at:
👉 **[http://localhost:8000/docs](http://localhost:8000/docs)** (Swagger UI)

---

## 🔌 API Documentation

### 1. Process Document
*   **Endpoint**: `POST /api/documents/process`
*   **Payload**: Multipart form-data containing:
    *   `file`: The document (PDF, PNG, JPG, JPEG) under 10MB.
*   **Response (Immediate)**:
    ```json
    {
      "documentId": "4a5c92df-4217-48f1-a1e6-234cb38d998c",
      "filename": "graduation_degree.pdf",
      "status": "PENDING"
    }
    ```
    *Note: The processing is delegated to a background task, returning the job ID instantly to ensure maximum response performance.*

### 2. Retrieve Status & Structured Result
*   **Endpoint**: `GET /api/documents/{id}/result`
*   **Response (Ongoing/Finished)**:
    ```json
    {
      "id": "4a5c92df-4217-48f1-a1e6-234cb38d998c",
      "filename": "graduation_degree.pdf",
      "file_path": "./uploads/4a5c92df-4217-48f1-a1e6-234cb38d998c.pdf",
      "status": "COMPLETED",
      "error_message": null,
      "raw_text": "STATE UNIVERSITY OF NEW YORK...\nDegree of Bachelor of Science...",
      "extracted_data": {
        "holder": {
          "name": "Jane Doe",
          "fatherName": "John Doe",
          "dob": "1998-04-12"
        },
        "credential": {
          "degree": "Bachelor of Science in Computer Science",
          "institution": "State University of New York",
          "year": "2020",
          "cgpa": "3.85"
        },
        "issuer": {
          "name": "SUNY Board of Trustees"
        },
        "confidence": {
          "name": 98.0,
          "degree": 95.0
        }
      },
      "layout_data": [
        {
          "box": [[120, 200], [450, 200], [450, 250], [120, 250]],
          "text": "STATE UNIVERSITY OF NEW YORK",
          "confidence": 98.4,
          "page": 0
        }
      ],
      "created_at": "2026-05-27T15:20:30"
    }
    ```

### 3. List Document History
*   **Endpoint**: `GET /api/documents/`
*   **Response**: A chronological array of all historical document records.
