import {
  type Allocation,
  type Allocator,
  type Application,
  type LDNActorsResponse,
  type RefillUnit,
} from '@/type'
import axios from 'axios'
import { getAccessToken } from './session'
import { getCurrentDate } from './utils'

/**
 * Axios client instance with a predefined base URL for making API requests.
 */
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
})

apiClient.interceptors.request.use(
  async (config) => {
    const accessToken = await getAccessToken()
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  },
  async (error) => {
    return await Promise.reject(error)
  },
)

/**
 * Get applications for repo
 *
 * @param repo - The repo containing the applications to retrieve.
 * @param owner - The owner containing the repo.
 *
 * @returns {Promise<Application[]>}
 * @throws {Error} When the API call fails.
 */
export const getApplicationsForRepo = async (
  repo: string,
  owner: string,
): Promise<Application[] | undefined> => {
  try {
    const [activeResponse, mergedResponse] = await Promise.all([
      apiClient.get('application/active', {
        params: {
          repo,
          owner,
        },
      }),
      apiClient.get('application/merged', {
        params: {
          repo,
          owner,
        },
      }),
    ])
    if (
      !Array.isArray(activeResponse.data) ||
      !Array.isArray(mergedResponse.data)
    ) {
      throw new Error('Received invalid data from the API')
    }

    const activeApplicationsMap = new Map(
      activeResponse.data.map((app: Application) => [app.ID, app]),
    )

    // Here we merge the active applications with the merged applications prioritizing the active ones
    const allApplications = [
      ...activeResponse.data,
      ...mergedResponse.data
        .filter(([prData, app]) => !activeApplicationsMap.has(app.ID))
        .map(([prData, mergedApp]) => mergedApp),
    ]

    return allApplications
  } catch (error: any) {
    console.error(error)

    const message = error?.message ?? 'Failed to fetch applications'
    throw new Error(message)
  }
}

/**
 * Get all applications of all repos
 *
 * @returns {Promise<Application[]>}
 * @throws {Error} When the API call fails.
 */
export const getAllApplications = async (): Promise<
  Application[] | undefined
> => {
  try {
    const applications = (await apiClient.get('/applications')).data.map(
      (e: { 0: Application; 1: string; 2: string }) => ({
        ...e[0],
        owner: e[1],
        repo: e[2],
      }),
    )

    return applications
  } catch (error: any) {
    console.error(error)

    const message = error?.message ?? 'Failed to fetch applications'
    throw new Error(message)
  }
}

/**
 * Retrieves an application based on its ID.
 *
 * @param id - The ID of the application to retrieve.
 * @returns A promise that resolves with the application data or undefined if there's an error.
 */
export const getApplicationByParams = async (
  id: string,
  repo: string,
  owner: string,
): Promise<
  | {
      application_file: Application
      allocation?: Allocation
    }
  | undefined
> => {
  try {
    const { data } = await apiClient.get(
      `/application/with-allocation-amount`,
      {
        params: {
          id,
          owner,
          repo,
        },
      },
    )
    if (Object.keys(data).length > 0) return data
  } catch (error) {
    console.error(error)
  }
}

/**
 * Triggers a LDN application based on its ID.
 *
 * @param id - The ID of the application to decline.
 * @param actor - The actor that declines the application.
 * @returns A promise that resolves with the application data after the declining or undefined if there's an error.
 */
export const postApplicationDecline = async (
  id: string,
  actor: string,
  repo: string,
  owner: string,
): Promise<Application | undefined> => {
  try {
    const { data } = await apiClient.post(
      `verifier/application/decline`,
      {},
      {
        params: {
          github_username: actor,
          repo,
          owner,
          id,
        },
      },
    )
    return data
  } catch (error) {
    console.error(error)
    throw error
  }
}

/**
 * Triggers a LDN application based on its ID.
 *
 * @param id - The ID of the application to decline.
 * @param actor - The actor that declines the application.
 * @param {string} additionalInfoMessage - The verifier's message for the client regarding the additional info required.
 * @returns A promise that resolves with the application data after the declining or undefined if there's an error.
 */
export const postAdditionalInfoRequest = async (
  id: string,
  actor: string,
  repo: string,
  owner: string,
  additionalInfoMessage: string,
): Promise<Application | undefined> => {
  try {
    const { data } = await apiClient.post(
      `verifier/application/additional_info_required`,
      {
        verifier_message: additionalInfoMessage,
      },
      {
        params: {
          github_username: actor,
          repo,
          owner,
          id,
        },
      },
    )
    return data
  } catch (error) {
    console.error(error)
    throw error
  }
}

