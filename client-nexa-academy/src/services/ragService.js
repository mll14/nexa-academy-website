/**
 * ragService.js
 *
 * Replaces geminiService.  All chat requests are routed to the local Django
 * RAG endpoint (/api/chat/) which queries ChromaDB + Ollama — no API keys needed.
 */

// VITE_API_URL already includes the /api prefix (e.g. https://api.nexaacademy.co.ke/api)
const API_BASE = import.meta.env.VITE_API_URL || "";

class RagService {
  constructor() {
    this.chatHistory = []; // kept client-side for UX continuity (not sent to backend)
  }

  /**
   * Send a message to the RAG backend and return a normalised response object.
   *
   * @param {string} message
   * @returns {Promise<{ success: boolean, message: string, sources?: string[] }>}
   */
  async sendMessage(message) {
    try {
      const res = await fetch(`${API_BASE}/chat/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Server error ${res.status}`);
      }

      const data = await res.json();

      // Support both field names: new backend uses "answer", deployed uses "reply"
      const answer = data.answer || data.reply || "";

      this.chatHistory.push({ role: "user", content: message });
      this.chatHistory.push({ role: "assistant", content: answer });
      if (this.chatHistory.length > 40) {
        this.chatHistory = this.chatHistory.slice(-40);
      }

      return {
        success: true,
        message: answer,
        sources: data.sources || [],
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return {
        success: false,
        message:
          "Sorry, I could not reach the assistant right now. " +
          "Please contact info@nexaacademy.co.ke or call +254713067311.",
        sources: [],
        error: err.message,
      };
    }
  }

  clearHistory() {
    this.chatHistory = [];
  }

  getSuggestedQuestions() {
    return [
      "When is the next Software Engineering intake?",
      "What does the Cloud Computing and AI program cover?",
      "How much does the Software Engineering program cost?",
      "Do I need prior experience to join?",
      "What are the payment plan options?",
      "How long is the Cloud Computing program?",
      "Do graduates get job placement support?",
      "How do I apply to Nexa Academy?",
      "Will I get a certificate after finishing?",
      "What happens after I submit my application?",
      "What topics are covered in Software Engineering?",
      "When is the next Cloud Computing intake?",
    ];
  }
}

const ragService = new RagService();
export default ragService;
