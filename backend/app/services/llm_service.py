from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI
from app.schemas.document import ExtractionSchema

class LLMService:
    """
    Orchestrates LangChain-native entity extraction using Google Gemini models.
    Assembles standard LCEL pipelines to process unstructured OCR outputs.
    """

    @staticmethod
    def get_extraction_chain(api_key: str):
        """
        Compiles and returns a standard LangChain Expression Language (LCEL) chain:
        PromptTemplate | ChatGoogleGenerativeAI | JsonOutputParser
        """
        # Configure standard Gemini Model via official LangChain Google provider
        llm = ChatGoogleGenerativeAI(
            google_api_key=api_key,
            model="gemini-3.5-flash",  # High-speed multimodal LLM optimized for structured returns
            temperature=0.0,            # Zero temperature ensures maximum extraction determinism
            max_retries=3
        )

        # Standard parser leveraging our Pydantic ExtractionSchema
        parser = JsonOutputParser(pydantic_object=ExtractionSchema)

        # Robust system instructions guiding structured mapping and spelling correction
        prompt = ChatPromptTemplate.from_messages([
            ("system", (
                "You are an expert document processing AI. Your goal is to analyze noisy, raw unstructured OCR text "
                "from identity documents, degree certificates, and marksheets, and extract clean, structured JSON.\n\n"
                
                "INSTRUCTIONS:\n"
                "1. Correct obvious OCR reading errors (e.g. 'J0hn' -> 'John', 'Unlversity' -> 'University') based on context.\n"
                "2. Standardize dates to ISO format (YYYY-MM-DD) if possible. Otherwise, preserve the text.\n"
                "3. If a field is missing, set it to null. Do not fabricate or guess any data.\n"
                "4. Estimate your confidence (integer score 0-100) per field based on text quality and layout clarity.\n\n"
                
                "You must respond ONLY with a valid JSON object matching the format instructions below:\n"
                "{format_instructions}"
            )),
            ("user", "Document OCR Raw Text:\n---\n{context}\n---")
        ])

        return prompt | llm | parser

    @classmethod
    async def extract_structured_data(cls, text: str, api_key: str) -> dict:
        """
        Invokes the compiled LCEL chain asynchronously, feeding the raw OCR context 
        and returning a cleanly parsed dictionary structure.
        """
        if not api_key or "your_gemini" in api_key:
            raise ValueError(
                "Gemini API key is not configured. "
                "Please add a valid 'GEMINI_API_KEY' inside your backend/.env file."
            )

        chain = cls.get_extraction_chain(api_key)

        # Fetch strict formatting guidelines injected by the JsonOutputParser
        parser = chain.steps[-1]  # JsonOutputParser is the last step
        format_instructions = parser.get_format_instructions()

        # Invoke the LangChain pipeline asynchronously
        result_dict = await chain.ainvoke({
            "context": text,
            "format_instructions": format_instructions
        })

        # Safeguard: Attach raw text if missing in the parsed output
        if isinstance(result_dict, dict):
            if "rawText" not in result_dict or not result_dict["rawText"]:
                result_dict["rawText"] = text

        return result_dict
