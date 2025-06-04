import useWallet from '@/hooks/useWallet'
import { useAllocator } from '@/lib/AllocatorProvider'
import {
  postAdditionalInfoRequest,
  postApplicationApproval,
  postApplicationDecline,
  postApplicationProposal,
  postApplicationTrigger,
  postApproveChanges,
  postChangeAllowedSPs,
  postChangeAllowedSPsApproval,
  postRemoveAlloc,
  postRequestKyc,
  postRevertApplicationToReadyToSign,
  reopenDeclineApplication,
  triggerSSA,
} from '@/lib/apiClient'
import {
  getEvmAddressFromFilecoinAddress,
  getStateWaitMsg,
} from '@/lib/glifApi'
import { config } from '@/config'
import {
  AllocatorTypeEnum,
  type Application,
  type AllocationUnit,
  type StorageProvidersChangeRequest,
} from '@/type'
import { useMemo, useState } from 'react'
import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from 'react-query'

interface ApplicationActions {
  application: Application
  isRefillError: boolean
  isApiCalling: boolean
  setApiCalling: React.Dispatch<React.SetStateAction<boolean>>
  mutationTriggerSSA: UseMutationResult<
    Application | undefined,
    unknown,
    {
      userName: string
      amount: string
      unit: AllocationUnit
      earlyRefillComment?: string
    },
    unknown
  >
  mutationRequestInfo: UseMutationResult<
    Application | undefined,
    unknown,
    { userName: string; additionalInfoMessage: string },
    unknown
  >
  mutationRequestKyc: UseMutationResult<
    Application | undefined,
    unknown,
    { userName: string },
    unknown
  >
  mutationRemovePendingAllocation: UseMutationResult<
    Application | undefined,
    unknown,
    { userName: string },
    unknown
  >
  mutationDecline: UseMutationResult<
    Application | undefined,
    unknown,
    { userName: string },
    unknown
  >
  mutationTrigger: UseMutationResult<
    Application | undefined,
    unknown,
    {
      allocationAmount: string
      userName: string
      clientContractAddress?: string
      reasonForNotUsingClientSmartContract?: string
    },
    unknown
  >
  mutationApproveChanges: UseMutationResult<
    Application | undefined,
    unknown,
    { userName: string },
    unknown
  >
  mutationReopenDeclineApplication: UseMutationResult<
    Application | undefined,
    unknown,
    { userName: string },
    unknown
  >
  mutationChangeAllowedSPs: UseMutationResult<
    Application | undefined,
    unknown,
    {
      userName: string
      clientAddress: string
      contractAddress: string
      allowedSps: string[]
      disallowedSPs: string[]
      newAvailableResult: string[]
      maxDeviation?: number
    },
    unknown
  >
  mutationApproval: UseMutationResult<
    Application | undefined,
    unknown,
    { requestId: string; userName: string },
    unknown
  >
  mutationChangeAllowedSPsApproval: UseMutationResult<
    Application | undefined,
    unknown,
    { activeRequest: StorageProvidersChangeRequest; userName: string },
    unknown
  >
  mutationProposal: UseMutationResult<
    Application | undefined,
    unknown,
    { requestId: string; userName: string; allocationAmount?: string },
    unknown
  >
  walletError: Error | null
  initializeWallet: (multisigAddress?: string) => Promise<string[]>
  setActiveAccountIndex: (index: number) => void
  loadMoreAccounts: (number: number) => Promise<void>
  message: string | null
  accounts: string[]
}

/**
 * Custom hook to manage application actions and its respective states.
 * Provides mutation functions to interact with the API based on application ID.
 * Manages the state of the current application data, as well as any ongoing API calls.
 *
 * @function
 * @param {Application} initialApplication - The initial application data.
 * @param {string} repo - The repository containing the application.
 * @param {string} owner - The owner of the repository containing the application.
 * @returns {ApplicationActions} - An object containing the current application, its API call state, and mutation functions.
 */
