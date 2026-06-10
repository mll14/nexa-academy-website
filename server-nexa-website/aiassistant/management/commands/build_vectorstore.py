from django.core.management.base import BaseCommand
import os
import glob
from pathlib import Path

try:
    import chromadb
    from sentence_transformers import SentenceTransformer
except Exception:
    chromadb = None
    SentenceTransformer = None

CONTENT_PATHS = [
    # project docs and frontend docs (paths relative to repo root)
    "frontend documents",
    "nexa-website-client/src",
    "server-nexa-website/templates",
    "README.md",
]

class Command(BaseCommand):
    help = "Build a Chromadb vectorstore from site docs and templates"

    def handle(self, *args, **options):
        if chromadb is None or SentenceTransformer is None:
            self.stdout.write(self.style.ERROR("chromadb or sentence-transformers not installed. Install requirements and retry."))
            return

        client = chromadb.Client()
        collection_name = "site_docs"
        if collection_name in [c.name for c in client.list_collections()]:
            client.delete_collection(name=collection_name)
        collection = client.create_collection(name=collection_name)

        model = SentenceTransformer("all-MiniLM-L6-v2")

        docs = []
        ids = []
        metadatas = []

        # project root (one level above server-nexa-website)
        base_dir = Path(__file__).resolve().parents[4]

        for rel in CONTENT_PATHS:
            path = (base_dir / rel).resolve()
            if not path.exists():
                continue
            if path.is_file():
                files = [path]
            else:
                files = [Path(p) for p in glob.glob(str(path / "**" / "*.*"), recursive=True) if Path(p).suffix.lower() in {".md", ".html", ".txt", ".jsx", ".js", ".py"}]

            for f in files:
                try:
                    text = f.read_text(encoding="utf-8", errors="ignore")
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"Could not read {f}: {e}"))
                    continue
                # simple split: by paragraphs
                parts = [p.strip() for p in text.split("\n\n") if p.strip()]
                for i, p in enumerate(parts):
                    try:
                        rel = f.relative_to(base_dir)
                    except ValueError:
                        rel = f
                    doc_id = f"{rel}::{i}"
                    docs.append(p)
                    ids.append(doc_id)
                    metadatas.append({"source": str(rel)})

        self.stdout.write(self.style.NOTICE(f"Encoding {len(docs)} text chunks with sentence-transformers"))
        embeddings = model.encode(docs, show_progress_bar=True)

        self.stdout.write(self.style.NOTICE("Adding to chromadb collection"))
        collection.add(ids=ids, documents=docs, metadatas=metadatas, embeddings=embeddings.tolist() if hasattr(embeddings, 'tolist') else embeddings)

        self.stdout.write(self.style.SUCCESS(f"Indexed {len(ids)} chunks into Chromadb collection '{collection_name}'"))
