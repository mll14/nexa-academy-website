'use client'

import { useState } from 'react'
import { Wallet } from 'lucide-react'
import { Separator } from '@/components/ui/Separator'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs'

export interface CalcProgram {
  id: string
  title: string
  price: number
}

const PLANS = ['one-time', '2-installments', '3-installments'] as const
type Plan = typeof PLANS[number]

function calcSummary(basePrice: number, plan: Plan) {
  const inst2Per   = Math.round((basePrice * 1.1) / 2 / 500) * 500
  const inst2Total = inst2Per * 2
  const inst3Per   = Math.round((basePrice * 1.2) / 3 / 500) * 500
  const inst3Total = inst3Per * 3

  if (plan === 'one-time') return { total: basePrice,  per: basePrice, count: 1, label: 'One-time payment',  savings: inst3Total - basePrice, savingsLabel: 'vs 3-instalment plan' }
  if (plan === '3-installments') return { total: inst3Total, per: inst3Per, count: 3, label: '3 instalments', savings: 0, savingsLabel: '' }
  return { total: inst2Total, per: inst2Per, count: 2, label: '2 instalments', savings: inst3Total - inst2Total, savingsLabel: 'vs 3-instalment plan' }
}

export function FinanceCalculator({
  programList,
  initialPlan = 'one-time',
}: {
  programList: CalcProgram[]
  initialPlan?: string
}) {
  const [selectedId, setSelectedId] = useState(String(programList[0]?.id ?? ''))
  const [plan, setPlan] = useState<Plan>(PLANS.includes(initialPlan as Plan) ? (initialPlan as Plan) : 'one-time')

  const program   = programList.find((p) => String(p.id) === selectedId) ?? programList[0]
  const basePrice = program?.price ?? 0
  const summary   = calcSummary(basePrice, plan)

  return (
    <section id="finance-calculator" className="w-full scroll-mt-24">
      <div className="rounded-2xl border border-border bg-background p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Wallet className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold">Finance Calculator</h2>
        </div>

        <Separator />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Choose Program</label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a program" />
                </SelectTrigger>
                <SelectContent>
                  {programList.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Plan</label>
              <Tabs value={plan} onValueChange={(v) => setPlan(v as Plan)}>
                <TabsList className="w-full">
                  <TabsTrigger value="one-time"        className="flex-1">One-time</TabsTrigger>
                  <TabsTrigger value="2-installments"  className="flex-1">2 Instalments</TabsTrigger>
                  <TabsTrigger value="3-installments"  className="flex-1">3 Instalments</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-4">
            <p className="text-sm text-muted-foreground">Estimated Total</p>
            <p className="text-3xl sm:text-4xl font-bold text-primary">
              {basePrice > 0 ? `KSh ${summary.total.toLocaleString()}` : '—'}
            </p>
            <Separator />
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex justify-between">
                <span>Plan</span>
                <span className="font-medium text-foreground">{summary.label}</span>
              </li>
              <li className="flex justify-between">
                <span>{summary.count === 1 ? 'Amount due' : 'Per instalment'}</span>
                <span className="font-medium text-foreground">
                  {basePrice > 0 ? `KSh ${summary.per.toLocaleString()}` : '—'}
                </span>
              </li>
              {summary.savings > 0 && (
                <li className="flex justify-between text-green-600 font-semibold">
                  <span>You save ({summary.savingsLabel})</span>
                  <span>KSh {summary.savings.toLocaleString()}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Apply CTA inline */}
        {program && (
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl bg-primary/5 border border-primary/10 px-5 py-4">
            <p className="text-sm text-muted-foreground">
              Ready to enrol in <span className="font-semibold text-foreground">{program.title}</span>?
            </p>
            <a
              href={`/apply?program=${program.id}`}
              className="shrink-0 inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-white hover:bg-primary/90 px-5 py-2.5 text-sm font-semibold transition-colors"
            >
              Apply Now
            </a>
          </div>
        )}
      </div>
    </section>
  )
}
