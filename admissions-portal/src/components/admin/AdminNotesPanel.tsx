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
}

function noteQueryKey(source: Source) {
  return source.kind === 'application'
    ? ['admin-notes', 'application', source.applicationId]
    : ['admin-notes', 'lead', source.leadType, source.leadId]
}

function ToolbarButton({ active, disabled, onClick, children, label }: {
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
      className={`h-8 w-8 rounded-lg border border-border flex items-center justify-center transition-colors disabled:opacity-40 ${
        active ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'
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
}: Props) {
  const qc = useQueryClient()
  const queryKey = noteQueryKey(source)
  const [noteText, setNoteText] = useState('')
  const [fullscreenOpen, setFullscreenOpen] = useState(false)

  const { data: notes = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => source.kind === 'application'
      ? api.getApplicationNotes(source.applicationId)
      : api.getLeadNotes({ lead_type: source.leadType, lead_id: source.leadId }),
  })

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: {
      attributes: {
        class: 'min-h-[120px] px-3 py-2 text-sm leading-relaxed outline-none',
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
      <div className="px-5 py-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading font-semibold text-sm">{title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Internal rich-text notes visible only to admins. Current stage: {statusText(stage)}.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {allowFullscreen && (
            <button
              type="button"
              aria-label="Open notes fullscreen"
              title="Open notes fullscreen"
              onClick={() => setFullscreenOpen(true)}
              className="h-8 w-8 rounded-lg border border-border flex items-center justify-center bg-background hover:bg-muted transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
          <MessageSquarePlus className="w-4 h-4 text-primary" />
        </div>
      </div>
      <Separator />

      <div className="p-5 space-y-4">
        <div className="rounded-xl border border-border bg-background overflow-hidden">
          <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-muted/30 px-2 py-2">
            <ToolbarButton label="Bold" active={editor?.isActive('bold')} onClick={() => editor?.chain().focus().toggleBold().run()}>
              <Bold className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton label="Italic" active={editor?.isActive('italic')} onClick={() => editor?.chain().focus().toggleItalic().run()}>
              <Italic className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton label="Bullet list" active={editor?.isActive('bulletList')} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
              <List className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton label="Numbered list" active={editor?.isActive('orderedList')} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
              <ListOrdered className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton label="Quote" active={editor?.isActive('blockquote')} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>
              <Quote className="w-4 h-4" />
            </ToolbarButton>
            <span className="mx-1 h-5 w-px bg-border" />
            <ToolbarButton label="Undo" disabled={!editor?.can().undo()} onClick={() => editor?.chain().focus().undo().run()}>
              <Undo2 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton label="Redo" disabled={!editor?.can().redo()} onClick={() => editor?.chain().focus().redo().run()}>
              <Redo2 className="w-4 h-4" />
            </ToolbarButton>
          </div>
          <EditorContent
            editor={editor}
            className="admin-note-editor [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground"
          />
        </div>

        <div className="flex justify-end">
          <Button size="sm" disabled={!canSave} onClick={() => createMutation.mutate()}>
            {createMutation.isPending ? 'Saving...' : 'Save note'}
          </Button>
        </div>

        <Separator />

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, index) => (
              <div key={index} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <div className="space-y-3">
            {notes.map((note: AdminNote) => (
              <div key={note.id} className="rounded-xl border border-border bg-muted/20 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{note.created_by_name || note.created_by_email || 'Admin'}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFullDateTime(note.created_at)} · Stage: {statusText(note.stage)}
                    </p>
                  </div>
                  {note.created_by_email && (
                    <span className="text-xs text-muted-foreground">{note.created_by_email}</span>
                  )}
                </div>
                <div
                  className="mt-3 text-sm leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(note.html) }}
                />
              </div>
            ))}
          </div>
        )}
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
            />
          </div>
        </Dialog>
      )}
    </>
  )
}
