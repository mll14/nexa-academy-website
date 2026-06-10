import json
import logging
import re

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
try:
    from google import genai
except ImportError:
    genai = None

from .models import KnowledgeBase

logger = logging.getLogger(__name__)

GEMINI_MODEL = getattr(settings, "GEMINI_MODEL", "gemini-2.0-flash")

_EMOJI_RE = re.compile(
    "["
    "\U0001F600-\U0001F64F"
    "\U0001F300-\U0001F5FF"
    "\U0001F680-\U0001F6FF"
    "\U0001F1E0-\U0001F1FF"
    "\U00002702-\U000027B0"
    "\U000024C2-\U0001F251"
    "\U0001F900-\U0001F9FF"
    "\U0001FA00-\U0001FA6F"
    "\U0001FA70-\U0001FAFF"
    "]+",
    flags=re.UNICODE,
)

CONTACT_FALLBACK = (
    "I don't have that detail — please contact info@nexaacademy.co.ke or call +254713067311."
)

SYSTEM_PROMPT = """You are Nexa, the official admissions assistant for Nexa Academy — a tech training bootcamp in Nairobi, Kenya.

YOUR ROLE: Help prospective students learn about Nexa Academy's programs, fees, schedule, admissions process, and policies. You do not answer general tech questions or help with topics unrelated to Nexa Academy.

--- HOW TO HANDLE DIFFERENT INPUT TYPES ---

GREETINGS (hi, hello, hey, good morning, etc.):
Respond warmly and briefly. Example: "Hi! I'm Nexa, Nexa Academy's admissions assistant. Feel free to ask me about our programs, fees, how to apply, or anything else about Nexa Academy."

OFF-TOPIC QUESTIONS (weather, politics, general coding help, other schools, unrelated topics):
Politely decline and redirect. Example: "I can only help with questions about Nexa Academy — our programs, admissions, fees, and schedule. Is there something specific about Nexa Academy I can help you with?"

VAGUE OR INCOMPLETE INPUT (e.g. "tell me more", "what about fees", "and the course", "ok"):
Ask one short clarifying question to understand what the user needs. Reference specific programs from the LIVE DATA if helpful.

UNCLEAR OR MISSPELLED INPUT:
Interpret the most likely intent charitably and answer it. If the input is genuinely uninterpretable, ask: "Could you rephrase that? I want to make sure I give you accurate information."

QUESTIONS NOT COVERED BY THE PROVIDED DATA:
Reply: "I don't have that detail — please contact info@nexaacademy.co.ke or call +254713067311."

--- STRICT RULES FOR ALL RESPONSES ---
1. Answer ONLY from the LIVE DATA and KNOWLEDGE BASE CONTEXT provided. Never use outside knowledge or invent information.
2. Do NOT use emojis, emoticons, or decorative characters.
3. Do NOT use bullet symbols (*, •, or –). Use numbered lists or plain prose.
4. Keep answers under 150 words. Be direct and professional.
5. LIVE DATA always takes precedence over KNOWLEDGE BASE CONTEXT when they conflict.
6. Never invent or estimate prices, dates, seat counts, or program features not stated in the provided data.
7. When the answer relates to a specific page, end with its path (e.g. /programs or /apply). Skip this for greetings or redirects.
"""


def _get_gemini_client():
    api_key = getattr(settings, "GEMINI_API_KEY", "")
    if not api_key:
        return None
    return genai.Client(api_key=api_key)


