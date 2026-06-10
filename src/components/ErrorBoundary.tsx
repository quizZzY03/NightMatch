import { Component, ErrorInfo, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message ?? 'Unknown error' }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production console is stripped by vite; in dev this helps debugging
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div
        className="h-full flex flex-col items-center justify-center p-8 text-center"
        style={{ background: '#0a0a12' }}
      >
        <div className="text-5xl mb-4">😵</div>
        <h2 className="text-xl font-black text-white mb-2">משהו השתבש</h2>
        <p className="text-white/40 text-sm mb-6 max-w-xs leading-relaxed">
          {navigator.language.startsWith('he')
            ? 'אירעה שגיאה בלתי צפויה. רענן את הדף כדי להמשיך.'
            : 'An unexpected error occurred. Refresh the page to continue.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 rounded-2xl text-sm font-bold text-white"
          style={{
            background: 'linear-gradient(135deg, hsl(290,100%,55%), hsl(320,100%,50%))',
            boxShadow: '0 0 20px hsl(290,100%,65%,0.3)',
          }}
        >
          🔄 רענן
        </button>
      </div>
    )
  }
}
