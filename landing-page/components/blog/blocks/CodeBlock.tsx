'use client'

import { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { CodeBlockData } from '@/types'

export function CodeBlock({ value }: { value: CodeBlockData }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(value.code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="my-8 rounded-xl overflow-hidden border border-border bg-[#1e1e1e]">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <span className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          {value.filename && (
            <span className="text-xs text-white/50 font-mono">{value.filename}</span>
          )}
          {value.language && !value.filename && (
            <span className="text-xs text-white/40 font-mono">{value.language}</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="text-xs text-white/40 hover:text-white/80 transition-colors px-2 py-1 rounded"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Code */}
      <SyntaxHighlighter
        language={value.language ?? 'text'}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '1.25rem 1.5rem',
          background: 'transparent',
          fontSize: '0.8125rem',
          lineHeight: '1.7',
        }}
        showLineNumbers={value.code.split('\n').length > 8}
        lineNumberStyle={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', minWidth: '2rem' }}
      >
        {value.code}
      </SyntaxHighlighter>
    </div>
  )
}
