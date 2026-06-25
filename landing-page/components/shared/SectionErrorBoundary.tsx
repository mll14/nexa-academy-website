'use client'

import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode; sectionType?: string }
interface State { error: boolean }

export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { error: false }

  static getDerivedStateFromError(): State {
    return { error: true }
  }

  render() {
    if (this.state.error) {
      if (process.env.NODE_ENV === 'development') {
        return (
          <div className="py-8 text-center text-sm text-muted-foreground border border-dashed border-destructive/40 rounded-lg mx-4">
            Section failed to render{this.props.sectionType ? `: ${this.props.sectionType}` : ''}
          </div>
        )
      }
      return null
    }
    return this.props.children
  }
}
