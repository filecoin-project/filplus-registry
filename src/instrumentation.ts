import * as Sentry from '@sentry/nextjs'

export const register = async (): Promise<void> => {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config')
  }
}

export const onRequestError = Sentry.captureRequestError