def _build_live_context() -> str:
    """Pull current data from the database and format it as plain text for the prompt."""
    lines = []
    try:
        from programs.models import Program
        programs = Program.objects.filter(status="active").order_by("program_name")
        if programs.exists():
            lines.append("CURRENT PROGRAMS (live from database):")
            for p in programs:
                seats_left = None
                if p.max_students is not None:
                    seats_left = p.max_students - (p.current_enrolled or 0)
                duration_str = f"{p.duration} weeks" if p.duration else "N/A"
                price_str = f"KSh {int(p.price):,}" if p.price else "N/A"
                lines.append(
                    f"\n{p.program_name}"
                    f"\n  Slug: {getattr(p, 'slug', '')}"
                    f"\n  Duration: {duration_str}"
                    f"\n  Price: {price_str}"
                    f"\n  Level: {p.level}"
                    f"\n  Status: {p.status}"
                    + (f"\n  Seats available: {seats_left}" if seats_left is not None else "")
                    + (f"\n  Start date: {p.start_date.strftime('%B %d, %Y')}" if p.start_date else "")
                    + (f"\n  Description: {p.description[:300]}" if p.description else "")
                )
        else:
            lines.append("No active programs found in the database.")
    except Exception as exc:
        logger.warning("_build_live_context: could not load programs — %s", exc)
        lines.append("(Program data temporarily unavailable)")

    try:
        from programs.models import ProgramIntake
        intakes = ProgramIntake.objects.filter(status="open").select_related("program").order_by("start_date")
        if intakes.exists():
            lines.append("\nOPEN INTAKES:")
            for intake in intakes:
                deadline_str = (
                    intake.application_deadline.strftime("%B %d, %Y")
                    if intake.application_deadline else "N/A"
                )
                lines.append(
                    f"  {intake.program.program_name}: starts {intake.start_date.strftime('%B %d, %Y')}"
                    f", deadline {deadline_str}"
                    + (f", {intake.seats_remaining} seats remaining" if intake.seats_remaining is not None else "")
                )
    except Exception:
        pass

    return "\n".join(lines) if lines else "No live program data available."


def _build_kb_context() -> tuple[str, list[str]]:
    """Load all active KnowledgeBase entries from the ORM and return (context_text, source_urls)."""
    try:
        entries = KnowledgeBase.objects.filter(is_active=True).order_by("category", "title")
        if not entries.exists():
            return "", []
        context = "\n\n".join(
            f"[{e.category.upper()} — {e.title}]\n{e.content}"
            + (f"\nURL: {e.source_url}" if e.source_url else "")
            for e in entries
        )
        sources = list({e.source_url for e in entries if e.source_url})
        return context, sources
    except Exception as exc:
        logger.warning("_build_kb_context failed: %s", exc)
        return "", []


def _clean(text: str) -> str:
    return _EMOJI_RE.sub("", text).strip()


@csrf_exempt
@require_POST
def chat(request):
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Invalid JSON body."}, status=400)

    user_message = (body.get("message") or "").strip()
    if not user_message:
        return JsonResponse({"error": "message field is required."}, status=400)

    # Cap length to prevent prompt injection; preserve the full question including punctuation
    query = user_message[:600]

    logger.debug("[chat] query: %s", query)

    client = _get_gemini_client()
    if not client:
        fallback = _clean(CONTACT_FALLBACK)
        return JsonResponse({"answer": fallback, "reply": fallback, "sources": []}, status=200)

    live_context = _build_live_context()
    kb_context, all_sources = _build_kb_context()

    full_prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"--- LIVE DATA START ---\n{live_context}\n--- LIVE DATA END ---\n\n"
        + (f"--- KNOWLEDGE BASE CONTEXT START ---\n{kb_context}\n--- KNOWLEDGE BASE CONTEXT END ---\n\n" if kb_context else "")
        + f"User question: {query}\n\nAssistant:"
    )

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=full_prompt,
        )
        raw_answer = (response.text or "").strip()
        if not raw_answer:
            raise ValueError("Empty response from Gemini")
        answer = _clean(raw_answer)
        logger.debug("[chat] answer: %s", answer[:200])
    except Exception as exc:
        logger.error("[chat] Gemini call failed: %s", exc)
        fallback = _clean(CONTACT_FALLBACK)
        return JsonResponse({"answer": fallback, "reply": fallback, "sources": []})

    return JsonResponse({"answer": answer, "reply": answer, "sources": all_sources})
