import React, { useState, useEffect } from 'react'

interface TimeLeft {
  days?: string
  hours?: string
  minutes?: string
  seconds?: string
}

const Countdown: React.FC = () => {
  const calculateTimeLeft = (): TimeLeft => {
    const targetDate = new Date(new Date().getFullYear(), 5, 1) // June 1st
    const now = new Date()
    const difference = targetDate.getTime() - now.getTime()

    let timeLeft: TimeLeft = {}

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24))
          .toString()
          .padStart(2, '0'),
        hours: Math.floor(
          (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
        )
          .toString()
          .padStart(2, '0'),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
          .toString()
          .padStart(2, '0'),
        seconds: Math.floor((difference % (1000 * 60)) / 1000)
          .toString()
          .padStart(2, '0'),
      }
    }

    return timeLeft
  }

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft())
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => {
      clearInterval(timer)
    }
  }, [])

  if (!isMounted) {
    return null
  }

  if (timeLeft.seconds === undefined) {
    return null
  }

  return (
    <div className="px-6 pb-6">
      <p
        className="cursor-default"
        title="Using Client smart contract is available only for new applications. Select Contract as allocation type to start using it"
      >
        Direct client allocation will be deprecated in{' '}
        <span className="inline-block text-center" style={{ width: '90px' }}>
          {timeLeft.days}:{timeLeft.hours}:{timeLeft.minutes}:{timeLeft.seconds}
        </span>
        . Start using the Client smart contract today.
      </p>
    </div>
  )
}

export default Countdown
