from typing import TypedDict, Optional, List, Dict, Any
from langchain_core.documents import Document

class DocumentState(TypedDict):
    """
    State definition for the DocuSense document processing workflow.
    Uses standard LangChain Document models to store state across nodes.
    """
    document_id: str                   # Database UUID of the processing job
    file_path: str                     # Local filepath of the uploaded document
    file_type: str                     # File extension (.pdf, .png, .jpg, .jpeg)
    status: str                        # Lifecycle stage tracking
    documents: List[Document]          # LangChain Document objects representing pages
    raw_text: str                      # Cumulative OCR text string
    extracted_data: Optional[Dict[str, Any]] # Resulting AI structured Pydantic schema
    retry_count: int                   # OCR quality retry attempt counter
    error: Optional[str]               # Diagnostic details if processing fails
