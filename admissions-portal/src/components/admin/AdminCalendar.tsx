import { useNavigate } from '@tanstack/react-router'
import { Card } from '../ui/card'
import { CalendarView } from './calendar/CalendarView'

export function AdminCalendar() {
  const navigate = useNavigate()

  return (
    <Card className="border rounded-2xl overflow-hidden h-[640px]">
      <CalendarView
        onInterviewClick={(applicationId) =>
          navigate({ to: '/admin/applications/$id', params: { id: applicationId } })
        }
        onIntakeClick={() => {
          // Intake detail not yet implemented — navigate to intakes list
          navigate({ to: '/admin/intakes' })
        }}
      />
    </Card>
  )
}
