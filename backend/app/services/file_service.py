import os
from fastapi import UploadFile, HTTPException
import fitz  # PyMuPDF

class FileService:

    @staticmethod
    def validate_file(file: UploadFile) -> str:
        file.file.seek(0, 2)
        size = file.file.tell()
        file.file.seek(0)

        MAX_SIZE = 10 * 1024 * 1024
        if size > MAX_SIZE:
            raise HTTPException(status_code=400, detail="File size exceeds maximum limit of 10MB.")

        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in [".pdf", ".jpg", ".jpeg", ".png"]:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload a PDF, PNG, or JPG.")

        return ext

    @staticmethod
    def get_pdf_page_count(pdf_path: str) -> int:
        doc = fitz.open(pdf_path)
        count = len(doc)
        doc.close()
        return count

    @staticmethod
    def rasterize_pdf_page(pdf_path: str, page_num: int, output_dir: str) -> str:
        doc = fitz.open(pdf_path)
        page = doc.load_page(page_num)

        zoom = 3.0
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat)

        os.makedirs(output_dir, exist_ok=True)
        out_path = os.path.join(output_dir, f"page_{page_num}.png")
        pix.save(out_path)
        doc.close()

        return out_path
