'use client'

import { RecaptchaProvider } from '@/components/application/RecaptchaProvider'
import { AppointmentBookingForm } from '@/app/(site)/appointments/AppointmentBookingForm'
import type { AppointmentFormSection as AppointmentFormSectionType } from '@/types'

export function AppointmentFormSection({ section }: { section: AppointmentFormSectionType }) {
  return (
    <RecaptchaProvider>
      <AppointmentBookingForm section={section} />
    </RecaptchaProvider>
  )
}
