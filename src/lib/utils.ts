import {
  type AllocationRequest,
  type Application,
  type ByteConverterAutoscaleOptions,
} from '@/type'
import ByteConverter from '@wtfcode/byte-converter'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

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

const byteConverter = new ByteConverter()

/**
 * This function is used to convert string formatted bytes to bytes
 *
 * @param inputDatacap
 * @returns number
 */
export function anyToBytes(inputDatacap: string): number {
  const formatDc = inputDatacap
    .replace(/[t]/g, 'T')
    .replace(/[b]/g, 'B')
    .replace(/[p]/g, 'P')
    .replace(/[I]/g, 'i')
    .replace(/\s*/g, '')
  const ext = formatDc.replace(/[0-9.]/g, '')
  const datacap = formatDc.replace(/[^0-9.]/g, '')
  try {
    const bytes = byteConverter.convert(parseFloat(datacap), ext, 'B')
    return bytes
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
export function bytesToiB(inputBytes: number, isBinary: boolean): string {
  const options: {
    preferByte: boolean
    preferBinary: boolean
    preferDecimal: boolean
  } = {
    preferByte: true,
    preferBinary: isBinary,
    preferDecimal: !isBinary,
  }
  let autoscale = byteConverter.autoScale(
    inputBytes,
    'B',
    options as ByteConverterAutoscaleOptions,
  )
  let stringVal = ''
  if (autoscale.dataFormat === 'YiB') {
    autoscale = byteConverter.autoScale(
      inputBytes - 32,
      'B',
      options as ByteConverterAutoscaleOptions,
    )
    return `${autoscale.value.toFixed(1)}${autoscale.dataFormat}`
  }
  stringVal = String(autoscale.value)

  const indexOfDot = stringVal.indexOf('.')
  return `${stringVal.substring(
    0,
    indexOfDot > 0 ? indexOfDot : stringVal.length,
  )}${indexOfDot > 0 ? stringVal.substring(indexOfDot, indexOfDot + 3) : ''}${
    autoscale.dataFormat
  }`
}

export const calculateDatacap = (
  percentage: string,
  totalDatacap: string,
): string => {
  const isBinary = totalDatacap.toLowerCase().includes('ib')
  const totalBytes = anyToBytes(totalDatacap)
  const datacap = totalBytes * (parseFloat(percentage) / 100)
  return bytesToiB(datacap, isBinary)
}
