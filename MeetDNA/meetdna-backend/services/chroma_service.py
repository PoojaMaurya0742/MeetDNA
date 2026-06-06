import logging
import os
from typing import Any

import chromadb
from chromadb.config import Settings

logger = logging.getLogger(__name__)

COLLECTION_NAME = "meetdna_memories"


class ChromaService:
    def __init__(self) -> None:
        persist_dir = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
        self.client = chromadb.PersistentClient(
            path=persist_dir,
            settings=Settings(anonymized_telemetry=False),
        )
        self._collection = None

    def ensure_collection(self) -> None:
        try:
            self._collection = self.client.get_or_create_collection(
                name=COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"},
            )
            logger.info("ChromaDB collection '%s' ready", COLLECTION_NAME)
        except Exception as exc:
            logger.error("Failed to initialize ChromaDB collection: %s", exc)
            raise

    @property
    def collection(self):
        if self._collection is None:
            self.ensure_collection()
        return self._collection

    def _serialize_metadata(self, metadata: dict[str, Any]) -> dict[str, str | int | float | bool]:
        serialized: dict[str, str | int | float | bool] = {}
        for key, value in metadata.items():
            if value is None:
                serialized[key] = ""
            elif isinstance(value, (str, int, float, bool)):
                serialized[key] = value
            elif isinstance(value, list):
                serialized[key] = ",".join(str(v) for v in value)
            else:
                serialized[key] = str(value)
        return serialized

    def add_memory(self, memory_id: str, content: str, metadata: dict[str, Any]) -> None:
        try:
            self.collection.add(
                documents=[content],
                metadatas=[self._serialize_metadata(metadata)],
                ids=[memory_id],
            )
        except Exception as exc:
            logger.error("ChromaDB add failed: %s", exc)
            raise

    def delete_memory(self, memory_id: str) -> None:
        try:
            self.collection.delete(ids=[memory_id])
        except Exception as exc:
            logger.error("ChromaDB delete failed: %s", exc)
            raise

    def query(
        self,
        query_text: str,
        n_results: int = 5,
        where: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        try:
            kwargs: dict[str, Any] = {
                "query_texts": [query_text],
                "n_results": n_results,
            }
            if where:
                kwargs["where"] = where

            results = self.collection.query(**kwargs)
            memories: list[dict[str, Any]] = []
            if not results or not results.get("ids"):
                return memories

            ids = results["ids"][0]
            documents = results["documents"][0] if results.get("documents") else []
            metadatas = results["metadatas"][0] if results.get("metadatas") else []
            distances = results["distances"][0] if results.get("distances") else []

            for i, memory_id in enumerate(ids):
                meta = metadatas[i] if i < len(metadatas) else {}
                if isinstance(meta, dict) and "keywords" in meta and isinstance(meta["keywords"], str):
                    meta = dict(meta)
                    meta["keywords"] = [k for k in meta["keywords"].split(",") if k]
                memories.append(
                    {
                        "id": memory_id,
                        "content": documents[i] if i < len(documents) else "",
                        "metadata": meta,
                        "relevance_score": 1 - distances[i] if i < len(distances) else 0.0,
                    }
                )
            return memories
        except Exception as exc:
            logger.error("ChromaDB query failed: %s", exc)
            raise


chroma_service = ChromaService()
