from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

# ==========================================
# 1. Pydantic Schemas for AI Entity Extraction
# ==========================================

class HolderSchema(BaseModel):
    name: Optional[str] = Field(default=None, description="Full name of the document holder/candidate")
    fatherName: Optional[str] = Field(default=None, description="Father's name of the document holder")
    dob: Optional[str] = Field(default=None, description="Date of birth of the document holder")

class CredentialSchema(BaseModel):
    degree: Optional[str] = Field(default=None, description="Name of the degree, professional credential, or certificate received")
    institution: Optional[str] = Field(default=None, description="Name of the university, college, school, or issuing body")
    year: Optional[str] = Field(default=None, description="Graduation year or date of certificate issuance")
    cgpa: Optional[str] = Field(default=None, description="Cumulative Grade Point Average (CGPA), marks, or percentage attained")

class IssuerSchema(BaseModel):
    name: Optional[str] = Field(default=None, description="Name of the issuing organization, university, or signing authority")

class ConfidenceSchema(BaseModel):
    name: Optional[float] = Field(default=None, description="Confidence score (0 to 100) assessing extraction accuracy for the candidate/holder name")
    degree: Optional[float] = Field(default=None, description="Confidence score (0 to 100) assessing extraction accuracy for the credential/degree name")

class ExtractionSchema(BaseModel):
    """Target output schema that OpenAI LLM is strictly guided to output."""
    holder: HolderSchema = Field(default_factory=HolderSchema)
    credential: CredentialSchema = Field(default_factory=CredentialSchema)
    issuer: IssuerSchema = Field(default_factory=IssuerSchema)
    confidence: ConfidenceSchema = Field(default_factory=ConfidenceSchema)
    rawText: Optional[str] = Field(default=None, description="All readable text extracted directly from the document images by the AI.")

# ==========================================
# 2. Pydantic Schemas for FastAPI API Boundaries
# ==========================================

class DocumentCreateResponse(BaseModel):
    documentId: str
    filename: str
    status: str

    class Config:
        from_attributes = True

class DocumentResponse(BaseModel):
    id: str
    filename: str
    file_path: str
    status: str
    error_message: Optional[str] = None
    raw_text: Optional[str] = None
    extracted_data: Optional[Dict[str, Any]] = None
    layout_data: Optional[List[Dict[str, Any]]] = None
    created_at: datetime

    class Config:
        from_attributes = True
