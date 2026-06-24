import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, Ban, Trash2, Plus, Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '../../ui/button'
import { Dialog } from '../../ui/dialog'
import { DeleteConfirmDialog } from '../../ui/delete-confirm-dialog'
import { Input } from '../../ui/input'
import { Select } from '../../ui/select'
import { calendarService } from '../../../lib/calendarService'
import { DayView } from './DayView'
import { WeekView } from './WeekView'
import { MonthView } from './MonthView'
import { ExternalEventPopup } from './ExternalEventPopup'
import type { CalendarEvent } from '../../../lib/calendarService'
import {
  getBlackouts, createBlackout, deleteBlackout,
  createCustomCalEvent,
} from '../../../lib/api'
import type { Blackout } from '../../../lib/api'
import toast from 'react-hot-toast'

type View = 'today' | 'week' | 'month'

function getViewRange(view: View, cursor: Date): { start: Date; end: Date } {
  if (view === 'today') {
    const s = new Date(cursor); s.setHours(0,0,0,0)
    const e = new Date(cursor); e.setHours(23,59,59,999)
    return { start: s, end: e }
  }
  if (view === 'week') {
    const mon = new Date(cursor); mon.setDate(cursor.getDate()-((cursor.getDay()+6)%7)); mon.setHours(0,0,0,0)
    const sun = new Date(mon); sun.setDate(mon.getDate()+6); sun.setHours(23,59,59,999)
    return { start: mon, end: sun }
  }
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const pad = (first.getDay()+6)%7
  const s = new Date(first); s.setDate(first.getDate()-pad); s.setHours(0,0,0,0)
  const e = new Date(s); e.setDate(s.getDate()+41); e.setHours(23,59,59,999)
  return { start: s, end: e }
}

