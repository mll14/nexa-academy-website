import type { ReactElement } from 'react'
import type { SocialProvider } from '../config/authProvider'

/**
 * Brand marks for the social sign-in buttons. Kept as inline SVGs because lucide-react
 * no longer ships brand logos. Google/Microsoft use their official brand colors; GitHub
 * uses currentColor so it adapts to light/dark themes.
 */

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.06 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h6.2c-.27 1.44-1.08 2.66-2.3 3.48v2.89h3.72c2.18-2 3.44-4.96 3.44-8.38z" />
      <path fill="#34A853" d="M12 24c3.11 0 5.72-1.03 7.62-2.79l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.54-2.03-6.45-4.75H1.7v2.98C3.6 21.42 7.5 24 12 24z" />
      <path fill="#FBBC05" d="M5.55 14.67c-.23-.69-.36-1.42-.36-2.17s.13-1.48.36-2.17V7.35H1.7C.92 8.9.5 10.4.5 12s.42 3.1 1.2 4.65l3.85-2.98z" />
      <path fill="#EA4335" d="M12 4.75c1.69 0 3.21.58 4.4 1.72l3.3-3.3C17.72 1.19 15.11 0 12 0 7.5 0 3.6 2.58 1.7 6.35l3.85 2.98C6.46 6.61 9 4.75 12 4.75z" />
    </svg>
  )
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#7FBA00" d="M13 1h10v10H13z" />
      <path fill="#00A4EF" d="M1 13h10v10H1z" />
      <path fill="#FFB900" d="M13 13h10v10H13z" />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.05-.02-2.06-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.83 1.24 1.83 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.95 0-1.32.47-2.39 1.24-3.23-.12-.31-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.87.12 3.18.77.84 1.24 1.91 1.24 3.23 0 4.62-2.81 5.64-5.49 5.94.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.22.7.83.58C20.56 22.29 24 17.8 24 12.5 24 5.87 18.63.5 12 .5z" />
    </svg>
  )
}

const ICONS: Record<SocialProvider, () => ReactElement> = {
  google: GoogleIcon,
  microsoft: MicrosoftIcon,
  github: GitHubIcon,
}

export function SocialIcon({ provider }: { provider: SocialProvider }) {
  const Icon = ICONS[provider]
  return Icon ? <Icon /> : null
}
