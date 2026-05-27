import cv2
import numpy as np
import os

class PreprocessingService:
    """
    OpenCV powered image processing suite to clean documents,
    correct deskews, and maximize EasyOCR accuracy.
    """

    @staticmethod
    def deskew_image(image: np.ndarray) -> np.ndarray:
        """
        Calculates text orientation angle via minimum area bounding rectangles
        and rotates the image to achieve horizontal alignment.
        """
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()

        # Invert colors and apply Otsu thresholding to highlight text blocks
        thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]

        # Fetch coordinates of all non-zero pixels (the text)
        coords = np.column_stack(np.where(thresh > 0))
        
        if len(coords) == 0:
            return image

        # Get minimum area bounding rectangle
        angle = cv2.minAreaRect(coords)[-1]

        # Adjust angle range to [-45, 45] degrees
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle

        # Ignore minor or extreme false-skew detections
        if abs(angle) < 0.2 or abs(angle) > 20.0:
            return image

        # Rotate the image
        (h, w) = image.shape[:2]
        center = (w // 2, h // 2)
        rotation_matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
        
        # Warp using cubic interpolation and replicate border pixels
        rotated = cv2.warpAffine(
            image, 
            rotation_matrix, 
            (w, h), 
            flags=cv2.INTER_CUBIC, 
            borderMode=cv2.BORDER_REPLICATE
        )
        
        return rotated

    @staticmethod
    def preprocess_image(image_path: str, enhanced: bool = False) -> str:
        """
        Preprocesses a document image to optimize OCR legibility:
        - Deskews orientation.
        - Converts to standard grayscale.
        - Applies a bilateral filter (denoises while maintaining sharp character edges).
        - If enhanced is True (retry mode), applies CLAHE contrast equalization.
        """
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not load image file from: {image_path}")

        # Correct skew
        img_deskewed = PreprocessingService.deskew_image(img)

        # Grayscale
        gray = cv2.cvtColor(img_deskewed, cv2.COLOR_BGR2GRAY)

        # Bilateral Filtering (Denoise while preserving sharp character contours)
        denoised = cv2.bilateralFilter(gray, 9, 75, 75)

        if enhanced:
            # Contrast Limited Adaptive Histogram Equalization (CLAHE)
            # Great for shadow removal, uneven illumination, and faded scans
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            processed = clahe.apply(denoised)
        else:
            processed = denoised

        # Write clean output file
        dir_name, file_name = os.path.split(image_path)
        prefix = "enhanced_" if enhanced else "clean_"
        output_path = os.path.join(dir_name, prefix + file_name)
        
        cv2.imwrite(output_path, processed)
        return output_path