function getHeaderLabel(view: View, cursor: Date): string {
  if (view === 'today') return cursor.toLocaleDateString('en-KE', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
  if (view === 'week') {
    const mon = new Date(cursor); mon.setDate(cursor.getDate()-((cursor.getDay()+6)%7))
    const sun = new Date(mon); sun.setDate(mon.getDate()+6)
    return `${mon.toLocaleDateString('en-KE',{day:'numeric',month:'short'})} – ${sun.toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric'})}`
  }
  return cursor.toLocaleDateString('en-KE', { month:'long', year:'numeric' })
}

function moveCursor(view: View, cursor: Date, dir: number): Date {
  const d = new Date(cursor)
  if (view==='today') d.setDate(d.getDate()+dir)
  else if (view==='week') d.setDate(d.getDate()+dir*7)
  else d.setMonth(d.getMonth()+dir)
  return d
}

const CATEGORIES = [
  { value: 'interview_follow_up', label: 'Interview Follow-up' },
  { value: 'lead_follow_up',      label: 'Lead Follow-up' },
  { value: 'personal',            label: 'Personal' },
  { value: 'meeting',             label: 'Meeting' },
  { value: 'other',               label: 'Other' },
]

// ── Block modal ───────────────────────────────────────────────────────────────

function BlockModalContent({ onCreated, onClose }: { onCreated: () => void; onClose: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0,10))
  const [blockType, setBlockType] = useState<'full'|'time'>('full')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [blackouts, setBlackouts] = useState<Blackout[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [deleting, setDeleting] = useState<number|null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Blackout | null>(null)

  useEffect(() => { getBlackouts().then(setBlackouts).finally(()=>setLoadingList(false)) }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (blockType==='time' && endTime<=startTime) return toast.error('End time must be after start time')
    setSubmitting(true)
    try {
      await createBlackout({ date, start_time: blockType==='time'?startTime:null, end_time: blockType==='time'?endTime:null, reason })
      toast.success('Block created'); onCreated(); onClose()
    } catch(err) { toast.error(err instanceof Error ? err.message : 'Failed') }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (id: number) => {
    setDeleting(id)
    try {
      await deleteBlackout(id); setBlackouts(p=>p.filter(b=>b.id!==id)); toast.success('Block removed'); onCreated()
    } catch(err) { toast.error(err instanceof Error ? err.message : 'Failed') }
    finally { setDeleting(null) }
  }

  return (
    <>
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</label>
            <Input type="date" required value={date} onChange={e=>setDate(e.target.value)} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Block type</label>
            <div className="flex rounded-xl border border-border overflow-hidden">
              {(['full','time'] as const).map(v=>(
                <button key={v} type="button" onClick={()=>setBlockType(v)}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${blockType===v?'bg-primary text-primary-foreground':'text-muted-foreground hover:bg-muted'}`}>
                  {v==='full'?'Full day':'Specific times'}
                </button>
              ))}
            </div>
          </div>
          {blockType==='time' && <>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">From</label>
              <Input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">To</label>
              <Input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)} />
            </div>
          </>}
          <div className="col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reason (optional)</label>
            <Input type="text" value={reason} onChange={e=>setReason(e.target.value)} placeholder="e.g. Public holiday, team offsite…" />
          </div>
        </div>
        <Button type="submit" disabled={submitting} className="w-full h-10">{submitting?'Creating…':'Create Block'}</Button>
      </form>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active Blocks</p>
        {loadingList ? <p className="text-xs text-muted-foreground py-2">Loading…</p>
         : blackouts.length===0 ? <p className="text-xs text-muted-foreground py-2">No blocks configured.</p>
         : <ul className="space-y-1.5">
             {blackouts.map(b=>(
               <li key={b.id} className="flex items-center justify-between gap-3 rounded-xl bg-destructive/5 border border-destructive/15 px-3 py-2.5">
                 <div className="flex-1 min-w-0">
                   <p className="text-xs font-semibold">{b.date}</p>
                   <p className="text-[11px] text-muted-foreground mt-0.5">
                     {b.start_time?`${b.start_time.slice(0,5)} – ${b.end_time?.slice(0,5)}`:'Full day'}{b.reason?` · ${b.reason}`:''}
                   </p>
                 </div>
                 <button onClick={()=>setDeleteTarget(b)} disabled={deleting===b.id}
                   className="shrink-0 p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40">
                   {deleting===b.id
                     ? <span className="w-3.5 h-3.5 block border border-destructive/40 border-t-destructive rounded-full animate-spin"/>
                     : <Trash2 className="w-3.5 h-3.5"/>}
                 </button>
               </li>
             ))}
           </ul>}
      </div>
    </div>

    <DeleteConfirmDialog
      open={!!deleteTarget}
      onClose={() => setDeleteTarget(null)}
      onConfirm={async () => {
        if (!deleteTarget) return
        await handleDelete(deleteTarget.id)
        setDeleteTarget(null)
      }}
      title="Remove Interview Block"
      itemName={deleteTarget?.date ?? ''}
      consequences="This date will be unblocked and become available for interview scheduling. This cannot be undone."
      isPending={deleting === deleteTarget?.id}
    />
  </>
  )
}

// ── Create event modal ────────────────────────────────────────────────────────

function CreateEventModalContent({ onCreated, onClose }: { onCreated: () => void; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0,10))
  const [allDay, setAllDay] = useState(false)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [category, setCategory] = useState('meeting')
  const [description, setDescription] = useState('')
  const [withMeet, setWithMeet] = useState(false)
  const [attendeeInput, setAttendeeInput] = useState('')
  const [attendees, setAttendees] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const addAttendee = () => {
    const email = attendeeInput.trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error('Enter a valid email')
    if (attendees.includes(email)) return toast.error('Already added')
    setAttendees(p => [...p, email])
    setAttendeeInput('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return toast.error('Title is required')
    if (!allDay && endTime <= startTime) return toast.error('End time must be after start time')
    if (withMeet && allDay) return toast.error('Google Meet requires a specific start and end time')
    setSubmitting(true)
    try {
      await createCustomCalEvent({
        title: title.trim(), date, all_day: allDay,
        start_time: allDay ? null : startTime,
        end_time: allDay ? null : endTime,
        category, description,
        with_meet: withMeet,
        attendees,
      })
      toast.success('Event created'); onCreated(); onClose()
    } catch(err) { toast.error(err instanceof Error ? err.message : 'Failed to create event') }
    finally { setSubmitting(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Title *</label>
        <Input type="text" required value={title} onChange={e=>setTitle(e.target.value)}
          placeholder="Event title…" autoFocus />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</label>
          <Select value={category} onChange={setCategory} options={CATEGORIES} />
        </div>

        <div className="col-span-2 space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</label>
          <Input type="date" required value={date} onChange={e=>setDate(e.target.value)} />
        </div>

        <div className="col-span-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={allDay} onChange={e=>setAllDay(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary" />
            <span className="text-sm font-medium">All day</span>
          </label>
        </div>

        {!allDay && <>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Start</label>
            <Input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">End</label>
            <Input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)} />
          </div>
        </>}
      </div>

      {/* Google Meet toggle — only available for timed events */}
      {!allDay && (
        <div className="rounded-xl border border-border bg-muted/30 px-3 py-3 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={withMeet} onChange={e=>setWithMeet(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary" />
            <span className="text-sm font-medium">Add Google Meet link</span>
            <span className="ml-auto text-[10px] text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded-md">
              meet.google.com
            </span>
          </label>

          {withMeet && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Invite attendees
              </label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={attendeeInput}
                  onChange={e=>setAttendeeInput(e.target.value)}
                  onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); addAttendee() } }}
                  placeholder="email@example.com"
                  className="flex-1"
                />
                <Button type="button" size="sm" variant="outline" className="h-9 px-3 shrink-0"
                  onClick={addAttendee}>
                  Add
                </Button>
              </div>
              {attendees.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                  {attendees.map(email => (
                    <li key={email} className="flex items-center gap-1 bg-primary/8 border border-primary/20 rounded-full px-2.5 py-1 text-xs font-medium">
                      {email}
                      <button type="button" onClick={()=>setAttendees(p=>p.filter(e=>e!==email))}
                        className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors">
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[11px] text-muted-foreground">
                Attendees will receive a calendar invite with the Meet link by email.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes (optional)</label>
        <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={2}
          placeholder="Any notes or context…"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" className="flex-1 h-10" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={submitting} className="flex-1 h-10">
          {submitting ? 'Creating…' : 'Create Event'}
        </Button>
      </div>
    </form>
  )
}

// ── Bottom bar (legend + actions) ─────────────────────────────────────────────

const LEGEND = [
  { label: 'Interview',  cls: 'bg-primary/20 border-primary/30' },
  { label: 'Intake',     cls: 'bg-secondary border-border' },
  { label: 'Blocked',    cls: 'bg-destructive/15 border-destructive/25' },
  { label: 'Meeting',    cls: 'bg-amber-400/20 border-amber-400/30' },
  { label: 'Personal',   cls: 'bg-violet-400/20 border-violet-400/30' },
]

function BottomBar({
  onBlock, onCreate,
}: { onBlock: () => void; onCreate: () => void }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t border-border/60 bg-muted/20 shrink-0 flex-wrap">
      {/* Legend chips */}
      <div className="flex items-center gap-2 flex-wrap flex-1">
        {LEGEND.map(l => (
          <div key={l.label} className="flex items-center gap-1">
            <span className={`w-2.5 h-2.5 rounded-sm border shrink-0 ${l.cls}`} />
            <span className="text-[10px] text-muted-foreground font-medium">{l.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <span className="inline-block w-4 h-px bg-red-500 relative">
            <span className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-500" />
          </span>
          <span className="text-[10px] text-muted-foreground font-medium">Now</span>
        </div>
      </div>

      {/* Action buttons — right side */}
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm" variant="outline"
          className="h-8 text-xs px-3 border-destructive/30 text-destructive hover:bg-destructive/8"
          onClick={onBlock}
        >
          <Ban className="w-3 h-3 mr-1.5" />
          Block
        </Button>
        <Button
          size="sm"
          className="h-8 text-xs px-3"
          onClick={onCreate}
        >
          <Plus className="w-3 h-3 mr-1.5" />
          Create Event
        </Button>
      </div>
    </div>
  )
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group">
      {children}
      <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1.5 whitespace-nowrap rounded-lg bg-popover border border-border px-2 py-1 text-[11px] font-medium text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-50">
        {label}
      </span>
    </div>
  )
}

// ── CalendarView ──────────────────────────────────────────────────────────────

interface Props {
  onInterviewClick: (applicationId: string) => void
  onIntakeClick: (intakeId: string) => void
}

export function CalendarView({ onInterviewClick, onIntakeClick }: Props) {
  const [view, setView] = useState<View>('month')
  const [cursor, setCursor] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string|null>(null)
  const [externalPopup, setExternalPopup] = useState<{event:CalendarEvent;anchorRect?:DOMRect}|null>(null)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    if (!isFullscreen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullscreen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isFullscreen])

  const load = useCallback(async () => {
    const { start, end } = getViewRange(view, cursor)
    setLoading(true); setError(null)
    const result = await calendarService.fetchEvents(start, end)
    setLoading(false)
    if (result.error) setError(result.error)
    else setEvents(result.events)
  }, [view, cursor])

  useEffect(() => { load() }, [load])

  const handleEventClick = useCallback((event: CalendarEvent, nativeEvent: React.MouseEvent) => {
    if (event.type==='interview' && event.meta?.application_id) onInterviewClick(event.meta.application_id)
    else if (event.type==='intake' && event.meta?.intake_id) onIntakeClick(event.meta.intake_id)
    else if (event.type==='blackout' || event.type==='custom') { /* no action */ }
    else {
      const rect = (nativeEvent.currentTarget as HTMLElement).getBoundingClientRect()
      setExternalPopup({ event, anchorRect: rect })
    }
  }, [onInterviewClick, onIntakeClick])

  const refresh = useCallback(() => { calendarService.clearCache(); load() }, [load])

  return (
    <div className={`flex flex-col h-full${isFullscreen ? ' fixed inset-0 z-50 bg-background' : ''}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={()=>setCursor(moveCursor(view,cursor,-1))}>
            <ChevronLeft className="w-4 h-4"/>
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={()=>setCursor(moveCursor(view,cursor,1))}>
            <ChevronRight className="w-4 h-4"/>
          </Button>
          <span className="font-heading font-bold text-sm truncate ml-1">{getHeaderLabel(view,cursor)}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" variant="outline" className="h-8 text-xs px-3" onClick={()=>{setView('today');setCursor(new Date())}}>
            Today
          </Button>
          <div className="flex rounded-xl border border-border overflow-hidden">
            {(['today','week','month'] as View[]).map(v=>(
              <button key={v} onClick={()=>{setView(v);if(v==='today')setCursor(new Date())}}
                className={`px-3 py-1.5 text-xs font-medium transition-colors capitalize ${view===v?'bg-primary text-primary-foreground':'text-muted-foreground hover:bg-muted'}`}>
                {v==='today'?'Day':v.charAt(0).toUpperCase()+v.slice(1)}
              </button>
            ))}
          </div>
          <Tooltip label="Refresh calendar">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 shrink-0" onClick={refresh} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading?'animate-spin':''}`}/>
            </Button>
          </Tooltip>
          <Tooltip label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 shrink-0" onClick={() => setIsFullscreen(f => !f)}>
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5"/> : <Maximize2 className="w-3.5 h-3.5"/>}
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Calendar body */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {error && !loading && (
          <div className="px-4 py-2 text-xs text-destructive bg-destructive/5 border-b border-destructive/20 shrink-0">{error}</div>
        )}

        <div className="flex-1 overflow-hidden relative min-h-0">
          {loading && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-20 pointer-events-none">
              <span className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"/>
            </div>
          )}
          {view==='today' && <DayView date={cursor} events={events} onEventClick={handleEventClick}/>}
          {view==='week'  && <WeekView cursor={cursor} events={events} onEventClick={handleEventClick}/>}
          {view==='month' && <MonthView cursor={cursor} events={events} onEventClick={handleEventClick}/>}
        </div>

        {/* Bottom bar with legend + Block + Create Event */}
        <BottomBar onBlock={()=>setShowBlockModal(true)} onCreate={()=>setShowCreateModal(true)} />
      </div>

      {externalPopup && (
        <ExternalEventPopup event={externalPopup.event} anchorRect={externalPopup.anchorRect} onClose={()=>setExternalPopup(null)}/>
      )}

      <Dialog open={showBlockModal} onClose={()=>setShowBlockModal(false)}
        title="Block Time or Day"
        description="Blocked slots are hidden from applicants and shown on the calendar."
        className="max-w-md">
        <BlockModalContent onClose={()=>setShowBlockModal(false)} onCreated={refresh}/>
      </Dialog>

      <Dialog open={showCreateModal} onClose={()=>setShowCreateModal(false)}
        title="Create Calendar Event"
        description="Synced to the admissions Google Calendar. Visible only to admins."
        className="max-w-md">
        <CreateEventModalContent onClose={()=>setShowCreateModal(false)} onCreated={refresh}/>
      </Dialog>
    </div>
  )
}
