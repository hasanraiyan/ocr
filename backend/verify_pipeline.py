import asyncio
import os
import sys

sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.graph.document_graph import document_graph
from app.core.database import engine, Base

async def main():
    print("=" * 65)
    print("          DocuSense Backend Integration Verification")
    print("=" * 65)

    # 1. Test Database Initialization
    print("\n[1/2] Testing database engine connection & table schema initialization...")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("[OK] Database engine connected. Table schemas initialized successfully!")
    except Exception as e:
        print(f"[ERROR] Database connection failed: {type(e).__name__} - {str(e)}")
        print("\nHINT: Did you forget to add your database password inside your backend/.env file?")
        return

    # 2. Test LangGraph Pipeline Compilation
    print("\n[2/2] Checking LangGraph orchestration compilation...")
    try:
        graph = document_graph
        print("[OK] LangGraph compiled successfully! Registered nodes in pipeline:")
        for node_name in sorted(graph.nodes.keys()):
            print(f"   - Node: {node_name}")
    except Exception as e:
        print(f"[ERROR] LangGraph loading failed: {str(e)}")
        return

    print("\n" + "=" * 65)
    print("[SUCCESS] ALL SYSTEMS FUNCTIONAL!")
    print("=" * 65)

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
