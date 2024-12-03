'use client'
import Script from 'next/script'
import { config } from '@/config'

const Analytics: React.FC = () => {
  return (
    <>
      <Script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${config.gaTrackingId}`}
      ></Script>
      <Script id="ga-script">
        {`window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', '${config.gaTrackingId}');`}
      </Script>
    </>
  )
}
export default Analytics
