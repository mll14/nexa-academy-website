import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Mail, Send } from 'lucide-react'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { Input } from './ui/input'
import * as api from '../lib/api'
import toast from 'react-hot-toast'

export function FollowUpForm({
  to,
  name,
  defaultSubject = '',
  onDone,
}: {
  to: string
  name?: string
  defaultSubject?: string
  onDone: () => void
}) {
  const [subject, setSubject] = useState(defaultSubject)
  const [message, setMessage] = useState('')

  const mutation = useMutation({
    mutationFn: () => api.sendFollowUp({ to, name, subject, message }),
    onSuccess: () => {
      toast.success('Email sent')
      onDone()
    },
    onError: (e: Error) => toast.error(e.message ?? 'Failed to send email'),
  })

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-primary uppercase tracking-wide">
        <Mail className="w-3.5 h-3.5" /> Compose Email
      </p>
      <p className="text-xs text-muted-foreground truncate">To: {to}</p>
      <div className="space-y-1.5">
        <Label className="text-xs">Subject</Label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Email subject"
          className="h-8 text-sm rounded-lg"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Message</Label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write your message…"
          rows={5}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1" onClick={onDone}>
          Cancel
        </Button>
        <Button
          size="sm"
          className="flex-1"
          disabled={!subject.trim() || !message.trim() || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          <Send className="w-3.5 h-3.5 mr-1.5" />
          {mutation.isPending ? 'Sending…' : 'Send Email'}
        </Button>
      </div>
    </div>
  )
}
