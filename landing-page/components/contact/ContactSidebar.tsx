import { CheckCircle2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Separator } from '@/components/ui/Separator'
import { Badge } from '@/components/ui/Badge'
import type { LabelValue } from '@/types'

const DEFAULT_RESPONSE_TIMES: LabelValue[] = [
  { label: 'Bootcamp inquiries',    value: 'Under 2 hours'  },
  { label: 'Application follow-up', value: 'Under 24 hours' },
  { label: 'General questions',     value: 'Under 4 hours'  },
]

const DEFAULT_WHY_REACH = [
  'Free program selection guidance',
  'Transparent fee breakdowns and payment plans',
  'Mentor-backed learning and career advice',
  'Fast onboarding support for new students',
]

export function ContactSidebar({
  responseTimes,
  whyReach,
}: {
  responseTimes?: LabelValue[] | null
  whyReach?: string[] | null
}) {
  const times = responseTimes?.length ? responseTimes : DEFAULT_RESPONSE_TIMES
  const items = whyReach?.length      ? whyReach      : DEFAULT_WHY_REACH
  return (
    <div className="space-y-5">
      <Card className="border border-border rounded-2xl">
        <CardContent className="p-5 space-y-4">
          <div>
            <h2 className="font-semibold">Expected Response Times</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Our team responds quickly to all inquiries.</p>
          </div>
          <Separator />
          {times.map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center text-sm rounded-lg bg-muted/30 px-3 py-2.5">
              <span className="text-muted-foreground">{label}</span>
              <Badge variant="outline" className="border-primary text-primary text-xs">{value}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border border-primary/20 bg-primary/5 rounded-2xl">
        <CardContent className="p-5 space-y-4">
          <h3 className="font-semibold">Why reach out?</h3>
          <Separator className="bg-primary/20" />
          <ul className="space-y-3 text-sm text-muted-foreground">
            {items.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
