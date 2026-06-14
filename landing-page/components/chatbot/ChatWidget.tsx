'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X, Send, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'bot'
  text: string
}

const WELCOME: Message = {
  id: 'welcome',
  role: 'bot',
  text: "Hi! I'm Nexa, the admissions assistant for Nexa Academy. Ask me about our programs, fees, schedule, or how to apply.",
}

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? ''

    try {
      const res = await fetch(`${apiBase}/api/chatbot/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })
      const data = await res.json()
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'bot',
          text: data.answer || data.reply || "Sorry, I couldn't process that. Please try again.",
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'bot',
          text: "I'm having trouble connecting right now. Please try again shortly or contact info@nexaacademy.co.ke.",
        },
      ])
    } finally {
      setLoading(false)
    }
  }, [input, loading])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      {/* ── Chat panel ───────────────────────────────────────── */}
      <div
        aria-hidden={!open}
        className={cn(
          'fixed bottom-24 right-4 z-50 flex flex-col rounded-2xl shadow-2xl border border-border bg-white overflow-hidden transition-all duration-300 origin-bottom-right',
          'w-[min(390px,calc(100vw-2rem))]',
          open
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-95 pointer-events-none',
        )}
        style={{ height: 'min(560px,calc(100svh - 7.5rem))' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-primary text-white shrink-0">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm font-heading leading-tight">Nexa</p>
            <p className="text-[11px] text-white/75 leading-tight">Admissions Assistant · Online</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close chat"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#f7f9fc]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn('flex gap-2 items-end', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {msg.role === 'bot' && (
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 mb-0.5">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-primary text-white rounded-br-sm'
                    : 'bg-white text-foreground shadow-sm border border-border rounded-bl-sm',
                )}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-2 items-end justify-start">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 mb-0.5">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-white border border-border shadow-sm rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-3 pb-3 pt-2 bg-white border-t border-border shrink-0">
          <div className="flex items-end gap-2 rounded-xl border border-border bg-[#f7f9fc] px-3 py-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about programs, fees, how to apply…"
              rows={1}
              className="flex-1 bg-transparent resize-none text-sm text-foreground placeholder:text-muted-foreground focus:outline-none leading-relaxed max-h-28 overflow-y-auto"
              style={{ fieldSizing: 'content' } as React.CSSProperties}
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              aria-label="Send"
              className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:pointer-events-none transition-colors shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-2 select-none">
            Powered by Nexa Academy AI
          </p>
        </div>
      </div>

      {/* ── Floating toggle button ────────────────────────────── */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close chat' : 'Chat with Nexa'}
        className={cn(
          'fixed bottom-5 right-4 z-50 w-14 h-14 rounded-full bg-primary text-white shadow-xl flex items-center justify-center transition-all duration-300 hover:bg-primary/90 hover:scale-110 active:scale-95',
        )}
      >
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center transition-all duration-200',
            open ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-75',
          )}
        >
          <X className="w-6 h-6" />
        </span>
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center transition-all duration-200',
            open ? 'opacity-0 -rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100',
          )}
        >
          <MessageCircle className="w-6 h-6" />
        </span>
      </button>
    </>
  )
}
