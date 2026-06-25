import type { NextConfig } from 'next'

const config: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        pathname: '/images/**',
      },
    ],
  },
  async headers() {
    const securityHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-XSS-Protection', value: '0' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'Permissions-Policy', value: 'geolocation=(), camera=(), microphone=(), payment=(), usb=()' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https://cdn.sanity.io",
          "connect-src 'self' https://cdn.sanity.io https://*.sanity.io wss://*.sanity.io https://api.nexaacademy.co.ke https://www.google.com https://www.gstatic.com",
          "font-src 'self'",
          "frame-src 'self' https://www.google.com https://recaptcha.google.com",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; '),
      },
    ]

    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        source: '/studio/:path*',
        headers: [
          ...securityHeaders.filter(
            (h) => h.key !== 'X-Frame-Options' && h.key !== 'Content-Security-Policy' && h.key !== 'Cross-Origin-Resource-Policy',
          ),
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.sanity.io",
              "style-src 'self' 'unsafe-inline' https://cdn.sanity.io",
              "img-src 'self' data: blob: https://cdn.sanity.io https://lh3.googleusercontent.com",
              "connect-src 'self' https://*.sanity.io wss://*.sanity.io https://api.sanity.io",
              "font-src 'self' https://cdn.sanity.io",
              "frame-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default config
