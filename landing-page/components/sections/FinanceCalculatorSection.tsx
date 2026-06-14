'use client'
import { useState, useEffect } from 'react'
import { Wallet, TrendingDown } from 'lucide-react'
import { SectionWrapper } from './SectionWrapper'
import { SectionHeader } from './SectionHeader'
import type { FinanceCalculatorSection as FinanceCalculatorSectionType } from '@/types'

type Plan = 'one-time' | '2-installments' | '3-installments'

interface Program {
  id: string | number
  slug: string
  title: string
  price: number | null
}

function calcSummary(base: number, plan: Plan) {
  const inst2Per = Math.round((base * 1.1) / 2 / 500) * 500
  const inst2Total = inst2Per * 2
  const inst3Per = Math.round((base * 1.2) / 3 / 500) * 500
  const inst3Total = inst3Per * 3

  if (plan === 'one-time') {
    return { total: base, per: base, count: 1, label: 'One-time payment', savings: inst3Total - base, savingsLabel: 'vs 3-instalment plan' }
  }
  if (plan === '3-installments') {
    return { total: inst3Total, per: inst3Per, count: 3, label: '3 instalments', savings: 0, savingsLabel: '' }
  }
  return { total: inst2Total, per: inst2Per, count: 2, label: '2 instalments', savings: inst3Total - inst2Total, savingsLabel: 'vs 3-instalment plan' }
}

const PLANS: { id: Plan; label: string; note: string }[] = [
  { id: 'one-time', label: 'One-time', note: 'Best value' },
  { id: '2-installments', label: '2 Instalments', note: '+10%' },
  { id: '3-installments', label: '3 Instalments', note: '+20%' },
]

export function FinanceCalculatorSection({ section }: { section: FinanceCalculatorSectionType }) {
  const [programs, setPrograms] = useState<Program[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [plan, setPlan] = useState<Plan>('one-time')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.nexaacademy.co.ke'
    fetch(`${BASE}/api/programs/`)
      .then((r) => r.json())
      .then((data) => {
        const list: Program[] = Array.isArray(data) ? data : (data.results ?? [])
        const active = list.filter((p) => p.price != null)
        setPrograms(active)
        if (active.length > 0) setSelectedId(String(active[0].id ?? active[0].slug))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const program = programs.find((p) => String(p.id ?? p.slug) === selectedId) ?? programs[0]
  const base = program?.price ?? 150000
  const summary = calcSummary(base, plan)

  return (
    <SectionWrapper section={section}>
      <SectionHeader title={section.sectionTitle} subtitle={section.sectionSubtitle} />

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Program selector */}
        {loading ? (
          <div className="h-11 rounded-lg bg-muted animate-pulse" />
        ) : programs.length > 1 ? (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Select Program</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none cursor-pointer"
            >
              {programs.map((p) => (
                <option key={String(p.id ?? p.slug)} value={String(p.id ?? p.slug)}>
                  {p.title} — KSh {Number(p.price ?? 0).toLocaleString()}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {/* Plan tabs */}
        <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-muted p-1">
          {PLANS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPlan(p.id)}
              className={`flex flex-col items-center rounded-lg py-2.5 px-3 text-sm font-medium transition-all ${
                plan === p.id
                  ? 'bg-white shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{p.label}</span>
              <span className="text-[11px] font-normal mt-0.5 opacity-70">{p.note}</span>
            </button>
          ))}
        </div>

        {/* Summary card */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Wallet className="w-4 h-4 text-primary" />
            {loading ? 'Loading programs…' : (program?.title ?? 'Program Fee')}
          </div>

          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-4xl font-extrabold text-primary">
                KSh {summary.total.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{summary.label}</p>
            </div>
            {summary.savings > 0 && (
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 justify-end text-green-600">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <p className="text-xs">You save</p>
                </div>
                <p className="text-lg font-bold text-green-600">KSh {summary.savings.toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground">{summary.savingsLabel}</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-border space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium">{summary.label}</span>
            </div>
            {summary.count > 1 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Per instalment</span>
                <span className="font-medium">KSh {summary.per.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold text-foreground">KSh {summary.total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          All prices in Kenyan Shillings (KSh). Instalment surcharges cover processing costs.
        </p>
      </div>
    </SectionWrapper>
  )
}
