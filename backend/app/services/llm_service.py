import base64
from typing import List
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from app.schemas.document import ExtractionSchema

class LLMService:
    """
    Orchestrates LangChain-native multimodal entity extraction using langchain-google-genai.
    Combines .with_structured_output() with base64 data URIs to perfectly satisfy
    both input-side driver checks (startswith) and output-side Pydantic validations.
    """

    @classmethod
    async def extract_structured_data(
        cls, 
        text: str, 
        base64_images: List[str], 
        api_key: str
    ) -> dict:
        """
        Invokes the LangChain Google GenAI model with both the OCR text and 
        base64 data URIs, enforcing structured extraction using native model parsing.
        """
        if not api_key or "your_gemini" in api_key:
            raise ValueError(
                "Gemini API key is not configured. "
                "Please add a valid 'GEMINI_API_KEY' inside your backend/.env file."
            )

        # 1. Initialize LangChain ChatGoogleGenerativeAI model
        llm = ChatGoogleGenerativeAI(
            google_api_key=api_key,
            model="gemini-3.5-flash",
            temperature=0.0,
            max_retries=3
        )

        # 2. Compile structured extraction model natively in LangChain
        # This completely bypasses the buggy string-generation output code path!
        structured_llm = llm.with_structured_output(ExtractionSchema)

        # 3. System message containing instructions
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
            "3. If a field is missing, set its value to null. Do not fabricate or guess any data.\n"
            "4. Estimate your confidence (integer 0-100) per field based on visual and layout clarity."
        )

        # 4. Construct Human Content list (passing Text + base64 data URIs)
        human_content = [
            {"type": "text", "text": f"Document OCR Raw Text:\n---\n{text}\n---"}
        ]

        # Inject base64 data URIs. 
        # This satisfies the input-side startswith() checks inside langchain-google-genai perfectly!
        for b64_img in base64_images:
            human_content.append({
                "type": "image_url",
                "image_url": f"data:image/png;base64,{b64_img}"
            })

        # 5. Assemble standard LangChain messages
        messages = [
            SystemMessage(content=system_instruction),
            HumanMessage(content=human_content)
        ]

        # 6. Async invoke structured LangChain model and parse Pydantic output
        response_model = await structured_llm.ainvoke(messages)

        # 7. Convert Pydantic object safely back to dictionary format
        result_dict = {}
        if response_model:
            if hasattr(response_model, "model_dump"):
                result_dict = response_model.model_dump()
            elif hasattr(response_model, "dict"):
                result_dict = response_model.dict()
            else:
                result_dict = dict(response_model)

        # Safeguard: Attach raw text if missing in the parsed output
        if isinstance(result_dict, dict):
            if "rawText" not in result_dict or not result_dict["rawText"]:
                result_dict["rawText"] = text

        return result_dict
