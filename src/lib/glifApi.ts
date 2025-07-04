import type {
  ApiAllowanceResponse,
  ApiEthCallResponse,
  ApiFilecoinAddressToEthAddressResponse,
  ApiStateWaitMsgResponse,
  MsigPendingTransactions,
} from '@/type'
import type { Address, Hex } from 'viem'
import { getAddress } from 'viem'
import { FilecoinClient } from './publicClient'

const filecoinClient = new FilecoinClient()

/**
 * Get the allowance for a verfier from the API.
 *
 * @param {string} address - The address to get the allowance for.
 * @returns {Promise<ApiAllowanceResponse>} ApiAllowanceResponse - The response from the API.
 */
export const getAllowanceForVerifier = async (
  address: string,
): Promise<ApiAllowanceResponse> => {
  try {
    const result = await filecoinClient.verifierStatus(address)

    return {
      data: result ?? '',
      error: '',
      success: true,
    }
  } catch (error: unknown) {
    const errMessage = `Error accessing GLIF API Filecoin.StateVerifierStatus: ${
      (error as Error).message
    }`

    return {
      data: '',
      error: errMessage,
      success: false,
    }
  }
}

/**
 * Get the allowance for a client from the API.
 *
 * @param {string} address - The address to get the allowance for.
 * @returns {Promise<ApiAllowanceResponse>} ApiAllowanceResponse - The response from the API.
 */
export const getAllowanceForClient = async (
  address: string,
): Promise<ApiAllowanceResponse> => {
  try {
    const result = await filecoinClient.verifiedClientStatus(address)

    return {
      data: result ?? '',
      error: '',
      success: true,
    }
  } catch (error: unknown) {
    const errMessage = `Error accessing GLIF API Filecoin.StateVerifiedClientStatus: ${
      (error as Error).message
    }`
    return {
      data: '',
      error: errMessage,
      success: false,
    }
  }
}

/**
 * Get the evm address for a client from the API.
 *
 * @param {string} address - The address to get the evm address for.
 * @returns {Promise<ApiFilecoinAddressToEthAddressResponse>} ApiFilecoinAddressToEthAddressResponse - The response from the API.
 */
export const getEvmAddressFromFilecoinAddress = async (
  address: string,
): Promise<ApiFilecoinAddressToEthAddressResponse> => {
  try {
    const result = await filecoinClient.filecoinAddressToEthAddress(address)

    return {
      data: result ?? getAddress(''),
      error: '',
      success: true,
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('actor not found')) {
      throw new Error(`The client wallet is not initialized on the chain.
      Please send some FIL to this address or ask the client to do so in order to initialize.
      After the first transfer, granting DataCap will be possible approximately 8 hours later.`)
    }
    const errMessage = `Error accessing GLIF API Filecoin.FilecoinAddressToEthAddress: ${
      (error as Error).message
    }`
    throw new Error(errMessage)
  }
}

/**
 * Call the evm contract.
 *
 * @param {Address} contractAddress - The contract address
 * @param {Hex} callData - The call data
 * @returns {Promise<ApiEthCallResponse>}  * @returns {Promise<ApiEthCallResponse>} ApiFilecoinAddressToEthAddressResponse - The response from the API.
 */
export const makeStaticEthCall = async (
  contractAddress: Address,
  callData: Hex,
): Promise<ApiEthCallResponse> => {
  try {
    const result = await filecoinClient.staticCall(
      {
        from: null,
        to: contractAddress,
        data: callData,
      },
      'latest',
    )

    return {
      data: result ?? '',
      error: '',
      success: true,
    }
  } catch (error: unknown) {
    const errMessage = `Error accessing GLIF API Filecoin.EthCall: ${
      (error as Error).message
    }`
    return {
      data: '',
      error: errMessage,
      success: false,
    }
  }
}

/**
 * Wait for a message to appear on chain and get it.
 *
 * @param {string} cid - Transaction CID.
 * @returns {Promise<ApiStateWaitMsgResponse>} ApiStateWaitMsgResponse - The response from the API.
 */
export const getStateWaitMsg = async (
  cid: string,
): Promise<ApiStateWaitMsgResponse> => {
  try {
    const confidence = 1
    const limitChainEpoch = 10
    const allowReplaced = true

    const result = await filecoinClient.waitMsg(
      cid,
      confidence,
      limitChainEpoch,
      allowReplaced,
    )

    return {
      data: result ?? '',
      error: '',
      success: true,
    }
  } catch (error: unknown) {
    const errMessage = `Error accessing GLIF API Filecoin.StateWaitMsg: ${
      (error as Error).message
    }`

    if (errMessage.includes('too long')) {
      return await getStateWaitMsg(cid)
    }
    return {
      data: '',
      error: errMessage,
      success: false,
    }
  }
}

/**
 * Get msig waiting transaction.
 *
 * @param {string} msigAddress - Msig address.
 * @returns {Promise<MsigPendingTransactions>} MsigPendingTransactions - The response from the API.
 */
export const getMsigPendingTransaction = async (
  msigAddress: string,
): Promise<MsigPendingTransactions[] | any> => {
  try {
    const result = await filecoinClient.msigGetPending(msigAddress)
    return result
  } catch (error: unknown) {
    const errMessage = `Error accessing GLIF API Filecoin.MsigGetPending: ${
      (error as Error).message
    }`

    return { error: { message: errMessage } }
  }
}
