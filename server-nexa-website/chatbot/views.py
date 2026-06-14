import json
import logging
import re
import time

import requests
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

try:
    from google import genai
except ImportError:
    genai = None

logger = logging.getLogger(__name__)

GEMINI_MODEL = getattr(settings, "GEMINI_MODEL", "gemini-1.5-flash")
_SANITY_CACHE: dict = {"context": "", "ts": 0.0}
_CACHE_TTL = 300  # seconds
_SANITY_API_VERSION = "2024-01-01"

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
Ask one short clarifying question to understand what the user needs. Reference specific programs from the CMS DATA if helpful.

UNCLEAR OR MISSPELLED INPUT:
Interpret the most likely intent charitably and answer it. If the input is genuinely uninterpretable, ask: "Could you rephrase that? I want to make sure I give you accurate information."

QUESTIONS NOT COVERED BY THE PROVIDED DATA:
Reply: "I don't have that detail — please contact info@nexaacademy.co.ke or call +254713067311."

--- STRICT RULES FOR ALL RESPONSES ---
1. Answer ONLY from the CMS DATA provided below. Never use outside knowledge or invent information.
2. Do NOT use emojis, emoticons, or decorative characters.
3. Do NOT use bullet symbols (*, or -). Use numbered lists or plain prose.
4. Keep answers under 150 words. Be direct and professional.
5. Never invent or estimate prices, dates, seat counts, or program features not stated in the provided data.
6. When the answer relates to a specific page, end with its path (e.g. /programs or /apply). Skip this for greetings or redirects.
"""


def _sanity_query(groq: str) -> list:
    project_id = getattr(settings, "SANITY_PROJECT_ID", "")
    dataset = getattr(settings, "SANITY_DATASET", "production")
    token = getattr(settings, "SANITY_API_TOKEN", "")
    if not project_id:
        logger.warning("_sanity_query: SANITY_PROJECT_ID not configured")
        return []

    url = f"https://{project_id}.api.sanity.io/v{_SANITY_API_VERSION}/data/query/{dataset}"
    headers = {"Authorization": f"Bearer {token}"} if token else {}

    try:
        resp = requests.get(url, params={"query": groq}, headers=headers, timeout=8)
        resp.raise_for_status()
        return resp.json().get("result", [])
    except Exception as exc:
        logger.warning("_sanity_query failed: %s", exc)
        return []


def _pt_to_text(blocks) -> str:
    """Flatten Sanity Portable Text blocks to a plain string."""
    if not blocks or not isinstance(blocks, list):
        return ""
    parts = []
    for block in blocks:
        if isinstance(block, dict) and block.get("_type") == "block":
            for child in block.get("children", []):
                if isinstance(child, dict):
                    parts.append(child.get("text", ""))
    return " ".join(filter(None, parts)).strip()


def _build_sanity_context() -> str:
    now = time.monotonic()
    if _SANITY_CACHE["context"] and now - _SANITY_CACHE["ts"] < _CACHE_TTL:
        return _SANITY_CACHE["context"]

    lines = []

    # Programs
    programs = _sanity_query(
        '*[_type == "program" && isActive == true] | order(order asc) {'
        '  name, "slug": slug.current, price, originalPrice,'
        '  durationMonths, level, comingSoon, heroSubtitle,'
        '  outcomes, paymentNote,'
        '  paymentPlans[]{ title, description },'
        '  faqItems[]{ question, answer },'
        '  modules[]{ title, isBonus }'
        "}"
    )

    if programs:
        lines.append("CURRENT PROGRAMS (live from CMS):")
        for p in programs:
            name = p.get("name", "")
            slug = p.get("slug", "")
            price = p.get("price")
            original_price = p.get("originalPrice")
            duration = p.get("durationMonths")
            level = p.get("level", "")
            coming_soon = p.get("comingSoon", False)
            subtitle = p.get("heroSubtitle", "")
            payment_note = p.get("paymentNote", "")

            price_str = f"KSh {int(price):,}" if price else "N/A"
            if original_price and original_price != price:
                price_str += f" (originally KSh {int(original_price):,})"

            block = [
                f"\n{name}",
                f"  Page: /programs/{slug}" if slug else "",
                f"  Price: {price_str}",
                f"  Duration: {duration} months" if duration else "  Duration: N/A",
                f"  Level: {level}" if level else "",
                f"  Status: {'Coming soon' if coming_soon else 'Enrolling now'}",
                f"  About: {subtitle}" if subtitle else "",
                f"  Payment note: {payment_note}" if payment_note else "",
            ]

            outcomes = p.get("outcomes") or []
            if outcomes:
                block.append(f"  Learning outcomes: {'; '.join(outcomes)}")

            plans = p.get("paymentPlans") or []
            if plans:
                plan_strs = [
                    pl.get("title", "") + (f" — {pl['description']}" if pl.get("description") else "")
                    for pl in plans
                ]
                block.append(f"  Payment plans: {'; '.join(plan_strs)}")

            modules = p.get("modules") or []
            core = [m["title"] for m in modules if not m.get("isBonus") and m.get("title")]
            if core:
                block.append(f"  Core modules: {', '.join(core)}")

            for faq in (p.get("faqItems") or []):
                q = faq.get("question", "")
                raw_ans = faq.get("answer", "")
                a = _pt_to_text(raw_ans) if isinstance(raw_ans, list) else str(raw_ans or "")
                if q and a:
                    block.append(f"  Q: {q} | A: {a[:300]}")

            lines.append("\n".join(line for line in block if line))
    else:
        lines.append("(Program data temporarily unavailable)")

    # FAQs
    faqs = _sanity_query(
        '*[_type == "faq" && isActive == true] | order(sortOrder asc) {'
        "  question, answer, category"
        "}"
    )

    if faqs:
        lines.append("\nFREQUENTLY ASKED QUESTIONS:")
        for faq in faqs:
            q = faq.get("question", "")
            a = faq.get("answer", "")
            cat = faq.get("category", "general")
            if q and a:
                lines.append(f"  [{cat.upper()}] Q: {q}\n  A: {a}")

    result = "\n".join(lines) if lines else "No CMS data available."
    _SANITY_CACHE["context"] = result
    _SANITY_CACHE["ts"] = now
    return result


def _get_gemini_client():
    api_key = getattr(settings, "GEMINI_API_KEY", "")
    if not api_key or genai is None:
        return None
    return genai.Client(api_key=api_key)


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

    query = user_message[:600]
    logger.debug("[chat] query: %s", query)

    client = _get_gemini_client()
    if not client:
        fallback = _clean(CONTACT_FALLBACK)
        return JsonResponse({"answer": fallback, "reply": fallback, "sources": []}, status=200)

    cms_context = _build_sanity_context()

    full_prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"--- CMS DATA START ---\n{cms_context}\n--- CMS DATA END ---\n\n"
        f"User question: {query}\n\nAssistant:"
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

    return JsonResponse({"answer": answer, "reply": answer, "sources": []})
