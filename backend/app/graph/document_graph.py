import os
import shutil
from sqlalchemy import update
from langgraph.graph import StateGraph, START, END

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.document import Document as DBDocument
from app.graph.state import DocumentState
from app.services.file_service import FileService
from app.services.preprocessing_service import PreprocessingService
from app.services.ocr_service import OCRService
from app.services.llm_service import LLMService

# ==========================================
# 1. Asynchronous Database Logging Helper
# ==========================================

async def persist_db_state(
    doc_id: str,
    status: str,
    error_message: str = None,
    raw_text: str = None,
    extracted_data: dict = None,
    layout_data: list = None
):
    """Asynchronously logs current pipeline execution details to SQLite."""
    async with SessionLocal() as session:
        async with session.begin():
            values = {"status": status}
            if error_message is not None:
                values["error_message"] = error_message
            if raw_text is not None:
                values["raw_text"] = raw_text
            if extracted_data is not None:
                values["extracted_data"] = extracted_data
            if layout_data is not None:
                values["layout_data"] = layout_data

            await session.execute(
                update(DBDocument)
                .where(DBDocument.id == doc_id)
                .values(**values)
            )

# ==========================================
# 2. Graph Nodes Implementation
# ==========================================

async def validate_file_node(state: DocumentState) -> DocumentState:
    """Node: Checks file constraints (size, extension)."""
    doc_id = state["document_id"]
    file_path = state["file_path"]
    
    await persist_db_state(doc_id, "VALIDATING")
    
    # We validate extension
    ext = os.path.splitext(file_path)[1].lower()
    if ext not in [".pdf", ".png", ".jpg", ".jpeg"]:
        error_msg = "Unsupported file format. Please upload PDF, PNG, or JPG."
        await persist_db_state(doc_id, "FAILED", error_message=error_msg)
        state["error"] = error_msg
        state["status"] = "FAILED"
    else:
        state["status"] = "VALIDATING"
        
    return state

async def convert_document_node(state: DocumentState) -> DocumentState:
    """Node: Converts document pages to standard LangChain Documents."""
    if state.get("error"):
        return state

    doc_id = state["document_id"]
    file_path = state["file_path"]
    file_type = state["file_type"]

    await persist_db_state(doc_id, "CONVERTING")
    
    try:
        documents = FileService.load_document(file_path, file_type)
        state["documents"] = documents
        state["status"] = "CONVERTING"
    except Exception as e:
        error_msg = f"Failed to load document: {str(e)}"
        await persist_db_state(doc_id, "FAILED", error_message=error_msg)
        state["error"] = error_msg
        state["status"] = "FAILED"
        
    return state

async def preprocess_images_node(state: DocumentState) -> DocumentState:
    """
    Node: Rasterizes PDF pages if needed and applies OpenCV enhancements.
    If retry_count > 0, applies CLAHE high-contrast enhancement.
    """
    if state.get("error"):
        return state

    doc_id = state["document_id"]
    await persist_db_state(doc_id, "PREPROCESSING")

    # Establish folder for temp processed images
    temp_dir = os.path.join(settings.UPLOAD_DIR, "temp_pages", doc_id)
    os.makedirs(temp_dir, exist_ok=True)
    
    enhanced = (state["retry_count"] > 0)
    
    try:
        for idx, doc in enumerate(state["documents"]):
            # Get original page image
            if state["file_type"] == ".pdf":
                page_img_path = FileService.rasterize_pdf_page(state["file_path"], idx, temp_dir)
            else:
                page_img_path = state["file_path"]
                
            # Perform OpenCV cleaning and deskewing
            clean_img_path = PreprocessingService.preprocess_image(page_img_path, enhanced=enhanced)
            
            # Save clean image path to document metadata
            doc.metadata["processed_image_path"] = clean_img_path
            doc.metadata["page_number"] = idx
            
        state["status"] = "PREPROCESSING"
    except Exception as e:
        error_msg = f"Preprocessing failure: {str(e)}"
        await persist_db_state(doc_id, "FAILED", error_message=error_msg)
        state["error"] = error_msg
        state["status"] = "FAILED"

    return state

async def run_ocr_node(state: DocumentState) -> DocumentState:
    """Node: Runs layout-aware EasyOCR on preprocessed document pages."""
    if state.get("error"):
        return state

    doc_id = state["document_id"]
    await persist_db_state(doc_id, "RUNNING_OCR")

    try:
        combined_text_lines = []
        for doc in state["documents"]:
            processed_path = doc.metadata.get("processed_image_path")
            if not processed_path:
                continue
                
            # Run EasyOCR
            page_text, layout_boxes = OCRService.read_layout(processed_path)
            
            # Save extracted text and layout coordinates in page Document metadata
            doc.page_content = page_text
            doc.metadata["layout"] = layout_boxes
            
            combined_text_lines.append(page_text)
            
        state["raw_text"] = "\n\n".join(combined_text_lines)
        state["status"] = "RUNNING_OCR"
    except Exception as e:
        error_msg = f"OCR execution failed: {str(e)}"
        await persist_db_state(doc_id, "FAILED", error_message=error_msg)
        state["error"] = error_msg
        state["status"] = "FAILED"

    return state

