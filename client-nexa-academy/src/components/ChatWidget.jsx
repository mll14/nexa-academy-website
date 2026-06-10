import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, X, Maximize2, Minimize2 } from "lucide-react";
import ragService from "../services/ragService";

const ChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [thinking, setThinking] = useState(false);

  const streamingRef = useRef(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  const SITE_ORIGIN =
    typeof window !== "undefined" ? window.location.origin : "";

  /** True if the URL belongs to this site (navigate internally) */
  function isSameOrigin(url) {
    try {
      return new URL(url).origin === SITE_ORIGIN;
    } catch {
      return false;
    }
  }

  /** Render a bot reply string, turning URLs and site paths into clickable links. */
  function renderBotText(text) {
    // Split on absolute URLs and internal site paths so we can wrap each one.
    const parts = text.split(/(https?:\/\/[^\s]+|\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*\/?)/g);
    return parts.map((part, i) => {
      const isInternalPath = /^\/[A-Za-z0-9._-]/.test(part);
      if (/^https?:\/\//.test(part) || isInternalPath) {
        const path = (() => {
          try {
            return part.startsWith("http") ? new URL(part).pathname : part;
          } catch {
            return part;
          }
        })();
        if (part.startsWith("http") && isSameOrigin(part)) {
          return (
            <button
              key={i}
              className="inline text-primary underline underline-offset-2 hover:opacity-80 break-all"
              onClick={() => {
                setOpen(false);
                navigate(path);
              }}
            >
              {part}
            </button>
          );
        }
        if (isInternalPath) {
          return (
            <button
              key={i}
              className="inline text-primary underline underline-offset-2 hover:opacity-80 break-all"
              onClick={() => {
                setOpen(false);
                navigate(path.replace(/[.,)]$/, ""));
              }}
            >
              {part}
            </button>
          );
        }
        return (
          <a
            key={i}
            href={part}
            className="inline text-primary underline underline-offset-2 hover:opacity-80 break-all"
          >
            {part}
          </a>
        );
      }
      // Preserve newlines
      return part.split("\n").map((line, j, arr) => (
        <React.Fragment key={`${i}-${j}`}>
          {line}
          {j < arr.length - 1 && <br />}
        </React.Fragment>
      ));
    });
  }

  useEffect(() => {
    // auto-scroll to bottom when messages change
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, open]);

  const streamBotReply = async (fullText) => {
    if (streamingRef.current) return;
    streamingRef.current = true;

    // add an empty bot message slot
    setMessages((m) => [...m, { from: "bot", text: "" }]);

    const chunkSize = 40;
    const delayMs = 50;
    let i = 0;
    while (i < fullText.length) {
      const next = fullText.slice(i, i + chunkSize);
      setMessages((m) => {
        const copy = [...m];
        const last = copy[copy.length - 1];
        if (last && last.from === "bot") last.text = (last.text || "") + next;
        return copy;
      });
      i += chunkSize;
      await new Promise((r) => setTimeout(r, delayMs));
    }

    streamingRef.current = false;
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    const userMsg = { from: "user", text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setSending(true);
    setThinking(true);
    try {
      const aiRes = await ragService.sendMessage(text);
      setThinking(false);
      const reply = aiRes?.message || "No response";
      await streamBotReply(reply);
    } catch (err) {
      setThinking(false);
      setMessages((m) => [
        ...m,
        { from: "bot", text: err?.message || "Failed to send message" },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      {/* Floating button */}
      <div className="fixed z-50 right-4 bottom-6">
        {open ? (
          <>
            {/* Fullscreen backdrop */}
            {fullscreen && (
              <div
                className="fixed inset-0 bg-black/40 z-40"
                onClick={() => setFullscreen(false)}
              />
            )}

            <div
              className={
                fullscreen
                  ? "fixed inset-4 sm:inset-8 md:inset-16 z-50 shadow-2xl rounded-2xl bg-popover border border-border overflow-hidden flex flex-col"
                  : "w-80 sm:w-96 shadow-lg rounded-xl bg-popover border border-border overflow-hidden flex flex-col"
              }
            >
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/5 shrink-0">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-primary" />
                  <div className="font-medium text-sm">Nexa Assistant</div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="p-1.5 rounded-md hover:bg-muted transition-colors"
                    onClick={() => setFullscreen((f) => !f)}
                    aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
                    title={fullscreen ? "Exit fullscreen" : "Expand"}
                  >
                    {fullscreen
                      ? <Minimize2 className="w-4 h-4" />
                      : <Maximize2 className="w-4 h-4" />}
                  </button>
                  <button
                    className="p-1.5 rounded-md hover:bg-muted transition-colors"
                    onClick={() => { setOpen(false); setFullscreen(false); }}
                    aria-label="Close chat"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div
                ref={containerRef}
                className={`p-3 overflow-y-auto space-y-2 bg-background flex-1 ${fullscreen ? "min-h-0" : "h-60"}`}
              >
                {messages.length === 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Hi — how can I help? Try one of these:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(ragService.getSuggestedQuestions() || [])
                        .slice(0, fullscreen ? 6 : 3)
                        .map((q, idx) => (
                          <button
                            key={idx}
                            title={q}
                            className="text-sm px-3 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer max-w-55 truncate"
                            onClick={() => {
                              setInput(q);
                              setTimeout(() => sendMessage(), 60);
                            }}
                          >
                            {q}
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex items-end ${m.from === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {m.from === "bot" && (
                      <div className="mr-2 shrink-0">
                        <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                          N
                        </div>
                      </div>
                    )}

                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-lg text-sm leading-relaxed ${m.from === "user" ? "bg-primary text-primary-foreground" : "bg-muted/10 text-foreground"}`}
                    >
                      {m.from === "user" ? m.text : renderBotText(m.text)}
                      {m.from === "bot" &&
                        streamingRef.current &&
                        m === messages[messages.length - 1] && (
                          <span className="ml-2 animate-pulse">▌</span>
                        )}
                    </div>

                    {m.from === "user" && (
                      <div className="ml-2 shrink-0">
                        <div className="w-7 h-7 rounded-full bg-white border border-border flex items-center justify-center text-xs text-muted-foreground">
                          U
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {thinking && (
                  <div className="flex items-end justify-start">
                    <div className="mr-2">
                      <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                        N
                      </div>
                    </div>
                    <div className="px-4 py-3 rounded-lg bg-muted/10 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-3 border-t border-border flex gap-2 bg-popover shrink-0">
                <input
                  className="flex-1 px-3 py-2 rounded-md border border-border bg-transparent text-sm disabled:opacity-50"
                  placeholder={thinking ? "Thinking…" : "Type a message..."}
                  value={input}
                  disabled={sending}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                />
                <button
                  className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-60 flex items-center gap-1.5 min-w-15 justify-center"
                  onClick={sendMessage}
                  disabled={sending}
                >
                  {thinking ? (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : (
                    "Send"
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-full bg-primary text-primary-foreground shadow-lg"
            onClick={() => setOpen(true)}
            aria-label="Open chat"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Chat</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatWidget;
