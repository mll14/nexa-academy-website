import { revalidateTag } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'

// Maps Sanity document types to cache tags
const typeToTags: Record<string, string[]> = {
  homePage: ['homePage'],
  page: ['pages'],
  navigation: ['navigation'],
  footer: ['footer'],
  siteSettings: ['siteSettings'],
  testimonial: ['homePage', 'pages'],
  faq: ['homePage', 'pages'],
  partner: ['homePage', 'pages'],
  teamMember: ['homePage', 'pages'],
}

const UNAUTHORIZED = NextResponse.json({ message: 'Invalid secret' }, { status: 401 })

export async function POST(req: NextRequest) {
  // Secret must arrive in the header only — never in the URL (would appear in server logs)
  const secret = req.headers.get('x-sanity-webhook-secret')
  const expected = process.env.SANITY_WEBHOOK_SECRET

  if (!secret || !expected) return UNAUTHORIZED

  const a = Buffer.from(secret)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return UNAUTHORIZED

  try {
    const body = await req.json()
    const docType: string = body._type ?? ''
    const docId: string = body._id ?? ''

    const tags = typeToTags[docType] ?? ['pages']

    // Revalidate the specific page slug tag if available
    if (docType === 'page' && docId) {
      // slug is not in the webhook body — revalidate all pages
      revalidateTag('pages')
    }

    tags.forEach(revalidateTag)

    return NextResponse.json({ revalidated: true, tags })
  } catch {
    return NextResponse.json({ message: 'Failed to parse body' }, { status: 400 })
  }
}