const useApplicationActions = (
  initialApplication: Application,
  repo: string,
  owner: string,
): ApplicationActions => {
  const queryClient = useQueryClient()
  const [isApiCalling, setApiCalling] = useState(false)
  const [application, setApplication] =
    useState<Application>(initialApplication)
  const [isRefillError, setIsRefillError] = useState(false)
  const {
    walletError,
    initializeWallet,
    setActiveAccountIndex,
    activeAddress,
    getProposalTx,
    sendProposal,
    sendApproval,
    message,
    accounts,
    loadMoreAccounts,
    submitClientAllowedSpsAndMaxDeviation,
    getChangeSpsProposalTxs,
    setMessage,
    sendClientIncreaseAllowance,
  } = useWallet()
  const { selectedAllocator } = useAllocator()

  const allocatorType: AllocatorTypeEnum = useMemo(() => {
    if (
      !!selectedAllocator &&
      typeof selectedAllocator !== 'string' &&
      typeof selectedAllocator?.tooling === 'string' &&
      selectedAllocator?.tooling
        .split(', ')
        .includes('smart_contract_allocator') &&
      !!selectedAllocator?.address
    ) {
      return AllocatorTypeEnum.CONTRACT
    } else {
      return AllocatorTypeEnum.DIRECT
    }
  }, [selectedAllocator])

  /**
   * Updates the application cache with the latest data from the API.
   * Updates both the local application state and the react-query cache.
   *
   * @function
   * @param {Application|null} apiResponse - The latest application data from the API.
   */
  const updateCache = (apiResponse: Application | null): void => {
    if (apiResponse == null) return
    setApplication(apiResponse)

    queryClient.setQueryData(
      ['application'],
      (oldData: Application[] | undefined) => {
        if (oldData == null) return []
        const indexToUpdate = oldData?.findIndex(
          (app) => app.ID === apiResponse?.ID,
        )
        if (apiResponse != null && indexToUpdate !== -1) {
          oldData[indexToUpdate] = apiResponse
        }
        return [...oldData]
      },
    )

    queryClient.setQueryData(['posts', initialApplication.ID], () => {
      return apiResponse
    })
  }

  /**
   * Mutation function to handle the declining of an application.
   * It makes an API call to ddecline the application and updates the cache on success.
   *
   * @function
   * @param {string} userName - The user's name.
   * @returns {Promise<void>} - A promise that resolves when the mutation is completed.
   */
  const mutationDecline = useMutation<
    Application | undefined,
    unknown,
    { userName: string },
    unknown
  >(
    async ({ userName }) => {
      return await postApplicationDecline(
        initialApplication.ID,
        userName,
        repo,
        owner,
      )
    },
    {
      onSuccess: (data) => {
        setApiCalling(false)
        if (data != null) updateCache(data)
      },
      onError: () => {
        setApiCalling(false)
      },
    },
  )

  /**
   * Mutation function to handle the declining of an application.
   * It makes an API call to ddecline the application and updates the cache on success.
   *
   * @function
   * @param {string} userName - The user's name.
   * @param {string} additionalInfoMessage - The verifier's message for the client regarding the additional info required.
   * @returns {Promise<void>} - A promise that resolves when the mutation is completed.
   */
  const mutationRequestInfo = useMutation<
    Application | undefined,
    unknown,
    { userName: string; additionalInfoMessage: string },
    unknown
  >(
    async ({ userName, additionalInfoMessage }) => {
      return await postAdditionalInfoRequest(
        initialApplication.ID,
        userName,
        repo,
        owner,
        additionalInfoMessage,
      )
    },
    {
      onSuccess: (data) => {
        setApiCalling(false)
        if (data != null) updateCache(data)
      },
      onError: () => {
        setApiCalling(false)
      },
    },
  )

  const mutationRequestKyc = useMutation<
    Application | undefined,
    unknown,
    { userName: string },
    unknown
  >(
    async ({ userName }) => {
      return await postRequestKyc(initialApplication.ID, userName, repo, owner)
    },
    {
      onSuccess: (data) => {
        setApiCalling(false)
        if (data != null) updateCache(data)
      },
      onError: () => {
        setApiCalling(false)
      },
    },
  )

  const mutationRemovePendingAllocation = useMutation<
    Application | undefined,
    unknown,
    { userName: string },
    unknown
  >(
    async ({ userName }) => {
      return await postRemoveAlloc(initialApplication.ID, userName, repo, owner)
    },
    {
      onSuccess: (data) => {
        setApiCalling(false)
        if (data != null) updateCache(data)
      },
      onError: () => {
        setApiCalling(false)
      },
    },
  )

  /**
   * Mutation function to handle the triggering of an application.
   * It makes an API call to trigger the application and updates the cache on success.
   *
   * @function
   * @param {string} userName - The user's name.
   * @param {string} allocationAmount - The amount of datacap to be allocated in the first allocation process name.
   * @returns {Promise<void>} - A promise that resolves when the mutation is completed.
   */
  const mutationTrigger = useMutation<
    Application | undefined,
    unknown,
    {
      userName: string
      allocationAmount: string
      clientContractAddress?: string
      reasonForNotUsingClientSmartContract?: string
    },
    unknown
  >(
    async ({
      userName,
      allocationAmount,
      clientContractAddress,
      reasonForNotUsingClientSmartContract,
    }) => {
      return await postApplicationTrigger(
        initialApplication.ID,
        userName,
        repo,
        owner,
        allocationAmount,
        clientContractAddress,
        reasonForNotUsingClientSmartContract,
      )
    },
    {
      onSuccess: (data) => {
        setApiCalling(false)
        if (data != null) updateCache(data)
      },
      onError: () => {
        setApiCalling(false)
      },
    },
  )

  const getClientAddress = (): string => {
    return (
      (config.isTestnet ? 't' : 'f') +
      initialApplication.Lifecycle['On Chain Address'].substring(1)
    )
  }

  /**
   * Mutation function to handle the triggering of an SSA.
   * It makes an API call to trigger the SSA and updates the cache on success.
   *
   * @param {amount} amount - The amount of datacap to be allocated in the SSA process.
   * @param {unit} unit - The unit of the datacap to be allocated in the SSA process.
   * @param {string} userName - The user's name.
   * @returns {Promise<void>} - A promise that resolves when the mutation is completed.
   */
  const mutationTriggerSSA = useMutation<
    Application | undefined,
    Error,
    {
      userName: string
      amount: string
      unit: AllocationUnit
      earlyRefillComment?: string
    }
  >(
    async ({ userName, amount, unit, earlyRefillComment }) => {
      return await triggerSSA(
        amount,
        unit,
        initialApplication.ID,
        repo,
        owner,
        userName,
        earlyRefillComment,
      )
    },
    {
      onSuccess: (data) => {
        setApiCalling(false)
        if (data != null) updateCache(data)
      },
      onError: (e) => {
        setIsRefillError(true)
        setApiCalling(false)
        throw e
      },
    },
  )

  /**
   * Mutation function to handle the approval of changes of an application's issue.
   * It makes an API call to mark the approval of the changes and updates the cache on success.
   *
   * @function
   * @param {string} userName - The user's name.
   * @returns {Promise<void>} - A promise that resolves when the mutation is completed.
   */
  const mutationApproveChanges = useMutation<
    Application | undefined,
    unknown,
    { userName: string },
    unknown
  >(
    async ({ userName }) => {
      return await postApproveChanges(
        initialApplication.ID,
        userName,
        repo,
        owner,
      )
    },
    {
      onSuccess: (data) => {
        setApiCalling(false)
        if (data != null) updateCache(data)
      },
      onError: () => {
        setApiCalling(false)
      },
    },
  )

  const mutationReopenDeclineApplication = useMutation<
    Application | undefined,
    unknown,
    { userName: string },
    unknown
  >(
    async ({ userName }) => {
      return await reopenDeclineApplication(
        initialApplication.ID,
        repo,
        owner,
        userName,
      )
    },
    {
      onSuccess: (data) => {
        setApiCalling(false)
        if (data != null) updateCache(data)
      },
      onError: () => {
        setApiCalling(false)
      },
    },
  )
  /**
   * Mutation function to handle the proposal of an application.
   * It makes an API call to propose the application and updates the cache on success.
   *
   * @function
   * @param {string} requestId - The request ID associated with the proposal.
   * @returns {Promise<void>} - A promise that resolves when the mutation is completed.
   */
  const mutationProposal = useMutation<
    Application | undefined,
    Error,
    { requestId: string; userName: string; allocationAmount?: string },
    unknown
  >(
    async ({ requestId, userName, allocationAmount }) => {
      setMessage(`Searching the pending transactions...`)

      const clientAddress = getClientAddress()

      const clientContractAddress =
        initialApplication?.['Client Contract Address']

      let evmClientAddress

      if (clientContractAddress) {
        const evmClientAddressResult =
          await getEvmAddressFromFilecoinAddress(clientAddress)

        evmClientAddress = evmClientAddressResult.data
      }

      let proposalAllocationAmount = ''

      if (allocationAmount) {
        proposalAllocationAmount = allocationAmount
      } else {
        proposalAllocationAmount =
          initialApplication['Allocation Requests'].find(
            (alloc) => alloc.Active,
          )?.['Allocation Amount'] ?? ''
      }

      if (!proposalAllocationAmount) {
        throw new Error('No active allocation found')
      }

      const proposalTx = await getProposalTx(
        clientAddress,
        proposalAllocationAmount,
        allocatorType,
        clientContractAddress,
      )

      if (proposalTx?.pendingVerifyClientTransaction) {
        throw new Error('This datacap allocation is already proposed')
      }

      const addressToGrantDataCap = clientContractAddress ?? clientAddress

      const messageCID = await sendProposal({
        allocatorType,
        contractAddress:
          typeof selectedAllocator !== 'string'
            ? selectedAllocator?.ma_address ?? selectedAllocator?.address ?? ''
            : '',
        clientAddress: addressToGrantDataCap,
        proposalAllocationAmount,
      })

      if (messageCID == null) {
        throw new Error(
          'Error sending proposal. Please try again or contact support.',
        )
      }

      setMessage(
        `Checking the 'verify client' transaction, it may take a few minutes, please wait... Do not close this window.`,
      )

      const response = await getStateWaitMsg(messageCID)

      if (
        typeof response.data === 'object' &&
        response.data.ReturnDec.Applied &&
        response.data.ReturnDec.Code !== 0
      ) {
        throw new Error(
          `Error sending transaction. Please try again or contact support. Error code: ${response.data.ReturnDec.Code}`,
        )
      }

      let increaseAllowanceCID

      if (clientContractAddress && evmClientAddress) {
        increaseAllowanceCID = await sendClientIncreaseAllowance({
          contractAddress: clientContractAddress,
          clientAddress: evmClientAddress,
          proposalAllocationAmount,
        })

        if (increaseAllowanceCID == null) {
          throw new Error(
            'Error sending increase allowance transaction. Please try again or contact support.',
          )
        }

        setMessage(
          `Checking the 'increase allowance' transaction, it may take a few minutes, please wait... Do not close this window.`,
        )

        const increaseResponse = await getStateWaitMsg(increaseAllowanceCID)

        if (
          typeof increaseResponse.data === 'object' &&
          increaseResponse.data.ReturnDec.Applied &&
          increaseResponse.data.ReturnDec.Code !== 0
        ) {
          throw new Error(
            `Error sending transaction. Please try again or contact support. Error code: ${increaseResponse.data.ReturnDec.Code}`,
          )
        }
      }

      return await postApplicationProposal(
        initialApplication.ID,
        requestId,
        userName,
        owner,
        repo,
        activeAddress,
        { messageCID, increaseAllowanceCID },
        allocationAmount,
      )
    },
    {
      onSuccess: (data) => {
        setApiCalling(false)
        if (data != null) updateCache(data)
      },
      onError: () => {
        setApiCalling(false)
      },
    },
  )

  /**
   * Mutation function to handle the approval of an application.
   * It makes an API call to approve the application and updates the cache on success.
   *
   * @function
   * @param {string} requestId - The request ID associated with the approval.
   * @returns {Promise<void>} - A promise that resolves when the mutation is completed.
   */
  const mutationApproval = useMutation<
    Application | undefined,
    unknown,
    { requestId: string; userName: string },
    unknown
  >(
    async ({ requestId, userName }) => {
      setMessage(`Searching the pending transactions...`)

      const clientAddress = getClientAddress()

      let clientAddressAddress
      if (initialApplication['Client Contract Address']) {
        clientAddressAddress = initialApplication['Client Contract Address']
      }

      const activeRequest = initialApplication['Allocation Requests'].find(
        (alloc) => alloc.Active,
      )

      const datacap = activeRequest?.['Allocation Amount']

      if (datacap == null) throw new Error('No active allocation found')

      const proposalTx = await getProposalTx(
        clientAddress,
        datacap,
        allocatorType,
        clientAddressAddress,
      )

      if (!proposalTx?.pendingVerifyClientTransaction) {
        throw new Error(
          'This datacap allocation is not proposed yet. You may need to wait some time if the proposal was just sent.',
        )
      }

      const signatures: {
        verifyClientCid: string
        increaseAllowanceCid?: string
      } = {
        verifyClientCid: '',
      }

      const messageCID = await sendApproval(
        proposalTx?.pendingVerifyClientTransaction,
      )

      if (messageCID == null) {
        throw new Error(
          'Error sending proposal. Please try again or contact support.',
        )
      }

      setMessage(
        `Checking the 'verify client' transaction, it may take a few minutes, please wait... Do not close this window.`,
      )

      const response = await getStateWaitMsg(messageCID)

      if (
        typeof response.data === 'object' &&
        response.data.ReturnDec.Applied &&
        response.data.ReturnDec.Code !== 0
      ) {
        await postRevertApplicationToReadyToSign(
          userName,
          initialApplication.ID,
          owner,
          repo,
        )
        // After changing the error message, please check the handleClose() function and adapt the changes
        throw new Error(
          `Datacap allocation transaction failed on chain. Application reverted to ReadyToSign. Please try again. Error code: ${response.data.ReturnDec.Code}`,
        )
      }

      signatures.verifyClientCid = messageCID

      if (
        !proposalTx?.pendingIncreaseAllowanceTransaction &&
        clientAddressAddress
      ) {
        throw new Error(
          'This increase allowance is not proposed yet. You may need to wait some time if the proposal was just sent.',
        )
      } else if (clientAddressAddress) {
        const increaseMessageCID = await sendApproval(
          proposalTx?.pendingIncreaseAllowanceTransaction,
        )

        if (increaseMessageCID == null) {
          throw new Error(
            'Error sending proposal. Please try again or contact support.',
          )
        }

        setMessage(
          `Checking the 'verify client' transaction, it may take a few minutes, please wait... Do not close this window.`,
        )

        const response = await getStateWaitMsg(increaseMessageCID)

        if (
          typeof response.data === 'object' &&
          response.data.ReturnDec.Applied &&
          response.data.ReturnDec.Code !== 0
        ) {
          throw new Error(
            `Datacap increase allowance transaction failed on chain. Application reverted to ReadyToSign. Please try again. Error code: ${response.data.ReturnDec.Code}`,
          )
        }

        signatures.increaseAllowanceCid = increaseMessageCID
      }

      return await postApplicationApproval(
        initialApplication.ID,
        requestId,
        userName,
        owner,
        repo,
        activeAddress,
        signatures,
      )
    },
    {
      onSuccess: (data) => {
        setApiCalling(false)
        if (data != null) updateCache(data)
      },
      onError: () => {
        setApiCalling(false)
      },
    },
  )

  const mutationChangeAllowedSPs = useMutation<
    Application | undefined,
    Error,
    {
      userName: string
      clientAddress: string
      contractAddress: string
      maxDeviation?: number
      allowedSps: string[]
      disallowedSPs: string[]
      newAvailableResult: string[]
    },
    unknown
  >(
    async ({
      userName,
      clientAddress,
      contractAddress,
      maxDeviation,
      allowedSps,
      disallowedSPs,
      newAvailableResult,
    }) => {
      const signatures = await submitClientAllowedSpsAndMaxDeviation(
        clientAddress,
        contractAddress,
        allowedSps,
        disallowedSPs,
        maxDeviation,
      )

      return await postChangeAllowedSPs(
        initialApplication.ID,
        userName,
        owner,
        repo,
        activeAddress,
        signatures,
        newAvailableResult,
        maxDeviation,
      )
    },
    {
      onSuccess: (data) => {
        setApiCalling(false)
        if (data != null) updateCache(data)
      },
      onError: () => {
        setApiCalling(false)
        setMessage(null)
      },
    },
  )

  const mutationChangeAllowedSPsApproval = useMutation<
    Application | undefined,
    unknown,
    { activeRequest: StorageProvidersChangeRequest; userName: string },
    unknown
  >(
    async ({ activeRequest, userName }) => {
      setMessage(`Searching the pending transactions...`)

      const clientAddress = getClientAddress()

      const addedProviders = activeRequest?.Signers.find(
        (x) => x['Add Allowed Storage Providers CID'],
      )?.['Add Allowed Storage Providers CID']

      const removedProviders = activeRequest?.Signers.find(
        (x) => x['Remove Allowed Storage Providers CID'],
      )?.['Remove Allowed Storage Providers CID']
      const maxDeviationInPercentage = activeRequest['Max Deviation']
        ? activeRequest['Max Deviation'].split('%')[0]
        : undefined

      const maxDeviation = Number(maxDeviationInPercentage) * 100 // Contract calculations use a denominator of 10000 (where 10% is represented as 1000).

      const proposalTxs = await getChangeSpsProposalTxs(
        clientAddress,
        maxDeviation,
        addedProviders,
        removedProviders,
      )

      if (!proposalTxs) {
        throw new Error(
          'Transactions not found. You may need to wait some time if the proposal was just sent.',
        )
      }

      const signatures: {
        maxDeviationCid?: string
        allowedSpsCids?: { [key in string]: string[] }
        removedSpsCids?: { [key in string]: string[] }
      } = {}

      const wait = async (ms: number): Promise<void> => {
        await new Promise((resolve) => setTimeout(resolve, ms))
      }

      for (let index = 0; index < proposalTxs.length; index++) {
        const proposalTx = proposalTxs[index]

        setMessage(`Preparing the '${proposalTx.cidName}' transaction...`)

        await wait(2000)
        const messageCID = await sendApproval(proposalTx.tx)

        if (messageCID == null) {
          throw new Error(
            `Error sending the '${proposalTx.cidName}' transaction. Please try again or contact support.`,
          )
        }

        setMessage(
          `Checking the '${proposalTx.cidName}' transaction, It may take several seconds, please wait...`,
        )

        const response = await getStateWaitMsg(messageCID)

        if (
          typeof response.data === 'object' &&
          response.data.ReturnDec.Applied &&
          response.data.ReturnDec.Code !== 0
        ) {
          throw new Error(
            `Change allowed SPs transaction failed on chain. Error code: ${response.data.ReturnDec.Code}`,
          )
        }

        switch (proposalTx.cidName) {
          case 'max deviation':
            signatures.maxDeviationCid = messageCID
            break

          case 'add allowed Sps': {
            if (!signatures.allowedSpsCids) {
              signatures.allowedSpsCids = {}
            }

            signatures.allowedSpsCids[messageCID] = proposalTx.decodedPacked
              ? proposalTx.decodedPacked
              : ['']

            break
          }
          case 'remove allowed Sps': {
            if (!signatures.removedSpsCids) {
              signatures.removedSpsCids = {}
            }

            signatures.removedSpsCids[messageCID] = proposalTx.decodedPacked
              ? proposalTx.decodedPacked
              : ['']

            break
          }
        }
      }

      return await postChangeAllowedSPsApproval(
        initialApplication.ID,
        activeRequest.ID,
        userName,
        owner,
        repo,
        activeAddress,
        signatures,
      )
    },
    {
      onSuccess: (data) => {
        setApiCalling(false)
        if (data != null) updateCache(data)
      },
      onError: () => {
        setApiCalling(false)
      },
    },
  )

  return {
    application,
    mutationRequestKyc,
    isRefillError,
    isApiCalling,
    setApiCalling,
    mutationRequestInfo,
    mutationDecline,
    mutationTrigger,
    mutationApproveChanges,
    mutationReopenDeclineApplication,
    mutationProposal,
    mutationApproval,
    walletError,
    initializeWallet,
    message,
    setActiveAccountIndex,
    accounts,
    loadMoreAccounts,
    mutationTriggerSSA,
    mutationRemovePendingAllocation,
    mutationChangeAllowedSPs,
    mutationChangeAllowedSPsApproval,
  }
}

export default useApplicationActions
