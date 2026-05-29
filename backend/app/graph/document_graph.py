import os
import shutil
from sqlalchemy import update
from langgraph.graph import StateGraph, START, END

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.document import Document as DBDocument
from app.graph.state import DocumentState
from app.services.file_service import FileService
from app.services.llm_service import LLMService


async def persist_db_state(
    doc_id: str,
    status: str,
    error_message: str = None,
    raw_text: str = None,
    extracted_data: dict = None,
    layout_data: list = None
):
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


async def validate_file_node(state: DocumentState) -> DocumentState:
    doc_id = state["document_id"]
    file_path = state["file_path"]

    await persist_db_state(doc_id, "VALIDATING")

    ext = os.path.splitext(file_path)[1].lower()
    if ext not in [".pdf", ".png", ".jpg", ".jpeg"]:
        error_msg = "Unsupported file format. Please upload PDF, PNG, or JPG."
        await persist_db_state(doc_id, "FAILED", error_message=error_msg)
        state["error"] = error_msg
        state["status"] = "FAILED"
    else:
        state["status"] = "VALIDATING"

    return state


async def prepare_images_node(state: DocumentState) -> DocumentState:
    """Rasterizes PDF pages into images, or uses the image file directly."""
    if state.get("error"):
        return state

    doc_id = state["document_id"]
    file_path = state["file_path"]
    file_type = state["file_type"]

    await persist_db_state(doc_id, "CONVERTING")

    temp_dir = os.path.join(settings.UPLOAD_DIR, "temp_pages", doc_id)
    os.makedirs(temp_dir, exist_ok=True)

    try:
        if file_type == ".pdf":
            page_count = FileService.get_pdf_page_count(file_path)
            page_paths = []
            for i in range(page_count):
                page_path = FileService.rasterize_pdf_page(file_path, i, temp_dir)
                page_paths.append(page_path)
            state["page_image_paths"] = page_paths
        else:
            state["page_image_paths"] = [file_path]

        state["status"] = "CONVERTING"
    except Exception as e:
        error_msg = f"Failed to prepare document images: {str(e)}"
        await persist_db_state(doc_id, "FAILED", error_message=error_msg)
        state["error"] = error_msg
        state["status"] = "FAILED"

    return state


async def extract_with_llm_node(state: DocumentState) -> DocumentState:
    """Sends document images directly to Gemini for structured extraction."""
    if state.get("error"):
        return state

    doc_id = state["document_id"]
    await persist_db_state(doc_id, "AI_EXTRACTION")

    try:
        import base64
        base64_images = []
        for img_path in state["page_image_paths"]:
            if img_path and os.path.exists(img_path):
                with open(img_path, "rb") as f:
                    b64_str = base64.b64encode(f.read()).decode("utf-8")
                    base64_images.append(b64_str)

        extracted_data = await LLMService.extract_structured_data(
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
    if state.get("error"):
        return state

    doc_id = state["document_id"]

    raw_text = None
    if state.get("extracted_data") and "rawText" in state["extracted_data"]:
        raw_text = state["extracted_data"]["rawText"]

    await persist_db_state(
        doc_id=doc_id,
        status="COMPLETED",
        raw_text=raw_text,
        extracted_data=state["extracted_data"],
        layout_data=[]
    )

    temp_dir = os.path.join(settings.UPLOAD_DIR, "temp_pages", doc_id)
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir, ignore_errors=True)

    state["status"] = "COMPLETED"
    return state


workflow = StateGraph(DocumentState)

workflow.add_node("validate_file", validate_file_node)
workflow.add_node("prepare_images", prepare_images_node)
workflow.add_node("extract_with_llm", extract_with_llm_node)
workflow.add_node("save_result", save_result_node)

workflow.add_edge(START, "validate_file")
workflow.add_edge("validate_file", "prepare_images")
workflow.add_edge("prepare_images", "extract_with_llm")
workflow.add_edge("extract_with_llm", "save_result")
workflow.add_edge("save_result", END)

document_graph = workflow.compile()
