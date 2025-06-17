'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { type AllocationRequest } from '@/type'
import { requestTypeColor, allocationActiveColor } from '@/lib/constants'
import { Separator } from '../ui/separator'
import { FaChevronDown, FaChevronUp } from 'react-icons/fa'
import { bytesToiB } from '@/lib/utils'
import { config } from '@/config'

interface ComponentProps {
  allocation: AllocationRequest
  actor: string
}

const AppHistoryCard: React.FC<ComponentProps> = ({ allocation, actor }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const toggleExpanded = (): void => {
    if (allocation.Signers.length === 0) return
    setIsExpanded(!isExpanded)
  }

  return (
    <Card className="bg-gray-50 p-4 rounded-lg shadow-lg">
      <CardHeader
        className={`pb-2 mb-4 flex justify-between w-full ${
          allocation.Signers.length !== 0 ? 'cursor-pointer' : ''
        } ${isExpanded ? 'border-b' : ''}`}
        onClick={toggleExpanded}
      >
        <div className="flex justify-between w-full">
          <div>
            <CardTitle className="text-md font-medium">
              Allocation Amount:{' '}
              <span className="bg-gray-200 rounded-md px-2 py-1 text-xs">
                {bytesToiB(allocation.AllocationAmountInBytes ?? 0)}
              </span>
              <span
                className={`ml-2 px-2 py-1 rounded text-xs ${
                  requestTypeColor[
                    allocation['Request Type'] as keyof typeof requestTypeColor
                  ] ?? requestTypeColor.default
                }`}
              >
                {allocation['Request Type'] === 'First'
                  ? 'Initial'
                  : allocation['Request Type']}
              </span>
              {allocation.Active ? (
                <span
                  className={`ml-2 px-2 py-1 rounded text-xs ${allocationActiveColor.active}`}
                >
                  Active
                </span>
              ) : (
                <span
                  className={`ml-2 px-2 py-1 rounded text-xs ${allocationActiveColor.inactive}`}
                >
                  Granted
                </span>
              )}
            </CardTitle>
            {allocation['Request Type'] === 'First' && (
              <>
                <span className="text-gray-500 text-sm mr-2">
                  Triggered by{' '}
                </span>
                <a
                  href={`https://github.com/${actor}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  @{actor}
                </a>
              </>
            )}
          </div>
          <div className="flex items-center">
            <span className="text-gray-500 text-sm mr-2">
              {new Date(allocation['Created At']).toLocaleString(undefined, {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
            {allocation.Signers.length === 0 ? (
              <></>
            ) : isExpanded ? (
              <FaChevronUp />
            ) : (
              <FaChevronDown />
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          {allocation.Signers.length > 0 && (
            <>
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="text-sm text-muted-foreground">
                    Proposed by -{' '}
                    <span className="text-xs text-gray-400">
                      {new Date(
                        allocation.Signers[0]['Created At'],
                      ).toLocaleString(undefined, {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                  <div>
                    <a
                      href={`https://github.com/${allocation.Signers[0]['Github Username']}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700"
                    >
                      @{allocation.Signers[0]['Github Username']}
                    </a>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="text-muted-foreground">Address</div>
                  <div>
                    <a
                      href={`${config.filfoxUrl}/address/${allocation.Signers[0]['Signing Address']}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700"
                    >
                      {allocation.Signers[0]['Signing Address']}
                    </a>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="text-muted-foreground">Message CID</div>
                  <div>
                    <a
                      href={`${config.filfoxUrl}/message/${allocation.Signers[0]['Message CID']}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700"
                    >
                      {allocation.Signers[0]['Message CID']}
                    </a>
                  </div>
                </div>
              </div>
            </>
          )}

          {allocation.Signers.length > 1 && (
            <>
              <Separator className="my-4" />
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="text-sm text-muted-foreground">
                    Approved by -{' '}
                    <span className="text-xs text-gray-400">
                      {new Date(
                        allocation.Signers[1]['Created At'],
                      ).toLocaleString(undefined, {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>
                  <div>
                    <a
                      href={`https://github.com/${allocation.Signers[1]['Github Username']}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700"
                    >
                      @{allocation.Signers[1]['Github Username']}
                    </a>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="text-muted-foreground">Address</div>
                  <div>
                    <a
                      href={`${config.filfoxUrl}/address/${allocation.Signers[1]['Signing Address']}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700"
                    >
                      {allocation.Signers[1]['Signing Address']}
                    </a>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="text-muted-foreground">Message CID</div>
                  <div>
                    <a
                      href={`${config.filfoxUrl}/message/${allocation.Signers[1]['Message CID']}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700"
                    >
                      {allocation.Signers[1]['Message CID']}
                    </a>
                  </div>
                </div>
              </div>
            </>
          )}
          <Separator className="my-4" />

          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                Allocation amount in bytes
              </p>
              <p className="text-muted-foreground select-text">
                {allocation.AllocationAmountInBytes}
              </p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export default AppHistoryCard
