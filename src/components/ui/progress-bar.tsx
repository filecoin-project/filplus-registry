import React from 'react'

interface ProgressBarProps {
  progress: number
  label: string
  usedDesc?: string
}

/**
 * Represents a progress bar.
 *
 * @component
 * @prop {number} progress - The progress of the progress bar.
 * @prop {string} label - The label of the progress bar.
 */
const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  label,
  usedDesc,
}) => {
  const greenProgress = Math.min(progress, 50)
  const yellowProgress = Math.min(Math.max(progress - 50, 0), 35)
  const redProgress = Math.min(Math.max(progress - 85, 0), 15)

  return (
    <div className="relative pt-1">
      <div className="flex mb-2 items-center justify-between">
        <div>
          <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
            {label}
          </span>
        </div>
        <div className="text-right">
          <span className="text-xs font-semibold inline-block text-blue-600">
            {usedDesc} ({progress.toFixed(2)}%)
          </span>
        </div>
      </div>
      <div className="flex h-2 mb-4 overflow-hidden text-xs bg-[#ddd] rounded">
        <div
          style={{
            background: `
                linear-gradient(to right, 
                  green 0%,
                  #00ae00 ${greenProgress}%, 
                  yellow ${greenProgress + yellowProgress}%, 
                  red ${greenProgress + yellowProgress + redProgress}%, 
                  #ddd ${greenProgress + yellowProgress + redProgress}%
                )
              `,
            transition: 'width 1s ease-in-out',
          }}
          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center w-full"
        ></div>
      </div>
    </div>
  )
}

export default ProgressBar
