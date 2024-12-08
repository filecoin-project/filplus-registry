import { type AllocationRequest, type Application } from '@/type'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import bytes from 'bytes-iec'
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export const getCurrentDate = (): string => {
  const now = new Date()

  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
  const hours = String(now.getUTCHours()).padStart(2, '0')
  const minutes = String(now.getUTCMinutes()).padStart(2, '0')
  const seconds = String(now.getUTCSeconds()).padStart(2, '0')

  const milliseconds = String(now.getUTCMilliseconds()).padStart(3, '0')
  const nanoseconds = '000000'

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}${nanoseconds} UTC`
}

/**
 * This function is used to convert string formatted bytes to bytes
 *
 * @param inputDatacap
 * @returns number
 */
export function anyToBytes(inputDatacap: string): number {
  try {
    const parsedBytes = bytes.parse(inputDatacap)
    if (parsedBytes) {
      return parsedBytes
    } else {
      console.error(`Failed to parse string ${inputDatacap} into bytes`)
      return 0
    }
  } catch (e) {
    console.error(e)
    return 0
  }
}

export const getLastDatacapAllocation = (
  application: Application,
): AllocationRequest | undefined => {
  if (application.Lifecycle['Active Request ID'] === null) {
    return undefined
  }
  const lastAllocation = application['Allocation Requests'].find(
    (allocation: AllocationRequest) =>
      allocation.ID === application.Lifecycle['Active Request ID'],
  )

  if (lastAllocation === undefined || lastAllocation.Active) {
    return undefined
  }

  return lastAllocation
}

export const shortenUrl = (
  url: string,
  first: number,
  last: number,
): string => {
  if (url.length <= first + last) {
    return url
  }

  const start = url.slice(0, first)
  const end = url.slice(-last)

  return `${start}[...]${end}`
}

/**
 * This function is used to convert bytes to string formatted bytes iB
 *
 * @param inputBytes
 * @returns string
 */
export function bytesToiB(inputBytes: number): string {
  try {
    const parsedValue = bytes(inputBytes, { mode: 'binary' })
    if (parsedValue) {
      return parsedValue
    } else {
      console.error(`Failed to parse bytes ${inputBytes} into string`)
      return '0GiB'
    }
  } catch (e) {
    console.error(e)
    return '0GiB'
  }
}

export const calculateDatacap = (
  percentage: string,
  totalDatacap: string,
): string => {
  const totalBytes = anyToBytes(totalDatacap)
  const datacap = totalBytes * (parseFloat(percentage) / 100)
  return bytesToiB(datacap)
}
