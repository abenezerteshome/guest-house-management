import React, { Component, type ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from './Button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Haven House caught an unhandled error:', error, errorInfo)
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F7F7F7] p-6 text-[#222222]">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#DDDDDD] shadow-[0_4px_24px_rgba(0,0,0,0.06)] text-center space-y-5">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FFF0F2] border border-[#FFD2D9] flex items-center justify-center text-[#FF385C]">
              <AlertCircle size={28} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-[#222222]">Something went wrong</h2>
              <p className="text-sm text-[#717171] leading-relaxed">
                An unexpected interface error occurred. You can reload the page to restore your active desk session.
              </p>
              {this.state.error && (
                <div className="mt-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-left font-mono text-xs text-neutral-600 overflow-x-auto">
                  {this.state.error.message}
                </div>
              )}
            </div>
            <div className="pt-2">
              <Button
                variant="primary"
                className="w-full justify-center gap-2"
                onClick={() => window.location.reload()}
              >
                <RefreshCw size={16} />
                <span>Reload Haven House</span>
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
