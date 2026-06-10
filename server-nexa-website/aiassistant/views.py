from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from pathlib import Path

try:
    import chromadb
    from sentence_transformers import SentenceTransformer
except Exception:
    chromadb = None
    SentenceTransformer = None

@csrf_exempt
def retrieve(request):
    """Return top-k site snippets for a query. Optionally call an LLM if OPENAI_API_KEY is set (not included by default)."""
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    body = json.loads(request.body.decode("utf-8"))
    query = body.get("query")
    k = int(body.get("k", 5))
    if not query:
        return JsonResponse({"error": "query required"}, status=400)

    if chromadb is None or SentenceTransformer is None:
        return JsonResponse({"error": "chromadb or sentence-transformers not installed on server"}, status=500)

    client = chromadb.Client()
    coll = client.get_collection("site_docs")
    model = SentenceTransformer("all-MiniLM-L6-v2")
    q_emb = model.encode([query])[0]

    res = coll.query(query_embeddings=[q_emb.tolist() if hasattr(q_emb, 'tolist') else q_emb], n_results=k)

    docs = []
    for doc, meta, dist in zip(res.get('documents', [[]])[0], res.get('metadatas', [[]])[0], res.get('distances', [[]])[0]):
        docs.append({
            "text": doc,
            "source": meta.get('source'),
            "distance": dist,
        })

    return JsonResponse({"query": query, "results": docs})
