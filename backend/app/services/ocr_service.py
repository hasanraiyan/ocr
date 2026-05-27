import easyocr
from typing import Tuple, List, Dict, Any

class OCRService:
    """
    Coordinates layout-aware character recognition via EasyOCR.
    Utilizes a singleton loader to prevent repeated CPU model initialization.
    """
    _reader = None

    @classmethod
    def get_reader(cls) -> easyocr.Reader:
        """Initializes and returns the EasyOCR Reader instance as a lazy singleton."""
        if cls._reader is None:
            # Configured for English text extraction.
            # Runs on CPU by default to ensure out-of-the-box system compatibility.
            cls._reader = easyocr.Reader(['en'], gpu=False)
        return cls._reader

    @classmethod
    def read_layout(cls, image_path: str) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Ingests a cleaned document page image, running neural net text detection.
        Returns:
            - A clean combined text string representing all read paragraphs.
            - A list of bounding boxes containing coordinate corners, text strings, and confidence percentages.
        """
        reader = cls.get_reader()

        # easyocr output structure: [([[x1, y1], [x2, y2], [x3, y3], [x4, y4]], "text", confidence_score), ...]
        ocr_results = reader.readtext(image_path)

        text_lines = []
        layout_elements = []

        for bbox, text, confidence in ocr_results:
            clean_text = text.strip()
            if not clean_text:
                continue

            text_lines.append(clean_text)

            # Map corners to simple coordinate list arrays: [[tl], [tr], [br], [bl]]
            coordinates = [[int(corner[0]), int(corner[1])] for corner in bbox]

            layout_elements.append({
                "box": coordinates,
                "text": clean_text,
                "confidence": round(float(confidence) * 100, 1)  # Format as a percentage (e.g. 98.5)
            })

        combined_text = "\n".join(text_lines)
        return combined_text, layout_elements
