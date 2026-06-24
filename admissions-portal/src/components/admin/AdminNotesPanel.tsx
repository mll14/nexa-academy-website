import { useState } from 'react'
import DOMPurify from 'dompurify'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Italic, List, ListOrdered, Maximize2, MessageSquarePlus, Quote, Redo2, Undo2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../ui/button'
import { Dialog } from '../ui/dialog'
import { Separator } from '../ui/separator'
import * as api from '../../lib/api'
import { formatFullDateTime, statusText } from '../../lib/utils'
import type { AdminNote } from '../../types'

type LeadType = 'program_interest' | 'help_me' | 'incomplete_application'

type Source =
  | { kind: 'application'; applicationId: string }
  | { kind: 'lead'; leadType: LeadType; leadId: string }

interface Props {
  source: Source
  stage: string
  title?: string
  emptyText?: string
  allowFullscreen?: boolean
  expanded?: boolean
}

function noteQueryKey(source: Source) {
  return source.kind === 'application'
    ? ['admin-notes', 'application', source.applicationId]
    : ['admin-notes', 'lead', source.leadType, source.leadId]
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  return formatFullDateTime(dateStr)
}

function AuthorAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  return (
    <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 select-none">
      {initials}
    </div>
  )
}

function ToolbarButton({
  active,
  disabled,
  onClick,
  children,
  label,
}: {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`h-7 w-7 rounded flex items-center justify-center transition-colors disabled:opacity-30 ${
        active
          ? 'bg-primary/15 text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
      }`}
    >
      {children}
    </button>
  )
}

