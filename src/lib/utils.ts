import type {
  ParsedTransaction,
  AllocationRequest,
  Application,
  AllocationUnit,
} from '@/type'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import bytes from 'bytes-iec'
import { decode } from 'cbor-x'
import { bytesToBigInt } from 'viem'
import { Address, CoinType, encode } from '@glif/filecoin-address'
import { config } from '@/config'
import { getMsigPendingTransaction } from './glifApi'
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
export function bytesToiB(inputBytes: number, unit?: AllocationUnit): string {
  try {
    const parsedValue = bytes(inputBytes, { mode: 'binary', unit })
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

export const getParsedMsigPendingTransactionParams = async (
  msigAddress: string,
): Promise<ParsedTransaction[] | any> => {
  const msigTransactions = await getMsigPendingTransaction(msigAddress)
  try {
    const parsedTransaction: ParsedTransaction[] = []
    for (const transaction of msigTransactions) {
      const transactionParamsToBuffer = Buffer.from(
        transaction.Params,
        'base64',
      )
      const decodedTransactionParams = decode(transactionParamsToBuffer)
      const transactionObject: ParsedTransaction = {
        id: transaction.ID,
        tx: {
          from: transaction.Approved[0],
          to: transaction.To,
          value: transaction.Value,
          method: transaction.Method,
          params: transactionParamsToBuffer,
        },
      }
      if (transaction.Method === 3844450837) {
        transactionObject.tx.calldata = decodedTransactionParams
        parsedTransaction.push(transactionObject)
      } else if (transaction.Method === 4 && transaction.To === 'f06') {
        const addressBytes = decodedTransactionParams[0]
        const coinType = config.isTestnet ? CoinType.TEST : CoinType.MAIN
        const address = new Address(addressBytes)
        const encodedAddress = encode(coinType, address)
        const datacapBytes = decodedTransactionParams[1]
        let cap = bytesToBigInt(datacapBytes.slice(1))
        // Check if the first byte is 1, indicating a negative value. Multiply by -1 because datacap cannot be negative.
        if (datacapBytes[0] === 1) {
          cap = cap * BigInt(-1)
        }
        transactionObject.tx.address = encodedAddress
        transactionObject.tx.cap = cap
        parsedTransaction.push(transactionObject)
      }
    }
    return parsedTransaction
  } catch (error: unknown) {
    const errMessage = `Failed to parse msig transaction: ${
      (error as Error).message
    }`

    return { error: { message: errMessage } }
  }
}
