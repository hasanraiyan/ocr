import os
import uuid
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc

from app.core.config import settings
from app.core.database import get_db
from app.models.document import Document as DBDocument
from app.schemas.document import DocumentCreateResponse, DocumentResponse
from app.services.file_service import FileService
from app.graph.document_graph import document_graph

router = APIRouter()

@router.post("/process", response_model=DocumentCreateResponse)
async def process_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Receives document uploads via multipart form-data, checks file bounds,
    logs the initial record, and schedules the LangGraph state machine 
    asynchronously inside a background task.
    """
    # 1. Validate file constraints
    extension = FileService.validate_file(file)

    # 2. Assign unique ID
    doc_id = str(uuid.uuid4())
    original_filename = file.filename or "document"

    # 3. Save uploaded file to the uploads folder
    saved_filename = f"{doc_id}{extension}"
    saved_file_path = os.path.join(settings.UPLOAD_DIR, saved_filename)
    
    try:
        # Standard synchronous write inside async def handles uploads safely
        with open(saved_file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to persist uploaded document: {str(e)}"
        )

    # 4. Insert initial tracking record as PENDING
    db_doc = DBDocument(
        id=doc_id,
        filename=original_filename,
        file_path=saved_file_path,
        status="PENDING"
    )
    db.add(db_doc)
    await db.commit()
    await db.refresh(db_doc)

    # 5. Build initial state for the LangGraph
    initial_state = {
        "document_id": doc_id,
        "file_path": saved_file_path,
        "file_type": extension,
        "status": "PENDING",
        "documents": [],
        "raw_text": "",
        "extracted_data": None,
        "retry_count": 0,
        "error": None
    }

    # 6. Kickoff LangGraph workflow asynchronously in the background
    background_tasks.add_task(document_graph.ainvoke, initial_state)

    # 7. Immediately return the tracking job ID to the client
    return DocumentCreateResponse(
        documentId=doc_id,
        filename=original_filename,
        status="PENDING"
    )

@router.get("/{id}/result", response_model=DocumentResponse)
async def get_document_result(id: str, db: AsyncSession = Depends(get_db)):
    """
    Retrieves the full lifecycle data of a document including its current status,
    OCR raw text logs, layout highlight arrays, and AI-extracted Pydantic JSON cards.
    """
    stmt = select(DBDocument).where(DBDocument.id == id)
    result = await db.execute(stmt)
    db_doc = result.scalar_one_or_none()

    if not db_doc:
        raise HTTPException(status_code=404, detail="Document processing job not found.")

    return db_doc

@router.get("/", response_model=list[DocumentResponse])
async def list_documents(db: AsyncSession = Depends(get_db)):
    """
    Fetches the historical list of all processed items ordered by creation date.
    Used for loading the sidebar history panel.
    """
    stmt = select(DBDocument).order_by(desc(DBDocument.created_at))
    result = await db.execute(stmt)
    documents = result.scalars().all()
    
    return documents
