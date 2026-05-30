import base64
from typing import List
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_openai import ChatOpenAI
from app.schemas.document import ExtractionSchema

class LLMService:

    @classmethod
    async def extract_structured_data(
        cls,
        base64_images: List[str],
        api_key: str,
        model: str = "openai-large",
        base_url: str = ""
    ) -> dict:
        if not api_key or "your_openai" in api_key:
            raise ValueError(
                "OpenAI API key is not configured. "
                "Please add a valid 'OPENAI_API_KEY' inside your backend/.env file."
            )

        llm_kwargs = {
            "api_key": api_key,
            "model": model,
            "temperature": 0.0,
            "max_retries": 3,
        }
        if base_url:
            llm_kwargs["base_url"] = base_url

        llm = ChatOpenAI(**llm_kwargs)

        structured_llm = llm.with_structured_output(ExtractionSchema)

        system_instruction = (
            "You are an expert document processing AI. Analyze the provided document images "
            "and extract clean, structured JSON.\n\n"
            "INSTRUCTIONS:\n"
            "1. Read all text visible in the document images directly.\n"
            "2. Standardize dates to YYYY-MM-DD if possible.\n"
            "3. If a field is missing, set its value to null. Do not fabricate or guess any data.\n"
            "4. Estimate your confidence (integer 0-100) per field based on visual clarity.\n"
            "5. In rawText, include all readable text you can extract from the document."
        )

        human_content = []
        for b64_img in base64_images:
            human_content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/png;base64,{b64_img}"}
            })

        messages = [
            SystemMessage(content=system_instruction),
            HumanMessage(content=human_content)
        ]

        response_model = await structured_llm.ainvoke(messages)

        result_dict = {}
        if response_model:
            if hasattr(response_model, "model_dump"):
                result_dict = response_model.model_dump()
            elif hasattr(response_model, "dict"):
                result_dict = response_model.dict()
            else:
                result_dict = dict(response_model)

        if isinstance(result_dict, dict):
            if "confidence" in result_dict and isinstance(result_dict["confidence"], dict):
                conf = result_dict["confidence"]
                normalized_conf = {}

                if "name" in conf and conf["name"] is not None:
                    normalized_conf["name"] = conf["name"]
                elif "holder.name" in conf and conf["holder.name"] is not None:
                    normalized_conf["name"] = conf["holder.name"]
                else:
                    normalized_conf["name"] = None

                if "degree" in conf and conf["degree"] is not None:
                    normalized_conf["degree"] = conf["degree"]
                elif "credential.degree" in conf and conf["credential.degree"] is not None:
                    normalized_conf["degree"] = conf["credential.degree"]
                else:
                    normalized_conf["degree"] = None

                result_dict["confidence"] = normalized_conf

        return result_dict
