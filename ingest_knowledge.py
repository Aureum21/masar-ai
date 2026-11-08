"""
ingest_knowledge.py  —  Masar AI Knowledge Base Ingestion Script

Run this script once (and periodically to refresh) to build the FAISS vector
database from all scraped official UAE tourism portal content.

Sources ingested:
  1. Visit Dubai (visitdubai.com)
  2. Visit Abu Dhabi (visitabudhabi.ae)
  3. UAE Government Portal / u.ae (u.ae)

Usage:
    python ingest_knowledge.py

Output:
    data/faiss_index/   ← persistent FAISS vector store ready for agents
"""

import os
import re
from pathlib import Path

from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from dotenv import load_dotenv

load_dotenv(override=True)

# ── Paths ────────────────────────────────────────────────────────────────────
SCRAPED_FILES = {
    "visit_dubai": Path("data/raw/visit_dubai.md"),
    "visit_abudhabi": Path("data/raw/visit_abudhabi.md"),
    "uae_gov": Path("data/raw/uae_gov.md"),
}
LEGACY_CULTURE_FILE = Path("data/uae_knowledge.txt")
INDEX_PATH = "data/faiss_index"


def clean_markdown(text: str) -> str:
    """Strip navigation noise while preserving rich, meaningful content."""
    lines = text.splitlines()
    cleaned = []
    seen = set()

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Remove lines that are ONLY URLs
        if re.match(r'^https?://\S+$', line):
            continue

        # Remove markdown link syntax BUT keep the label text if it's meaningful
        # [Label](url) → Label
        line = re.sub(r'\[([^\]]{4,})\]\(https?://[^\)]+\)', r'\1', line)
        # Remove leftover bare markdown links with no good label
        line = re.sub(r'\[([^\]]{1,3})\]\([^\)]+\)', '', line)
        # Remove any remaining bare URLs
        line = re.sub(r'https?://\S+', '', line).strip()

        # Skip if line is now empty or too short after cleaning
        if len(line) < 15:
            continue

        # Skip pure navigation noise patterns
        nav_noise = [
            'login', 'register', 'sign in', 'sign up', 'cookie',
            'javascript', 'skip to', 'back to top', '©', 'all rights reserved',
            'follow us', 'subscribe', 'newsletter', 'terms and conditions',
            'privacy policy', 'sitemap'
        ]
        if any(noise in line.lower() for noise in nav_noise):
            continue

        # Deduplicate identical lines
        line_key = line.lower()[:80]
        if line_key in seen:
            continue
        seen.add(line_key)

        cleaned.append(line)

    return '\n'.join(cleaned)


def load_documents() -> list[Document]:
    """Load all portal sources into LangChain Document objects."""
    docs = []

    # Load scraped portal files
    for source_name, path in SCRAPED_FILES.items():
        if path.exists():
            raw = path.read_text(encoding="utf-8")
            cleaned = clean_markdown(raw)
            docs.append(Document(
                page_content=cleaned,
                metadata={"source": source_name, "type": "official_portal"}
            ))
            print(f"  OK Loaded: {path} ({len(cleaned):,} chars)")
        else:
            print(f"  SKIP Not found (skipping): {path}")

    # Load legacy uae_culture.txt if it exists
    if LEGACY_CULTURE_FILE.exists():
        raw = LEGACY_CULTURE_FILE.read_text(encoding="utf-8")
        docs.append(Document(
            page_content=raw,
            metadata={"source": "uae_culture_legacy", "type": "curated_knowledge"}
        ))
        print(f"  OK Loaded legacy: {LEGACY_CULTURE_FILE}")

    return docs


def build_index(docs: list[Document]) -> FAISS:
    """Chunk documents and build a FAISS vector index."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=600,
        chunk_overlap=80,
        separators=["\n\n", "\n", ".", "!", "?", " "]
    )
    chunks = splitter.split_documents(docs)
    print(f"  [chunks] Total chunks: {len(chunks)}")

    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    print("  [embed] Generating embeddings (this may take a moment)...")
    store = FAISS.from_documents(chunks, embeddings)
    return store


def main():
    print("=" * 60)
    print("  Masar AI — Knowledge Base Ingestion")
    print("=" * 60)

    # Ensure output directory exists
    os.makedirs(INDEX_PATH, exist_ok=True)
    os.makedirs("data/raw", exist_ok=True)

    print("\n[load] Loading documents...")
    docs = load_documents()

    if not docs:
        print("\n[ERR] No documents found. Please ensure scraped files exist in data/raw/")
        return

    print(f"\n[build] Building FAISS index from {len(docs)} source documents...")
    store = build_index(docs)

    print(f"\n[save] Saving FAISS index to: {INDEX_PATH}/")
    store.save_local(INDEX_PATH)

    print("\n[DONE] Knowledge base successfully built!")
    print(f"   Index location: {INDEX_PATH}/")
    print(f"   Run the FastAPI server — agents will auto-load this index.\n")


if __name__ == "__main__":
    main()
