import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, JSON, DateTime
from app.core.database import Base

class Document(Base):
    """
    SQLAlchemy model representing the 'documents' table.
    Stores the lifecycle state, layout coordinates, and structured 
    extraction results of ingested documents.
    """
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    status = Column(String(50), nullable=False, default="PENDING")
    error_message = Column(Text, nullable=True)
    raw_text = Column(Text, nullable=True)
    extracted_data = Column(JSON, nullable=True)  # Stores Pydantic structured output mapping
    layout_data = Column(JSON, nullable=True)     # Stores layout bounding boxes and word items
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
