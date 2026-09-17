/// <reference types="vite/client" />

interface GoogleIdConfiguration {
  client_id: string
  callback: (response: { credential: string }) => void
  auto_select?: boolean
  cancel_on_tap_outside?: boolean
}

interface GoogleButtonConfiguration {
  type?: 'standard' | 'icon'
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'large' | 'medium' | 'small'
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
  shape?: 'rectangular' | 'pill' | 'circle' | 'square'
  logo_alignment?: 'left' | 'center'
  width?: number | string
}

interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (config: GoogleIdConfiguration) => void
        renderButton: (parent: HTMLElement, options: GoogleButtonConfiguration) => void
        prompt: (notification?: (notification: unknown) => void) => void
      }
    }
  }
}