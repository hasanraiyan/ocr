from typing import TypedDict, Optional, List, Dict, Any

class DocumentState(TypedDict):
    document_id: str
    file_path: str
    file_type: str
    status: str
    page_image_paths: List[str]
    extracted_data: Optional[Dict[str, Any]]
    error: Optional[str]
