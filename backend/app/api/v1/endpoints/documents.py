import os
import uuid
import asyncio
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc

from app.core.config import settings
from app.core.database import get_db
from app.models.document import Document as DBDocument
from app.schemas.document import DocumentCreateResponse, DocumentResponse
from app.services.file_service import FileService
from app.services.storage_service import StorageService
from app.graph.document_graph import document_graph

router = APIRouter()

@router.post("/process", response_model=DocumentCreateResponse)
async def process_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    extension = FileService.validate_file(file)

    doc_id = str(uuid.uuid4())
    original_filename = file.filename or "document"

    saved_filename = f"{doc_id}{extension}"
    saved_file_path = os.path.join(settings.UPLOAD_DIR, saved_filename)

    try:
        with open(saved_file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to persist uploaded document: {str(e)}")

    # Upload to Supabase Storage if configured; fall back to local path
    public_url = await asyncio.to_thread(
        StorageService.upload_file, saved_file_path, saved_filename
    )
    db_file_path = public_url if public_url else saved_file_path

    db_doc = DBDocument(
        id=doc_id,
        filename=original_filename,
        file_path=db_file_path,
        status="PENDING"
    )
    db.add(db_doc)
    await db.commit()
    await db.refresh(db_doc)

    initial_state = {
        "document_id": doc_id,
        "file_path": saved_file_path,   # always the local path for processing
        "file_type": extension,
        "status": "PENDING",
        "page_image_paths": [],
        "extracted_data": None,
        "error": None
    }

    background_tasks.add_task(document_graph.ainvoke, initial_state)

    return DocumentCreateResponse(
        documentId=doc_id,
        filename=original_filename,
        status="PENDING"
    )

@router.get("/{id}/result", response_model=DocumentResponse)
async def get_document_result(id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(DBDocument).where(DBDocument.id == id)
    result = await db.execute(stmt)
    db_doc = result.scalar_one_or_none()

    if not db_doc:
        raise HTTPException(status_code=404, detail="Document processing job not found.")

    return db_doc

@router.get("/", response_model=list[DocumentResponse])
async def list_documents(db: AsyncSession = Depends(get_db)):
    stmt = select(DBDocument).order_by(desc(DBDocument.created_at))
    result = await db.execute(stmt)
    documents = result.scalars().all()
    return documents
