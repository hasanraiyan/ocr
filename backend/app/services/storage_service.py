import os
import mimetypes
from typing import Optional


class StorageService:
    """Uploads files to Supabase Storage and returns public URLs.
    Falls back to None if SUPABASE_URL / SUPABASE_SERVICE_KEY are not set (local dev).
    """

    BUCKET = "documents"
    _client = None

    @classmethod
    def _get_client(cls):
        if cls._client is None:
            from supabase import create_client
            from app.core.config import settings
            cls._client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        return cls._client

    @classmethod
    def upload_file(cls, local_path: str, remote_filename: str) -> Optional[str]:
        """Synchronous upload (run via asyncio.to_thread from async callers).
        Returns the public URL on success, None if storage is not configured or upload fails.
        """
        from app.core.config import settings
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
            return None

        try:
            mime_type, _ = mimetypes.guess_type(local_path)
            mime_type = mime_type or "application/octet-stream"

            client = cls._get_client()
            with open(local_path, "rb") as f:
                client.storage.from_(cls.BUCKET).upload(
                    path=remote_filename,
                    file=f.read(),
                    file_options={"content-type": mime_type, "upsert": "true"}
                )
            return client.storage.from_(cls.BUCKET).get_public_url(remote_filename)
        except Exception as e:
            print(f"[StorageService] Upload failed, falling back to local: {e}")
            return None
