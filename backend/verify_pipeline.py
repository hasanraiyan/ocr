import asyncio
import io
import os
import sys

# Force stdout and stderr to use UTF-8 encoding with robust replacement fallback.
# This prevents Windows consoles (defaulting to cp1252/ASCII) from crashing
# when EasyOCR prints progress bars with block characters (like '█' / \u2588) during downloads.
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Ensure backend root is in the import path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.graph.document_graph import document_graph
from app.core.database import engine, Base
from app.services.ocr_service import OCRService

async def main():
    print("=" * 65)
    print("          DocuSense Backend Integration Verification")
    print("=" * 65)

    # 1. Test Database Initialization
    print("\n[1/3] Testing database engine connection & table schema initialization...")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("[OK] Database engine connected. Table schemas initialized successfully!")
    except Exception as e:
        print(f"[ERROR] Database connection failed: {type(e).__name__} - {str(e)}")
        print("\n💡 HINT: Did you forget to add your Supabase database password inside your backend/.env file?")
        return

    # 2. Test LangGraph Pipeline Compilation
    print("\n[2/3] Checking LangGraph orchestration compilation...")
    try:
        graph = document_graph
        print("[OK] LangGraph compiled successfully! Registered nodes in pipeline:")
        for node_name in sorted(graph.nodes.keys()):
            print(f"   - Node: {node_name}")
    except Exception as e:
        print(f"[ERROR] LangGraph loading failed: {str(e)}")
        return

    # 3. Test EasyOCR Loading (Downloads weights on first startup)
    print("\n[3/3] Asserting EasyOCR model engine loading...")
    print("      (Note: First load will download weights (~100MB) from repository)")
    try:
        # Triggers lazy loading of the neural network
        reader = OCRService.get_reader()
        print("[OK] EasyOCR model initialized successfully in memory!")
    except Exception as e:
        print(f"[ERROR] EasyOCR model loading failed: {type(e).__name__} - {str(e)}")
        return

    print("\n" + "=" * 65)
    print("[SUCCESS] INTEGRATION SUCCESSFUL: ALL SYSTEMS SECURED AND FUNCTIONAL!")
    print("=" * 65)

if __name__ == "__main__":
    # Handle Windows async loop policies gracefully
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