async def extract_with_llm_node(state: DocumentState) -> DocumentState:
    """Node: Runs LCEL ChatGoogleGenerativeAI structured parser on raw OCR text and page images."""
    if state.get("error"):
        return state

    doc_id = state["document_id"]
    await persist_db_state(doc_id, "AI_EXTRACTION")

    try:
        import base64
        # Load and base64-encode all preprocessed page images
        base64_images = []
        for doc in state["documents"]:
            processed_path = doc.metadata.get("processed_image_path")
            if processed_path and os.path.exists(processed_path):
                with open(processed_path, "rb") as image_file:
                    b64_str = base64.b64encode(image_file.read()).decode("utf-8")
                    base64_images.append(b64_str)

        # Structured Gemini multimodal extraction (sends BOTH text and images!)
        extracted_data = await LLMService.extract_structured_data(
            text=state["raw_text"], 
            base64_images=base64_images,
            api_key=settings.GEMINI_API_KEY
        )
        state["extracted_data"] = extracted_data
        state["status"] = "AI_EXTRACTION"
    except Exception as e:
        error_msg = f"AI extraction failed: {str(e)}"
        await persist_db_state(doc_id, "FAILED", error_message=error_msg)
        state["error"] = error_msg
        state["status"] = "FAILED"

    return state

async def save_result_node(state: DocumentState) -> DocumentState:
    """Node: Aggregates layout boxes and structures, completing the database record."""
    if state.get("error"):
        return state

    doc_id = state["document_id"]
    
    # Collect layout boxes across all pages
    aggregated_layout = []
    for doc in state["documents"]:
        page_num = doc.metadata.get("page_number", 0)
        page_layout = doc.metadata.get("layout", [])
        
        # Attach page indexes to boxes
        for item in page_layout:
            item["page"] = page_num
            aggregated_layout.append(item)
            
    await persist_db_state(
        doc_id=doc_id,
        status="COMPLETED",
        raw_text=state["raw_text"],
        extracted_data=state["extracted_data"],
        layout_data=aggregated_layout
    )
    
    # Clean up PDF temp pages folder
    temp_dir = os.path.join(settings.UPLOAD_DIR, "temp_pages", doc_id)
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir, ignore_errors=True)
        
    state["status"] = "COMPLETED"
    return state

# ==========================================
# 3. Conditional Quality Router & Retry Nodes
# ==========================================

def check_ocr_quality_edge(state: DocumentState) -> str:
    """
    Decides routing based on OCR quality:
    - If empty/low text characters (< 30 chars) and retries remain, triggers enhanced preprocessing retry.
    - Otherwise, proceeds directly to AI structured extraction.
    """
    if state.get("error"):
        return "end_workflow"

    char_count = len(state.get("raw_text", "").strip())
    retries = state.get("retry_count", 0)
    
    # Quality fallback: low characters triggers CLAHE enhancement pass
    if char_count < 30 and retries < 2:
        return "retry_preprocessing"
        
    return "extract_data"

async def increment_retry_node(state: DocumentState) -> DocumentState:
    """Node: Increments internal retry counts when routing back to pre-processing."""
    state["retry_count"] += 1
    return state

# ==========================================
# 4. Graph Construction and Compilation
# ==========================================

workflow = StateGraph(DocumentState)

# Add processing nodes
workflow.add_node("validate_file", validate_file_node)
workflow.add_node("convert_document", convert_document_node)
workflow.add_node("preprocess_images", preprocess_images_node)
workflow.add_node("run_ocr", run_ocr_node)
workflow.add_node("increment_retry", increment_retry_node)
workflow.add_node("extract_with_llm", extract_with_llm_node)
workflow.add_node("save_result", save_result_node)

# Compile static edges
workflow.add_edge(START, "validate_file")
workflow.add_edge("validate_file", "convert_document")
workflow.add_edge("convert_document", "preprocess_images")
workflow.add_edge("preprocess_images", "run_ocr")

# Compile conditional routing edge based on OCR text quality
workflow.add_conditional_edges(
    "run_ocr",
    check_ocr_quality_edge,
    {
        "retry_preprocessing": "increment_retry",
        "extract_data": "extract_with_llm",
        "end_workflow": END
    }
)

# Route the retry increment node back into the preprocessing step
workflow.add_edge("increment_retry", "preprocess_images")

# Finish the execution lifecycle
workflow.add_edge("extract_with_llm", "save_result")
workflow.add_edge("save_result", END)

# Final Compiled LangGraph
document_graph = workflow.compile()
