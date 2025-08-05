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
import { getAllowanceForClient, getMsigPendingTransaction } from './glifApi'
import { getApplicationsByClientContractAddress } from './apiClient'

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
  const lastAllocation = application['Allocation Requests'].findLast(
    (allocation: AllocationRequest) => !allocation.Active,
  )
  return lastAllocation
}

export const getLastPositiveDatacapAllocation = (
  application: Application,
): AllocationRequest | undefined => {
  if (application.Lifecycle['Active Request ID'] === null) {
    return undefined
  }
  const lastAllocation = application['Allocation Requests'].findLast(
    (allocation: AllocationRequest) =>
      !allocation.Active && anyToBytes(allocation['Allocation Amount']) > 0,
  )
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
      } else if (
        transaction.Method === 4 &&
        transaction.To ===
          `${config.isTestnet ? CoinType.TEST : CoinType.MAIN}06`
      ) {
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

export const getUnallocatedDataCapFromContract = async (
  contractAddress: string,
  getAllowanceFromClientContract: (
    clientAddress: string,
    contractAddress: string,
  ) => Promise<bigint>,
): Promise<number> => {
  const getAllowanceForClientContract =
    await getAllowanceForClient(contractAddress)
  let totalClientContractDataCap
  if (getAllowanceForClientContract.success) {
    totalClientContractDataCap = Number(getAllowanceForClientContract.data)
  } else {
    throw new Error(
      `Failed to get allowance for contract: ${contractAddress}. Error: ${getAllowanceForClientContract.error}`,
    )
  }
  const applicationsWithTheSameClientContract =
    await getApplicationsByClientContractAddress(contractAddress)
  if (applicationsWithTheSameClientContract.length === 0) {
    return 0
  }
  const allowances = await Promise.all(
    applicationsWithTheSameClientContract.map(async (app) => {
      try {
        return Number(
          await getAllowanceFromClientContract(app.ID, contractAddress),
        )
      } catch (error: unknown) {
        console.error(
          `Failed to get allowance for application ${app.ID}: ${(error as Error).message}`,
        )
        return 0
      }
    }),
  )
  const totalAllocatedDataCapToClients = allowances.reduce(
    (sum, val) => sum + val,
    0,
  )
  return totalClientContractDataCap - totalAllocatedDataCapToClients
}

export const getDataCapToSendToContract = async (
  proposalAllocationAmount: string,
  clientContractAddress: string | null,
  getAllowanceFromClientContract: (
    clientAddress: string,
    contractAddress: string,
  ) => Promise<bigint>,
  evmClientAddress?: string,
): Promise<{
  skipSendingDataCapToContract: boolean
  amountOfDataCapSentToContract?: string
}> => {
  if (clientContractAddress && evmClientAddress) {
    const unallocatedDatacapOnContract =
      await getUnallocatedDataCapFromContract(
        clientContractAddress,
        getAllowanceFromClientContract,
      )
    if (unallocatedDatacapOnContract > 0) {
      const datacapToSendToContract =
        anyToBytes(proposalAllocationAmount) - unallocatedDatacapOnContract
      if (datacapToSendToContract > 0) {
        return {
          skipSendingDataCapToContract: false,
          amountOfDataCapSentToContract: bytesToiB(
            datacapToSendToContract,
            'B' as AllocationUnit,
          ),
        }
      } else {
        return { skipSendingDataCapToContract: true }
      }
    }
  }
  return { skipSendingDataCapToContract: false }
}
