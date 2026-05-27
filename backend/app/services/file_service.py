import os
from typing import List
from fastapi import UploadFile, HTTPException
from langchain_core.documents import Document
from langchain_community.document_loaders import PyMuPDFLoader
import fitz  # PyMuPDF

class FileService:
    """
    Handles file verification, loading native PDF text,
    and rendering PDF pages as high-resolution images for OCR.
    """

    @staticmethod
    def validate_file(file: UploadFile) -> str:
        """Validates file size (limit 10MB) and file extension."""
        # Check size
        file.file.seek(0, 2)  # seek to end
        size = file.file.tell()
        file.file.seek(0)  # reset cursor

        MAX_SIZE = 10 * 1024 * 1024  # 10MB
        if size > MAX_SIZE:
            raise HTTPException(status_code=400, detail="File size exceeds maximum limit of 10MB.")

        # Check extension
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in [".pdf", ".jpg", ".jpeg", ".png"]:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload a PDF, PNG, or JPG.")

        return ext

    @staticmethod
    def load_document(file_path: str, file_type: str) -> List[Document]:
        """
        Loads document pages as a list of standard LangChain Document objects.
        For PDFs, leverages native text layers. For images, initializes a placeholder.
        """
        if file_type == ".pdf":
            loader = PyMuPDFLoader(file_path)
            return loader.load()
        else:
            return [Document(
                page_content="",
                metadata={
                    "source": file_path,
                    "page": 0,
                    "file_type": file_type
                }
            )]

    @staticmethod
    def rasterize_pdf_page(pdf_path: str, page_num: int, output_dir: str) -> str:
        """
        Rasterizes a single page of a PDF into a high-resolution (300 DPI) PNG
        suitable for image pre-processing and OCR.
        """
        doc = fitz.open(pdf_path)
        page = doc.load_page(page_num)

        # 300 DPI scale matrix
        zoom = 3.0
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat)

        os.makedirs(output_dir, exist_ok=True)
        out_path = os.path.join(output_dir, f"page_{page_num}.png")
        pix.save(out_path)
        doc.close()
        
        return out_path
