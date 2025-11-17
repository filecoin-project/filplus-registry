'use client'
import Script from 'next/script'
import { config } from '@/config'

const Analytics: React.FC = () => {
  return (
    <>
      {/* Privacy-friendly analytics by Plausible */}
      <Script
        async
        src={`https://plausible.io/js/${config.plausibleTrackingId}.js`}
      ></Script>
      <Script>
        {`
         window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};
  plausible.init()
      `}
      </Script>
    </>
  )
}
export default Analytics