export const triggerSSA = async (
  amount: string,
  unit: RefillUnit,
  id: string,
  repo: string,
  owner: string,
  actor: string,
): Promise<Application | undefined> => {
  const { data } = await apiClient.post(
    `verifier/application/trigger_ssa`,
    {
      amount,
      amount_type: unit,
    },
    { params: { repo, owner, id, github_username: actor } },
  )
  return data
}
/**
 * Triggers a KYC request for an application.
 * @param id the application id
 * @param actor the actor that triggers the application
 * @param repo the repo of the application
 * @param owner the owner of the application
 * @returns
 */
export const postRequestKyc = async (
  id: string,
  actor: string,
  repo: string,
  owner: string,
): Promise<Application | undefined> => {
  try {
    const { data } = await apiClient.post(
      `verifier/application/request_kyc`,
      { github_username: actor, repo, owner, id },
      {
        params: {
          github_username: actor,
          repo,
          owner,
          id,
        },
      },
    )
    return data
  } catch (error) {
    console.error(error)
    throw error
  }
}

export const postRemoveAlloc = async (
  id: string,
  actor: string,
  repo: string,
  owner: string,
): Promise<Application | undefined> => {
  try {
    const { data } = await apiClient.post(
      `verifier/application/remove_pending_allocation`,
      { github_username: actor, repo, owner, id },
      {
        params: {
          github_username: actor,
          repo,
          owner,
          id,
        },
      },
    )
    return data
  } catch (error) {
    console.error(error)
    throw error
  }
}

/**
 * Triggers a LDN application based on its ID.
 *
 * @param id - The ID of the application to trigger.
 * @param actor - The actor that triggers the application.
 * @returns A promise that resolves with the application data after the trigger or undefined if there's an error.
 */
export const postApplicationTrigger = async (
  id: string,
  actor: string,
  repo: string,
  owner: string,
  allocationAmount: string,
  clientContractAddress?: string,
): Promise<Application | undefined> => {
  try {
    const { data } = await apiClient.post(
      `verifier/application/trigger`,
      {
        allocation_amount: allocationAmount,
        client_contract_address: clientContractAddress,
      },
      {
        params: {
          github_username: actor,
          repo,
          owner,
          id,
        },
      },
    )
    return data
  } catch (error) {
    console.error(error)
    throw error
  }
}

/**
 * Approves the changes submitted on an issue based on the application id.
 *
 * @param id - The ID of the application to trigger.
 * @param actor - The actor that triggers the application.
 * @returns A promise that resolves with the application data after the trigger or undefined if there's an error.
 */
export const postApproveChanges = async (
  id: string,
  actor: string,
  repo: string,
  owner: string,
): Promise<Application | undefined> => {
  try {
    const { data } = await apiClient.post(
      `verifier/application/approve_changes`,
      {},
      {
        params: {
          github_username: actor,
          repo,
          owner,
          id,
        },
      },
    )
    return data
  } catch (error) {
    console.error(error)
    throw error
  }
}

/**
 * Proposes a LDN application based on its ID.
 *
 * @param id - The ID of the application to propose.
 * @param requestId - The id of the request to send.
 * @returns A promise that resolves with the application data after the trigger or undefined if there's an error.
 */
export const postApplicationProposal = async (
  id: string,
  requestId: string,
  userName: string,
  owner: string,
  repo: string,
  address: string,
  signature: string,
  allocationAmount?: string,
): Promise<Application | undefined> => {
  try {
    const { data } = await apiClient.post(
      `verifier/application/propose`,
      {
        request_id: requestId,
        new_allocation_amount: allocationAmount,
        owner,
        repo,
        signer: {
          signing_address: address,
          // Datetime in format YYYY-MM-DDTHH:MM:SSZ
          created_at: getCurrentDate(),
          message_cid: signature,
        },
      },
      {
        params: {
          repo,
          owner,
          id,
          github_username: userName,
        },
      },
    )
    return data
  } catch (error) {
    console.error(error)
    throw error
  }
}

/**
 * Approves a LDN application based on its ID.
 *
 * @param id - The ID of the application to approve.
 * @param requestId - The id of the request to send.
 * @returns A promise that resolves with the application data after the trigger or undefined if there's an error.
 */
