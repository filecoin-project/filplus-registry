/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/consistent-type-imports */
'use client'
import CookieConsent from 'react-cookie-consent'
import {
  createContext,
  PropsWithChildren,
  useContext,
  useLayoutEffect,
  useState,
} from 'react'
import Analytics from './Analytics'

interface ICookieContext {
  showCookieConsent: boolean
  cookieConsentState: boolean
  setCookieConsentState: (value: boolean) => void
}

const CookieContext = createContext<ICookieContext>({
  showCookieConsent: false,
  cookieConsentState: false,
  setCookieConsentState: (value: boolean) => {},
})

export const CookieBanner = ({ children }: PropsWithChildren) => {
  const [showCookieConsent, setShowCookieConsent] = useState(false)
  const [cookieConsentState, setCookieConsentState] = useState(false)

  useLayoutEffect(() => {
    const cookieConsent = localStorage.getItem('analytics-consent')
    if (cookieConsent === null) {
      setShowCookieConsent(true)
    } else {
      setCookieConsentState(cookieConsent === 'true')
    }
  }, [])

  const handleAccept = (): void => {
    localStorage.setItem('analytics-consent', 'true')
    setCookieConsentState(true)
  }

  const handleDecline = (): void => {
    localStorage.setItem('analytics-consent', 'false')
    setCookieConsentState(false)
  }

  return (
    <CookieContext.Provider
      value={{ showCookieConsent, cookieConsentState, setCookieConsentState }}
    >
      {children}
      {showCookieConsent && (
        <CookieConsent
          style={{
            background: '#fff',
            boxShadow: '0 -4px 6px rgba(0, 0, 0, 0.1)',
            color: '#000',
            fontSize: '14px',
            paddingInline: '2.5rem',
            fontWeight: '500',
          }}
          contentStyle={{ marginInline: '1rem' }}
          enableDeclineButton
          flipButtons
          buttonText="Accept"
          buttonStyle={{
            background: '#3b82f6',
            color: '#fff',
            borderRadius: '6px',
            fontSize: '14px',
            paddingBlock: '8px',
            paddingInline: '16px',
            fontWeight: '500',
          }}
          declineButtonText="Decline"
          declineButtonStyle={{
            background: '#f87171',
            color: '#000',
            borderRadius: '6px',
            fontSize: '14px',
            paddingBlock: '8px',
            paddingInline: '16px',
            marginRight: '0px',
            fontWeight: '500',
          }}
          onDecline={() => {
            handleDecline()
          }}
          onAccept={() => {
            handleAccept()
          }}
        >
          We use cookies to improve your experience and analyze traffic with
          Google Analytics. By clicking &quot;Accept&quot; you consent to our
          use of cookies.
        </CookieConsent>
      )}
      {cookieConsentState && <Analytics />}
    </CookieContext.Provider>
  )
}

const useCookie = (): ICookieContext => {
  return useContext(CookieContext)
}

export default useCookie
