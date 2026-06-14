import { useRef, useEffect, useCallback, useState } from 'react'
import {
  Bold, Italic, Underline, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight,
  Link2, Minus, MousePointer2,
  Undo2, Redo2, Code2, Image,
  Type,
} from 'lucide-react'

interface EmailEditorProps {
  value: string
  onChange: (html: string) => void
  previewSubject?: string
  previewText?: string
}

const CTA_SNIPPET = `<div style="text-align:center;margin:28px 0"><a href="#" style="display:inline-block;background:#6366f1;color:#ffffff;padding:13px 32px;border-radius:8px;font-weight:600;text-decoration:none;font-size:15px;letter-spacing:-0.2px">Click Here →</a></div>`
const DIVIDER_SNIPPET = `<hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0" />`
const BLOCKQUOTE_SNIPPET = `<blockquote style="border-left:3px solid #6366f1;margin:16px 0;padding:12px 20px;background:#f5f3ff;border-radius:0 8px 8px 0;color:#4b5563;font-style:italic">Add your quote here...</blockquote>`

function ToolbarDivider() {
  return <div className="w-px h-5 bg-border mx-1 shrink-0" />
}

function ToolbarBtn({
  title,
  onClick,
  active,
  children,
}: {
  title: string
  onClick: () => void
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className={`flex items-center justify-center w-7 h-7 rounded-md text-sm transition-colors shrink-0
        ${active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
    >
      {children}
    </button>
  )
}

function buildEmailHtml(subject: string, previewText: string, html: string): string {
  const body = html || '<p style="color:#9ca3af;font-style:italic">Your email content will appear here…</p>'
  const previewSnippet = previewText
    ? `<div style="display:none;max-height:0;overflow:hidden;">${previewText}</div>`
    : ''
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject || 'Email Preview'}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    table { border-collapse: collapse; }
    img { border: 0; display: block; max-width: 100%; height: auto; }
    a { color: #6366f1; }
    .wrapper { width: 100%; background-color: #f4f4f5; padding: 32px 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px 40px; text-align: center; }
    .header-logo { display: inline-flex; align-items: center; gap: 10px; }
    .header-logo-icon { width: 36px; height: 36px; background: rgba(255,255,255,0.2); border-radius: 8px; display: inline-block; line-height: 36px; text-align: center; font-size: 18px; }
    .header-title { color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: -0.3px; margin: 0; }
    .header-tagline { color: rgba(255,255,255,0.75); font-size: 13px; margin: 6px 0 0; }
    .body { padding: 40px; color: #1f2937; font-size: 15px; line-height: 1.7; }
    .body h1 { font-size: 26px; font-weight: 700; color: #111827; margin: 0 0 16px; letter-spacing: -0.4px; line-height: 1.3; }
    .body h2 { font-size: 20px; font-weight: 700; color: #111827; margin: 28px 0 12px; letter-spacing: -0.3px; line-height: 1.35; }
    .body h3 { font-size: 16px; font-weight: 600; color: #374151; margin: 24px 0 8px; }
    .body p { margin: 0 0 16px; }
    .body ul, .body ol { padding-left: 20px; margin: 0 0 16px; }
    .body li { margin-bottom: 6px; }
    .body hr { border: none; border-top: 1px solid #e5e7eb; margin: 28px 0; }
    .body a { color: #6366f1; text-decoration: underline; }
    .body img { border-radius: 8px; margin: 16px 0; }
    .body blockquote { border-left: 3px solid #6366f1; margin: 16px 0; padding: 12px 20px; background: #f5f3ff; border-radius: 0 8px 8px 0; color: #4b5563; font-style: italic; }
    .body a[style*="background"] { text-decoration: none !important; }
    .footer { background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 28px 40px; text-align: center; }
    .footer p { margin: 0 0 8px; color: #6b7280; font-size: 12px; line-height: 1.6; }
    .footer a { color: #6b7280; text-decoration: underline; }
    .footer .brand { color: #9ca3af; font-size: 11px; margin-top: 12px; }
  </style>
</head>
<body>
  ${previewSnippet}
  <div class="wrapper">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding: 32px 16px;">
          <div class="container">
            <div class="header">
              <div class="header-logo">
                <span class="header-logo-icon">🎓</span>
                <span class="header-title">Nexa Academy</span>
              </div>
              <p class="header-tagline">Kenya's leading coding bootcamp</p>
            </div>
            <div class="body">${body}</div>
            <div class="footer">
              <p>You're receiving this because you subscribed to Nexa Academy updates.</p>
              <p>
                <a href="#">Unsubscribe</a>
                &nbsp;·&nbsp;
                <a href="#">Visit our website</a>
              </p>
              <p class="brand">© Nexa Academy · Nairobi, Kenya</p>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`
}

function EmailPreviewWrapper({
  subject,
  previewText,
  html,
}: {
  subject: string
  previewText: string
  html: string
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const autoResize = () => {
    const iframe = iframeRef.current
    if (!iframe?.contentDocument?.documentElement) return
    iframe.style.height = iframe.contentDocument.documentElement.scrollHeight + 'px'
  }

  return (
    <>
      {/* Simulated email-client header strip */}
      <div className="border-b border-border bg-muted/40 px-4 py-3 space-y-1.5 shrink-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-muted-foreground w-16 shrink-0">From</span>
          <span className="text-xs text-muted-foreground">admissions@nexaacademy.co.ke</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-muted-foreground w-16 shrink-0">Subject</span>
          <span className="text-sm font-medium truncate">
            {subject || <em className="text-muted-foreground font-normal">No subject</em>}
          </span>
        </div>
        {previewText && (
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-muted-foreground w-16 shrink-0">Preview</span>
            <span className="text-xs text-muted-foreground truncate">{previewText}</span>
          </div>
        )}
      </div>

      {/* Pixel-perfect email render */}
      <iframe
        ref={iframeRef}
        title="Email Preview"
        srcDoc={buildEmailHtml(subject, previewText, html)}
        onLoad={autoResize}
        sandbox="allow-same-origin"
        style={{ width: '100%', border: 'none', display: 'block', minHeight: 500 }}
      />
    </>
  )
}

export function EmailEditor({ value, onChange, previewSubject = '', previewText = '' }: EmailEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<'write' | 'preview'>('write')
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set())

  // Sync incoming value to the editor (e.g. loading a draft)
  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    if (el.innerHTML !== value) {
      el.innerHTML = value
    }
  }, []) // only on mount; user edits are tracked via onInput

  const exec = useCallback((command: string, val?: string) => {
    editorRef.current?.focus()
    document.execCommand(command, false, val ?? '')
    onChange(editorRef.current?.innerHTML ?? '')
    updateActiveFormats()
  }, [onChange])

  const insertHTML = useCallback((html: string) => {
    editorRef.current?.focus()
    document.execCommand('insertHTML', false, html)
    onChange(editorRef.current?.innerHTML ?? '')
  }, [onChange])

  const updateActiveFormats = useCallback(() => {
    const formats = new Set<string>()
    if (document.queryCommandState('bold')) formats.add('bold')
    if (document.queryCommandState('italic')) formats.add('italic')
    if (document.queryCommandState('underline')) formats.add('underline')
    if (document.queryCommandState('strikeThrough')) formats.add('strike')
    if (document.queryCommandState('insertUnorderedList')) formats.add('ul')
    if (document.queryCommandState('insertOrderedList')) formats.add('ol')
    if (document.queryCommandState('justifyCenter')) formats.add('center')
    if (document.queryCommandState('justifyRight')) formats.add('right')
    if (document.queryCommandState('justifyLeft')) formats.add('left')
    const block = document.queryCommandValue('formatBlock').toLowerCase()
    if (block) formats.add(block)
    setActiveFormats(formats)
  }, [])

  const handleInsertLink = useCallback(() => {
    const sel = window.getSelection()
    const selectedText = sel?.toString() || ''
    const url = window.prompt('Enter URL (include https://):')
    if (!url) return
    if (selectedText) {
      exec('createLink', url)
    } else {
      insertHTML(`<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`)
    }
  }, [exec, insertHTML])

  const handleInsertImage = useCallback(() => {
    const url = window.prompt('Enter image URL:')
    if (!url) return
    insertHTML(`<img src="${url}" alt="" style="width:100%;border-radius:8px;margin:12px 0" />`)
  }, [insertHTML])

  const blockTag = (tag: string) => {
    const current = document.queryCommandValue('formatBlock').toLowerCase()
    exec('formatBlock', current === tag ? 'p' : tag)
  }

  return (
    <div className="flex flex-col border border-border rounded-xl overflow-hidden bg-background h-full">
      {/* Mode toggle */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <span className="text-xs font-medium text-muted-foreground">Email Editor</span>
        <div className="flex rounded-lg overflow-hidden border border-border">
          {(['write', 'preview'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-3 py-1 text-xs font-medium transition-colors capitalize
                ${mode === m ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {mode === 'write' ? (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/20 sticky top-0 z-10">
            {/* History */}
            <ToolbarBtn title="Undo" onClick={() => exec('undo')}><Undo2 className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarBtn title="Redo" onClick={() => exec('redo')}><Redo2 className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarDivider />

            {/* Text format */}
            <ToolbarBtn title="Bold" active={activeFormats.has('bold')} onClick={() => exec('bold')}><Bold className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarBtn title="Italic" active={activeFormats.has('italic')} onClick={() => exec('italic')}><Italic className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarBtn title="Underline" active={activeFormats.has('underline')} onClick={() => exec('underline')}><Underline className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarBtn title="Strikethrough" active={activeFormats.has('strikethrough')} onClick={() => exec('strikeThrough')}><Strikethrough className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarDivider />

            {/* Headings */}
            <ToolbarBtn title="Normal text" active={activeFormats.has('p')} onClick={() => blockTag('p')}><Type className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarBtn title="Heading 1" active={activeFormats.has('h1')} onClick={() => blockTag('h1')}><Heading1 className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarBtn title="Heading 2" active={activeFormats.has('h2')} onClick={() => blockTag('h2')}><Heading2 className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarBtn title="Heading 3" active={activeFormats.has('h3')} onClick={() => blockTag('h3')}><Heading3 className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarDivider />

            {/* Lists */}
            <ToolbarBtn title="Bullet list" active={activeFormats.has('ul')} onClick={() => exec('insertUnorderedList')}><List className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarBtn title="Numbered list" active={activeFormats.has('ol')} onClick={() => exec('insertOrderedList')}><ListOrdered className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarDivider />

            {/* Alignment */}
            <ToolbarBtn title="Align left" active={activeFormats.has('left')} onClick={() => exec('justifyLeft')}><AlignLeft className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarBtn title="Align center" active={activeFormats.has('center')} onClick={() => exec('justifyCenter')}><AlignCenter className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarBtn title="Align right" active={activeFormats.has('right')} onClick={() => exec('justifyRight')}><AlignRight className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarDivider />

            {/* Insert */}
            <ToolbarBtn title="Insert link" onClick={handleInsertLink}><Link2 className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarBtn title="Insert image" onClick={handleInsertImage}><Image className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarBtn title="Insert divider" onClick={() => insertHTML(DIVIDER_SNIPPET)}><Minus className="w-3.5 h-3.5" /></ToolbarBtn>
            <ToolbarDivider />

            {/* Snippets */}
            <ToolbarBtn title="Insert CTA button" onClick={() => insertHTML(CTA_SNIPPET)}>
              <MousePointer2 className="w-3.5 h-3.5" />
            </ToolbarBtn>
            <ToolbarBtn title="Insert blockquote" onClick={() => insertHTML(BLOCKQUOTE_SNIPPET)}>
              <Code2 className="w-3.5 h-3.5" />
            </ToolbarBtn>
          </div>

          {/* Editable area */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={() => onChange(editorRef.current?.innerHTML ?? '')}
            onKeyUp={updateActiveFormats}
            onMouseUp={updateActiveFormats}
            onSelect={updateActiveFormats}
            className="flex-1 overflow-y-auto p-5 focus:outline-none text-sm leading-relaxed min-h-[320px]"
            style={{
              // Style to match email rendering
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            }}
            data-placeholder="Write your email content here…"
          />

          <style>{`
            [contenteditable]:empty:before {
              content: attr(data-placeholder);
              color: #9ca3af;
              pointer-events: none;
            }
            [contenteditable] h1 { font-size: 1.6em; font-weight: 700; margin: 0 0 0.5em; line-height: 1.3; }
            [contenteditable] h2 { font-size: 1.25em; font-weight: 700; margin: 0.8em 0 0.4em; }
            [contenteditable] h3 { font-size: 1.05em; font-weight: 600; margin: 0.6em 0 0.3em; }
            [contenteditable] p  { margin: 0 0 0.75em; }
            [contenteditable] ul, [contenteditable] ol { padding-left: 1.4em; margin: 0 0 0.75em; }
            [contenteditable] li { margin-bottom: 0.25em; }
            [contenteditable] hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.5em 0; }
            [contenteditable] a  { color: #6366f1; text-decoration: underline; }
            [contenteditable] blockquote {
              border-left: 3px solid #6366f1;
              margin: 1em 0;
              padding: 0.6em 1em;
              background: #f5f3ff;
              border-radius: 0 6px 6px 0;
              color: #4b5563;
              font-style: italic;
            }
            [contenteditable] img { max-width: 100%; border-radius: 6px; margin: 0.75em 0; }
          `}</style>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto flex flex-col bg-muted/20">
          <EmailPreviewWrapper
            subject={previewSubject}
            previewText={previewText}
            html={value}
          />
        </div>
      )}
    </div>
  )
}
