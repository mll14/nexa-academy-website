# AI Assistant Index

This app provides the RAG knowledge source for the Nexa Academy chat assistant.

## Rebuild the index

Run this from `server-nexa-website/`:

```bash
python manage.py index_site
```

This refreshes the persisted ChromaDB collection in `./chroma_db` using:
- the static site facts in `chatbot/management/commands/index_site.py`
- live program data from the `Program` model

## Chat endpoint

The chat API is available at:

```http
POST /api/chat/
```

## Runtime env vars

The chat view reads these settings from Django configuration:
- `OLLAMA_URL` - Ollama generate endpoint, default `http://localhost:11434/api/generate`
- `OLLAMA_MODEL` - Ollama model name, default `llama3`

The site contact facts indexed by the assistant should match the live frontend routes and contact page:
- `/contact`
- `/programs`
- `/apply`
- `/faq`
