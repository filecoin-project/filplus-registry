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
      }
    }

    return timeLeft
  }

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft())

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => {
      clearInterval(timer)
    }
  }, [])

  if (timeLeft.minutes === undefined) {
    return null
  }

  return (
    <div className="px-6">
      <p
        className="cursor-default"
        title="Using Client smart contract is available only for new applications. Select Contract as allocation type to start using it"
      >
        Direct allocation of DataCap will be deprecated in{' '}
        <span className="whitespace-nowrap">
          {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m
        </span>{' '}
        (June 1). Start using the Client smart contract today.
      </p>
    </div>
  )
}

export default Countdown
