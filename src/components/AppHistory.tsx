'use client'
import type { AllocationUnit, AllocationRequest } from '@/type'
import AppHistoryCard from './cards/AppHistoryCard'
import moment from 'moment'
import { anyToBytes, bytesToiB } from '@/lib/utils'
import { splitString } from '@/helpers/calculateAmountToRefill'

interface ComponentProps {
  datacapAllocations: AllocationRequest[]
  actor: string
  totalRequestedAmount: string
}

const AppHistory: React.FC<ComponentProps> = ({
  datacapAllocations,
  actor,
  totalRequestedAmount,
}: ComponentProps) => {
  const sortedAllocations = [...datacapAllocations].sort((a, b) => {
    return moment(b['Created At']).valueOf() - moment(a['Created At']).valueOf()
  })
  const totalAllocation = datacapAllocations?.reduce(
    (acc: number, curr: AllocationRequest) => {
      const amount = anyToBytes(curr['Allocation Amount'])
      return acc + amount
    },
    0,
  )
  const [, unit] = splitString(totalRequestedAmount)
  const totalAllocationFormatted = bytesToiB(
    totalAllocation,
    unit as AllocationUnit,
  )

  return (
    <>
      <h2 className="text-3xl font-bold tracking-tight mb-4">
        Application History
      </h2>
      <div className="mt-2 mb-4 font-medium">
        Total Allocation Amount - {totalAllocationFormatted} /{' '}
        {totalRequestedAmount}
      </div>
      <div className="grid gap-4 w-full select-none">
        {sortedAllocations.length === 0 ? (
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            No allocation yet.
          </div>
        ) : (
          sortedAllocations.map((allocation) => (
            <AppHistoryCard
              key={allocation.ID}
              allocation={allocation}
              actor={actor}
            />
          ))
        )}
      </div>
    </>
  )
}

export default AppHistory
