export const dynamic = 'force-static'

import { redirect } from 'next/navigation'

export default function StudioPage() {
  redirect('https://www.sanity.io/manage')
}
