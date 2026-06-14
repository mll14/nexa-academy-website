export const runtime = 'edge'

import { revalidateTag } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'

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

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const aBytes = enc.encode(a)
  const bBytes = enc.encode(b)
  if (aBytes.length !== bBytes.length) return false
  let diff = 0
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i]
  return diff === 0
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-sanity-webhook-secret')
  const expected = process.env.SANITY_WEBHOOK_SECRET

  if (!secret || !expected || !timingSafeEqual(secret, expected)) return UNAUTHORIZED

  try {
    const body = await req.json()
    const docType: string = body._type ?? ''
    const docId: string = body._id ?? ''

    const tags = typeToTags[docType] ?? ['pages']

    if (docType === 'page' && docId) {
      revalidateTag('pages')
    }

    tags.forEach(revalidateTag)

    return NextResponse.json({ revalidated: true, tags })
  } catch {
    return NextResponse.json({ message: 'Failed to parse body' }, { status: 400 })
  }
}
