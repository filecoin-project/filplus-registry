import { type ApiAllowanceResponse } from '@/type'
import { config } from '@/config'

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
    const requestBody = {
      jsonrpc: '2.0',
      method: 'Filecoin.StateVerifierStatus',
      params: [address, null],
      id: 1,
    }
    const response = await fetch(`${config.glifNodeUrl}`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const data = await response.json()
    if (data?.type === 'error') {
      return {
        data: '',
        error: data.error.message,
        success: false,
      }
    }

    return {
      data: data.result,
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
    const requestBody = {
      jsonrpc: '2.0',
      method: 'Filecoin.StateVerifiedClientStatus',
      params: [address, null],
      id: 1,
    }
    const response = await fetch(`${config.glifNodeUrl}`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    })

    const data = await response.json()
    if (data?.error) {
      return {
        data: '',
        error: data.error.message,
        success: false,
      }
    }

    return {
      data: data.result,
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
