import base64
from typing import List
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.output_parsers import JsonOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI
from app.schemas.document import ExtractionSchema

class LLMService:
    """
    Orchestrates LangChain-native multimodal entity extraction using Google Gemini models.
    Ingests BOTH raw OCR text and high-res page images to achieve maximum extraction accuracy.
    """

    @classmethod
    async def extract_structured_data(
        cls, 
        text: str, 
        base64_images: List[str], 
        api_key: str
    ) -> dict:
        """
        Asynchronously invokes Gemini with both the extracted OCR text AND 
        the original page images, forcing strict compliance to the ExtractionSchema.
        """
        if not api_key or "your_gemini" in api_key:
            raise ValueError(
                "Gemini API key is not configured. "
                "Please add a valid 'GEMINI_API_KEY' inside your backend/.env file."
            )

        # 1. Initialize Gemini Multimodal LLM
        llm = ChatGoogleGenerativeAI(
            google_api_key=api_key,
            model="gemini-3.5-flash",  # Multimodal flash model
            temperature=0.0,            # High determinism
            max_retries=3
        )

        # 2. Initialize JSON Output Parser
        parser = JsonOutputParser(pydantic_object=ExtractionSchema)
        format_instructions = parser.get_format_instructions()

        # 3. Construct System Message with instructions
        system_instruction = (
            "You are an expert document processing AI. Your goal is to analyze the provided document "
            "and extract clean, structured JSON.\n\n"
            
            "INPUT DETAILS:\n"
            "You are provided with BOTH:\n"
            "1. The raw text extracted by an OCR engine.\n"
            "2. The original document page images.\n\n"
            
            "Use the visual page images to verify spelling, layout, and correct any characters "
            "the OCR engine might have read incorrectly (e.g. OCR typos, misread letters).\n\n"
            
            "INSTRUCTIONS:\n"
            "1. Correct obvious OCR reading errors based on the visual image.\n"
            "2. Standardize dates to YYYY-MM-DD if possible.\n"
            "3. If a field is missing, set it to null. Do not fabricate any information.\n"
            "4. Estimate your confidence (integer 0-100) per field based on visual and layout clarity.\n\n"
            
            f"You must respond ONLY with a valid JSON object matching the format instructions below:\n{format_instructions}"
        )

        # 4. Construct Human Multimodal Message
        human_content = [
            {"type": "text", "text": f"Document OCR Raw Text:\n---\n{text}\n---"}
        ]

        # Inject base64 images into the multimodal payload
        for idx, b64_img in enumerate(base64_images):
            # easyocr processes pages sequentially, so we map them in order
            human_content.append({
                "type": "image_url",
                "image_url": f"data:image/png;base64,{b64_img}"
            })

        # 5. Assemble standard LangChain messages
        messages = [
            SystemMessage(content=system_instruction),
            HumanMessage(content=human_content)
        ]

        # 6. Async invoke Gemini & parse standard output
        response = await llm.ainvoke(messages)
        result_dict = parser.parse(response.content)

        # Safeguard: Attach raw text if missing in the parsed output
        if isinstance(result_dict, dict):
            if "rawText" not in result_dict or not result_dict["rawText"]:
                result_dict["rawText"] = text

        return result_dict