export function AdminNotesPanel({
  source,
  stage,
  title = 'Admin Notes',
  emptyText = 'No internal notes yet.',
  allowFullscreen = true,
  expanded = false,
}: Props) {
  const qc = useQueryClient()
  const queryKey = noteQueryKey(source)
  const [noteText, setNoteText] = useState('')
  const [fullscreenOpen, setFullscreenOpen] = useState(false)

  const { data: notes = [], isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      source.kind === 'application'
        ? api.getApplicationNotes(source.applicationId)
        : api.getLeadNotes({ lead_type: source.leadType, lead_id: source.leadId }),
  })

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: {
      attributes: {
        class: `${expanded ? 'min-h-[320px]' : 'min-h-[110px]'} px-3 py-2.5 text-sm leading-relaxed outline-none`,
      },
    },
    onUpdate: ({ editor }) => setNoteText(editor.getText()),
  })

  const createMutation = useMutation({
    mutationFn: () => {
      const html = editor?.getHTML() ?? ''
      const text = editor?.getText() ?? ''
      if (source.kind === 'application') {
        return api.createApplicationNote({ applicationId: source.applicationId, stage, html, text })
      }
      return api.createLeadNote({ lead_type: source.leadType, lead_id: source.leadId, stage, html, text })
    },
    onSuccess: () => {
      editor?.commands.clearContent()
      setNoteText('')
      qc.invalidateQueries({ queryKey })
      toast.success('Note saved')
    },
    onError: (e: Error) => toast.error(e.message || 'Could not save note'),
  })

  const canSave = Boolean(noteText.trim()) && !createMutation.isPending

  const panel = (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Panel header */}
      <div className="px-5 py-3.5 flex items-center justify-between gap-3 bg-muted/20">
        <div className="flex items-center gap-2.5 min-w-0">
          <MessageSquarePlus className="w-4 h-4 text-primary shrink-0" />
          <div className="min-w-0">
            <h2 className="font-heading font-semibold text-sm leading-none">{title}</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Stage:{' '}
              <span className="font-medium text-foreground">{statusText(stage)}</span>
            </p>
          </div>
        </div>
        {allowFullscreen && (
          <button
            type="button"
            aria-label="Open notes fullscreen"
            title="Open notes fullscreen"
            onClick={() => setFullscreenOpen(true)}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}
      </div>
      <Separator />

      <div className="p-4 space-y-5">
        {/* Editor card */}
        <div className="rounded-xl border border-border bg-background overflow-hidden transition-shadow focus-within:ring-2 focus-within:ring-ring">
          {/* Toolbar */}
          <div className="flex items-center gap-0.5 border-b border-border bg-muted/30 px-2.5 py-1.5">
            <ToolbarButton
              label="Bold"
              active={editor?.isActive('bold')}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              <Bold className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton
              label="Italic"
              active={editor?.isActive('italic')}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
              <Italic className="w-3.5 h-3.5" />
            </ToolbarButton>
            <span className="mx-1.5 h-4 w-px bg-border/70 shrink-0" />
            <ToolbarButton
              label="Bullet list"
              active={editor?.isActive('bulletList')}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            >
              <List className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton
              label="Numbered list"
              active={editor?.isActive('orderedList')}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton
              label="Quote"
              active={editor?.isActive('blockquote')}
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            >
              <Quote className="w-3.5 h-3.5" />
            </ToolbarButton>
            <span className="mx-1.5 h-4 w-px bg-border/70 shrink-0" />
            <ToolbarButton
              label="Undo"
              disabled={!editor?.can().undo()}
              onClick={() => editor?.chain().focus().undo().run()}
            >
              <Undo2 className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton
              label="Redo"
              disabled={!editor?.can().redo()}
              onClick={() => editor?.chain().focus().redo().run()}
            >
              <Redo2 className="w-3.5 h-3.5" />
            </ToolbarButton>
          </div>

          {/* Content area with placeholder overlay */}
          <div className="relative">
            {!noteText.trim() && (
              <p className="absolute top-2.5 left-3 text-sm text-muted-foreground/50 pointer-events-none select-none">
                Add an internal note…
              </p>
            )}
            <EditorContent
              editor={editor}
              className="admin-note-editor [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-[3px] [&_blockquote]:border-primary/30 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground"
            />
          </div>

          {/* Editor footer */}
          <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/20 px-3 py-2">
            <span className="text-[11px] text-muted-foreground/50 tabular-nums">
              {noteText.trim() ? `${noteText.trim().length} chars` : ''}
            </span>
            <Button size="sm" disabled={!canSave} onClick={() => createMutation.mutate()}>
              {createMutation.isPending ? 'Saving…' : 'Add Note'}
            </Button>
          </div>
        </div>

        {/* Notes history */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              History
            </h3>
            {!isLoading && notes.length > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">
                {notes.length}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2 pt-0.5">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2.5 text-center">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <MessageSquarePlus className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">{emptyText}</p>
            </div>
          ) : (
            <div className="space-y-2 pt-0.5">
              {notes.map((note: AdminNote) => {
                const authorName =
                  note.created_by_name || note.created_by_email || 'Admin'
                return (
                  <div
                    key={note.id}
                    className="rounded-xl border border-border bg-muted/10 overflow-hidden flex"
                  >
                    <div className="w-[3px] bg-primary/30 shrink-0" />
                    <div className="flex gap-3 px-3.5 py-3 flex-1 min-w-0">
                      <AuthorAvatar name={authorName} />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold leading-snug">
                            {authorName}
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground leading-none">
                            {statusText(note.stage)}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mb-2.5">
                          <span className="font-medium">{relativeTime(note.created_at)}</span>
                          {' · '}
                          {formatFullDateTime(note.created_at)}
                        </p>
                        <div
                          className="text-sm leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-[3px] [&_blockquote]:border-primary/30 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground"
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(note.html),
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {panel}
      {allowFullscreen && (
        <Dialog
          open={fullscreenOpen}
          onClose={() => setFullscreenOpen(false)}
          title={title}
          description={`Internal notes for this record. Current stage: ${statusText(stage)}.`}
          className="max-w-none w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]"
        >
          <div className="max-h-[calc(100vh-10rem)] overflow-y-auto pr-1">
            <AdminNotesPanel
              source={source}
              stage={stage}
              title={title}
              emptyText={emptyText}
              allowFullscreen={false}
              expanded
            />
          </div>
        </Dialog>
      )}
    </>
  )
}