export const postApplicationApproval = async (
  id: string,
  requestId: string,
  userName: string,
  owner: string,
  repo: string,
  address: string,
  signature: string,
): Promise<Application | undefined> => {
  try {
    const { data } = await apiClient.post(
      `verifier/application/approve`,
      {
        request_id: requestId,
        owner,
        repo,
        signer: {
          signing_address: address,
          created_at: getCurrentDate(),
          message_cid: signature,
        },
      },
      {
        params: {
          repo,
          owner,
          id,
          github_username: userName,
        },
      },
    )
    return data
  } catch (error) {
    console.error(error)
    throw error
  }
}

export const postRevertApplicationToReadyToSign = async (
  githubUsername: string,
  id: string,
  owner: string,
  repo: string,
): Promise<Application | undefined> => {
  try {
    const { data } = await apiClient.post(
      `verifier/application/allocation_failed`,
      {},
      {
        params: {
          github_username: githubUsername,
          repo,
          owner,
          id,
        },
      },
    )
    return data
  } catch (error) {
    console.error(error)
    throw error
  }
}

/**
 * Retrieves an application based on its ID.
 *
 * @returns A promise that resolves with a JSON containing 2 lists: notaries info, governance team info.
 */
export const fetchLDNActors = async (): Promise<
  LDNActorsResponse | undefined
> => {
  try {
    const { data } = await apiClient.get(`ldn-actors`)

    return data
  } catch (e) {
    console.error(e)
    throw e
  }
}
/**
 * Retrieves all allocators using the Fil+ infrastructure.
 *
 * @returns A promise that resolves with a JSON containing the details of all allocators using the Fil+ infrastructure.
 */
export const getAllocators = async (): Promise<Allocator[]> => {
  try {
    const { data } = await apiClient.get(`allocators`)

    return data
  } catch (e) {
    console.error(e)
    throw e
  }
}

/**
 * Sends the new GitHub Installation ID to the backend.
 */
export const submitGitHubInstallationId = async (
  installationId: string | number,
): Promise<{
  installation_id: string
  repositories: Array<{
    owner: string
    slug: string
  }>
}> => {
  try {
    const response = await apiClient.get('allocator/update_installation_id', {
      params: {
        installation_id: installationId,
      },
    })
    return response.data
  } catch (e) {
    console.error(e)
    throw e
  }
}

export const cacheRenewal = async (
  owner: string,
  repo: string,
): Promise<string> => {
  try {
    const { data } = await apiClient.post(`application/cache/renewal`, {
      owner,
      repo,
    })

    return data
  } catch (e) {
    console.error(e)
    throw e
  }
}

export const postChangeAllowedSPs = async (
  id: string,
  requestId: string,
  userName: string,
  owner: string,
  repo: string,
  address: string,
  signatures: {
    maxDeviationCid?: string
    allowedSpCid?: { [key in string]: string[] }
    disallowedSpCid?: { [key in string]: string[] }
  },
  maxDeviationData?: string,
  allowedSpsData?: string[],
  disallowedSpsData?: string[],
): Promise<Application | undefined> => {
  try {
    const { data } = await apiClient.post(
      `verifier/application/propose_storage_providers`,
      {
        request_id: requestId,
        max_deviation_data: maxDeviationData
          ? `${maxDeviationData}%`
          : undefined,
        allowed_sp_data: allowedSpsData,
        disallowed_spa_data: disallowedSpsData,
        owner,
        repo,
        signer: {
          signing_address: address,
          created_at: getCurrentDate(),
          max_deviation_cid: signatures.maxDeviationCid,
          allowed_sp_data_cids: signatures.allowedSpCid,
          disallowed_sp_data_cids: signatures.disallowedSpCid,
        },
      },
      {
        params: {
          repo,
          owner,
          id,
          github_username: userName,
        },
      },
    )

    return data
  } catch (error) {
    console.error(error)
    throw error
  }
}

export const postChangeAllowedSPsApproval = async (
  id: string,
  requestId: string,
  userName: string,
  owner: string,
  repo: string,
  address: string,
  signatures: {
    maxDeviationCid?: string
    allowedSpCid?: string
    disallowedSpCid?: string
  },
): Promise<Application | undefined> => {
  try {
    const { data } = await apiClient.post(
      `verifier/application/approve_storage_providers`,
      {
        request_id: requestId,
        owner,
        repo,
        signer: {
          signing_address: address,
          created_at: getCurrentDate(),
          max_deviation_cid: signatures.maxDeviationCid,
          allowed_sp_data_cid: signatures.allowedSpCid,
          disallowed_sp_data_cid: signatures.disallowedSpCid,
        },
      },
      {
        params: {
          repo,
          owner,
          id,
          github_username: userName,
        },
      },
    )
    return data
  } catch (error) {
    console.error(error)
    throw error
  }
}
