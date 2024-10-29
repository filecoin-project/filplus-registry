import {
  getEvmAddressFromFilecoinAddress,
  getStateWaitMsg,
  makeStaticEthCall,
} from '@/lib/glifApi'
import { anyToBytes } from '@/lib/utils'
import { BurnerWallet } from '@/lib/wallet/BurnerWallet'
import { LedgerWallet } from '@/lib/wallet/LedgerWallet'
import { AllocatorTypeEnum, type IWallet, type SendProposalProps } from '@/type'
import { newFromString } from '@glif/filecoin-address'
import { useCallback, useState } from 'react'
import {
  decodeFunctionData,
  decodeFunctionResult,
  encodeFunctionData,
  encodePacked,
  fromHex,
  parseAbi,
} from 'viem'
import { type Hex } from 'viem/types/misc'
import { config } from '../config'

/**
 * Registry that maps wallet class names to their respective classes.
 */
const walletClassRegistry: Record<string, any> = {
  LedgerWallet: (
    networkIndex: number,
    setMessage: (message: string | null) => void,
    multisigAddress?: string,
  ) => new LedgerWallet(networkIndex, setMessage, multisigAddress),
  BurnerWallet: (
    networkIndex: number,
    setMessage: (message: string | null) => void,
  ) => new BurnerWallet(networkIndex, setMessage),
}

/**
 * Interface representing the state of the wallet.
 *
 * @interface WalletState
 */
interface WalletState {
  walletError: Error | null
  setActiveAccountIndex: (index: number) => void
  accounts: string[]
  activeAddress: string
  getProposalTx: (
    clientAddress: string,
    datacap: string,
    allocatorType: AllocatorTypeEnum,
  ) => Promise<string | boolean>
  sendProposal: (props: SendProposalProps) => Promise<string>
  sendApproval: (txHash: string) => Promise<string>
  sign: (message: string) => Promise<string>
  initializeWallet: (multisigAddress?: string) => Promise<string[]>
  message: string | null
  setMessage: (message: string | null) => void
  loadMoreAccounts: (number: number) => Promise<void>
  getAllocatorAllowanceFromContract: (
    contractAddress: string,
    allocatorAddress: string,
  ) => Promise<number>
  getClientSPs: (
    clientAddress: string,
    contractAddress: string,
  ) => Promise<string[]>
  submitClientAllowedSpsAndMaxDeviation: (
    clientAddress: string,
    contractAddress: string,
    allowedSps: string[],
    disallowedSPs: string[],
    maxDeviation?: string,
  ) => Promise<{
    maxDeviationCid?: string
    allowedSpCids?: {
      [key in string]: string[]
    }
    disallowedSpCids?: {
      [key in string]: string[]
    }
  }>
  getClientConfig: (
    clientAddress: string,
    contractAddress: string,
  ) => Promise<string | null>
  getChangeSpsProposalTxs: (
    clientAddress: string,
    maxDeviation?: string,
    allowedSpCids?: {
      [key in string]: string[]
    },
    disallowedSpCids?: {
      [key in string]: string[]
    },
  ) => Promise<Array<{
    cidName: 'Max Deviation' | 'Allowed Sps' | 'Disallowed Sps'
    tx: any
  }> | null>
}

/**
 * Custom hook for managing wallet state and interactions.
 *
 * @function useWallet
 * @returns {WalletState} - The current state of the wallet and associated actions.
 */
const useWallet = (): WalletState => {
  const [wallet, setWallet] = useState<IWallet | null>(null)
  const [walletError, setWalletError] = useState<Error | null>(null)
  const [accounts, setAccounts] = useState<string[]>([])
  const [multisigAddress, setMultisigAddress] = useState<string>('')
  const [activeAccountIndex, setActiveAccountIndexState] = useState<number>(0)
  const [message, setMessage] = useState<string | null>(null)

  /**
   * Sets the active account index.
   *
   * @param {number} index - The index of the account to set as active.
   */
  const setActiveAccountIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < accounts.length) {
        setActiveAccountIndexState(index)
      } else {
        console.error('Invalid account index')
      }
    },
    [accounts],
  )

  /**
   * Initializes and returns the active network index based on configuration.
   *
   * @returns {number} - The index of the active network.
   */
  const initNetworkIndex = useCallback(() => {
    const activeIndex = config.lotusNodes
      .map((node: any, index: number) => {
        return { name: node.name, index }
      })
      .filter((node: any) => config.networks.includes(node.name))

    return activeIndex[0].index
  }, [])

  /**
   * Initializes the wallet using the given class name.
   *
   * @param {string} WalletClass - The name of the wallet class to initialize.
   * @param {}
   * @returns {Promise<boolean>} - A promise that resolves when the wallet is initialized.
   */
  const initializeWallet = useCallback(
    async (multisigAddress?: string) => {
      setWalletError(null)
      setMessage('Initializing wallet...')

      try {
        const walletClass: string = config.walletClass
        let newWallet: Record<string, any>
        if (!multisigAddress) {
          const networkIndex = initNetworkIndex()
          newWallet = walletClassRegistry[walletClass](networkIndex, setMessage)
        } else {
          newWallet = walletClassRegistry[walletClass](
            0,
            setMessage,
            multisigAddress,
          )
        }
        await newWallet.loadWallet()
        const allAccounts = await newWallet.getAccounts()

        if (allAccounts.length > 0) {
          setActiveAccountIndexState(0)
          setAccounts(allAccounts)
        }
        setMessage(null)
        setWallet(newWallet as IWallet)
        setMultisigAddress(newWallet.lotusNode.rkhMultisig)
        return allAccounts
      } catch (err) {
        console.error('Error initializing wallet:', err)
        if (err instanceof Error) {
          setWalletError(err)
        } else {
          setWalletError(new Error('Unknown error'))
        }
        return false
      }
    },
    [initNetworkIndex],
  )

  /**
   * Load more accounts from the wallet.
   *
   * @param {number} number - The number of accounts to load.
   * @returns {Promise<void>} - A promise that resolves when the accounts are loaded.
   */
  const loadMoreAccounts = useCallback(
    async (number: number) => {
      if (wallet == null) throw new Error('No wallet initialized.')
      const newAccounts = await wallet.getAccounts(number)
      setAccounts([...accounts, ...newAccounts])
    },
    [wallet, accounts],
  )

  /**
   * Sign a message using the currently initialized wallet.
   *
   * @param {string} message - The message to be signed.
   * @returns {Promise<string>} - A promise that resolves with the signature.
   * @throws {Error} - Throws an error if no wallet is initialized or signing fails.
   */
  const sign = useCallback(
    async (message: string): Promise<string> => {
      if (wallet == null) throw new Error('No wallet initialized.')
      return await wallet.sign(message, activeAccountIndex)
    },
    [wallet, activeAccountIndex],
  )

  /**
   * Checks if a multisig wallet has a pending proposal for a given client and datacap.
   *
   * @param {string} multisigAddress - The address of the multisig wallet.
   * @param {string} clientAddress - The address of the client.
   * @param {number} datacap - The datacap to be allocated.
   * @returns {Promise<string>} - A promise that resolves with a boolean indicating if the multisig wallet has a pending proposal for the given client and datacap.
   * @throws {Error} - Throws an error if no wallet is initialized.
   */
  const getProposalTx = useCallback(
    async (
      clientAddress: string,
      datacap: string,
      allocatorType: AllocatorTypeEnum,
    ): Promise<string | boolean> => {
      if (wallet == null) throw new Error('No wallet initialized.')
      if (multisigAddress == null) throw new Error('Multisig address not set.')

      const bytesDatacap = Math.floor(anyToBytes(datacap))
      let pendingTxs
      try {
        pendingTxs = await wallet.api.pendingTransactions(multisigAddress)
      } catch (error) {
        console.log(error)
        throw new Error(
          'An error with the lotus node occurred. Please reload. If the problem persists, contact support.',
        )
      }
      let pendingForClient = null
      if (allocatorType !== AllocatorTypeEnum.CONTRACT) {
        pendingForClient = pendingTxs?.filter(
          (tx: any) =>
            tx?.parsed?.params?.address === clientAddress &&
            tx?.parsed?.params?.cap === BigInt(bytesDatacap),
        )
      } else {
        pendingForClient = pendingTxs?.filter((tx: any) => {
          const abi = parseAbi([
            'function addVerifiedClient(bytes clientAddress, uint256 amount)',
          ])

          const paramsHex: string = tx.parsed.params.toString('hex')
          const dataHex: Hex = `0x${paramsHex}`
          let decodedData
          try {
            decodedData = decodeFunctionData({ abi, data: dataHex })
          } catch (err) {
            console.error(err)
            return false
          }
          const [clientAddressData, amount] = decodedData.args
          const address = newFromString(clientAddress)
          const addressHex: Hex = `0x${Buffer.from(address.bytes).toString('hex')}`
          return (
            clientAddressData === addressHex && amount === BigInt(bytesDatacap)
          )
        })
      }
      return pendingForClient.length > 0 ? pendingForClient.at(-1) : false
    },
    [wallet, multisigAddress],
  )

  const getChangeSpsProposalTxs = useCallback(
    async (
      clientAddress: string,
      maxDeviation?: string,
      allowedSpCids?: {
        [key in string]: string[]
      },
      disallowedSpCids?: {
        [key in string]: string[]
      },
    ): Promise<Array<{
      cidName: 'Max Deviation' | 'Allowed Sps' | 'Disallowed Sps'
      tx: any
    }> | null> => {
      if (wallet == null) throw new Error('No wallet initialized.')
      if (multisigAddress == null) throw new Error('Multisig address not set.')

      const searchTransactions: Array<{
        cidName: 'Max Deviation' | 'Allowed Sps' | 'Disallowed Sps'
        abi: any
        args: any
      }> = []

      const evmClientAddress =
        await getEvmAddressFromFilecoinAddress(clientAddress)

      if (maxDeviation) {
        searchTransactions.push({
          cidName: 'Max Deviation',
          abi: parseAbi([
            'function setClientMaxDeviationFromFairDistribution(address client, uint256 maxDeviation)',
          ]),
          args: [evmClientAddress, BigInt(maxDeviation)],
        })
      }

      if (allowedSpCids) {
        for (const sSps of Object.values(allowedSpCids)) {
          const packed = encodePacked(
            sSps.map(() => 'uint64'),
            sSps,
          )

          searchTransactions.push({
            cidName: 'Allowed Sps',
            abi: parseAbi([
              'function addAllowedSPsForClientPacked(address client, bytes calldata allowedSPs_)',
            ]),
            args: [evmClientAddress, packed],
          })
        }
      }

      if (disallowedSpCids) {
        for (const dSps of Object.values(disallowedSpCids)) {
          const packed = encodePacked(
            dSps.map(() => 'uint64'),
            dSps,
          )

          searchTransactions.push({
            cidName: 'Disallowed Sps',
            abi: parseAbi([
              'function removeAllowedSPsForClientPacked(address client, bytes calldata disallowedSPs_)',
            ]),
            args: [evmClientAddress, packed],
          })
        }
      }

      if (!searchTransactions.length) return null

      let pendingTxs

      try {
        pendingTxs = await wallet.api.pendingTransactions(multisigAddress)
      } catch (error) {
        console.log(error)
        throw new Error(
          'An error with the lotus node occurred. Please reload. If the problem persists, contact support.',
        )
      }

      const results: Array<{
        cidName: 'Max Deviation' | 'Allowed Sps' | 'Disallowed Sps'
        tx: any
      }> = []

      for (let i = 0; i < pendingTxs.length; i++) {
        const transaction = pendingTxs[i]

        for (let i = 0; i < searchTransactions.length; i++) {
          const item = searchTransactions[i]

          const transactionParamsHex: string =
            transaction.parsed.params.toString('hex')
          const transactionDataHex: Hex = `0x${transactionParamsHex}`

          let decodedData

          try {
            decodedData = decodeFunctionData({
              abi: item.abi,
              data: transactionDataHex,
            })
          } catch (err) {
            console.error(err)
            continue
          }

          const [evmTransactionClientAddress, data] = decodedData.args

          if (
            evmTransactionClientAddress === item.args[0] &&
            data === item.args[1]
          ) {
            results.push({
              tx: transaction,
              cidName: item.cidName,
            })
          }
        }
      }

      return results.length ? results : null
    },
    [wallet, multisigAddress],
  )

  const sendProposalDirect = useCallback(
    async (clientAddress: string, bytesDatacap: number) => {
      if (wallet == null) throw new Error('No wallet initialized.')

      return wallet.api.multisigVerifyClient(
        multisigAddress,
        clientAddress,
        BigInt(bytesDatacap),
        activeAccountIndex,
      )
    },
    [wallet, multisigAddress, activeAccountIndex],
  )

  const sendProposalContract = useCallback(
    async (
      clientAddress: string,
      bytesDatacap: number,
      contractAddress: string,
    ) => {
      if (wallet == null) throw new Error('No wallet initialized.')

      const abi = parseAbi([
        'function addVerifiedClient(bytes clientAddress, uint256 amount)',
      ])

      const address = newFromString(clientAddress)

      const addressHex: Hex = `0x${Buffer.from(address.bytes).toString('hex')}`

      const calldataHex: Hex = encodeFunctionData({
        abi,
        args: [addressHex, BigInt(bytesDatacap)],
      })

      const calldata = Buffer.from(calldataHex.substring(2), 'hex')

      return wallet.api.multisigEvmInvoke(
        multisigAddress,
        contractAddress,
        calldata,
        activeAccountIndex,
      )
    },
    [wallet, multisigAddress, activeAccountIndex],
  )

  const getAllocatorAllowanceFromContract = useCallback(
    async (
      contractAddress: string,
      allocatorAddress: string,
    ): Promise<number> => {
      const abi = parseAbi([
        'function allowance(address allocator) view returns (uint256)',
      ])

      const evmAllocatorAddress =
        await getEvmAddressFromFilecoinAddress(allocatorAddress)

      const calldataHex: Hex = encodeFunctionData({
        abi,
        args: [evmAllocatorAddress.data],
      })

      const evmContractAddress =
        await getEvmAddressFromFilecoinAddress(contractAddress)

      const response = await makeStaticEthCall(
        evmContractAddress.data,
        calldataHex,
      )

      const allowance = fromHex(response.data as Hex, 'number')
      return allowance
    },
    [],
  )

  /**
   * Sends a proposal to a multisig wallet.
   *
   * @param {string} multisigAddress - The address of the multisig wallet.
   * @param {string} clientAddress - The address of the client.
   * @param {string} datacap - The datacap to be allocated.
   * @returns {Promise<string>} - A promise that resolves with the message CID.
   * @throws {Error} - Throws an error if no wallet is initialized.
   */
  const sendProposal = useCallback(
    async (props: SendProposalProps): Promise<string> => {
      if (wallet == null) throw new Error('No wallet initialized.')
      if (multisigAddress == null) throw new Error('Multisig address not set.')

      const {
        clientAddress,
        proposalAllocationAmount,
        allocatorType,
        contractAddress,
      } = props

      setMessage('Sending proposal...')

      const bytesDatacap = Math.floor(anyToBytes(proposalAllocationAmount))
      if (bytesDatacap === 0) throw new Error("Can't grant 0 datacap.")

      const messageCID =
        allocatorType === AllocatorTypeEnum.CONTRACT
          ? await sendProposalContract(
              clientAddress,
              bytesDatacap,
              contractAddress,
            )
          : await sendProposalDirect(clientAddress, bytesDatacap)

      setMessage(`Proposal sent correctly. CID: ${messageCID as string}`)

      return messageCID
    },
    [wallet, multisigAddress, sendProposalContract, sendProposalDirect],
  )

  /**
   * Sends an approval to a multisig wallet.
   *
   * @param {string} multisigAddress - The address of the multisig wallet.
   * @param {string} txHash - The hash of the transaction to approve.
   * @returns {Promise<string>} - A promise that resolves with the message CID.
   * @throws {Error} - Throws an error if no wallet is initialized.
   */
  const sendApproval = useCallback(
    async (txHash: string): Promise<string> => {
      if (wallet == null) throw new Error('No wallet initialized.')
      if (multisigAddress == null) throw new Error('Multisig address not set.')

      setMessage('Sending approval...')

      const messageCID = await wallet.api.approvePending(
        multisigAddress,
        txHash,
        activeAccountIndex,
      )

      setMessage(`Approval sent correctly. CID: ${messageCID as string}`)

      return messageCID
    },
    [wallet, multisigAddress, activeAccountIndex],
  )

  const getClientSPs = useCallback(
    async (client: string, contractAddress: string): Promise<string[]> => {
      const abi = parseAbi([
        'function clientSPs(address client) external view returns (uint256[] memory providers)',
      ])

      const [evmClientAddress, evmContractAddress] = await Promise.all([
        getEvmAddressFromFilecoinAddress(client),
        getEvmAddressFromFilecoinAddress(contractAddress),
      ])

      const calldataHex: Hex = encodeFunctionData({
        abi,
        args: [evmClientAddress.data],
      })

      const response = await makeStaticEthCall(
        evmContractAddress.data,
        calldataHex,
      )

      if (response.error) {
        return ['']
      }

      const decodedData = decodeFunctionResult({
        abi,
        data: response.data as `0x${string}`,
      })

      const result: string[] = decodedData.map((x) => x.toString())
      return result
    },
    [],
  )

  const getClientConfig = useCallback(
    async (client: string, contractAddress: string): Promise<string | null> => {
      const abi = parseAbi([
        'function clientConfigs(address client) external view returns (uint256)',
      ])

      const [evmClientAddress, evmContractAddress] = await Promise.all([
        getEvmAddressFromFilecoinAddress(client),
        getEvmAddressFromFilecoinAddress(contractAddress),
      ])

      const calldataHex: Hex = encodeFunctionData({
        abi,
        args: [evmClientAddress.data],
      })

      const response = await makeStaticEthCall(
        evmContractAddress.data,
        calldataHex,
      )

      if (response.error) {
        return null
      }

      const decodedData = decodeFunctionResult({
        abi,
        data: response.data as `0x${string}`,
      })

      return decodedData.toString()
    },
    [],
  )

  const prepareClientMaxDeviation = (
    clientAddressHex: Hex,
    maxDeviation: string,
  ): { calldata: Buffer; abi: any } => {
    const abi = parseAbi([
      'function setClientMaxDeviationFromFairDistribution(address client, uint256 maxDeviation)',
    ])

    const calldataHex: Hex = encodeFunctionData({
      abi,
      args: [clientAddressHex, BigInt(maxDeviation)],
    })

    const calldata = Buffer.from(calldataHex.substring(2), 'hex')

    return { calldata, abi }
  }

  const prepareClientAddAllowedSps = (
    clientAddressHex: Hex,
    allowedSps: string[],
  ): { calldata: Buffer; abi: any } => {
    const abi = parseAbi([
      'function addAllowedSPsForClientPacked(address client, bytes calldata allowedSPs_)',
    ])

    const parsedSps = allowedSps.map((x) => BigInt(x))

    const packed = encodePacked(
      parsedSps.map(() => 'uint64'),
      parsedSps,
    )

    const calldataHex: Hex = encodeFunctionData({
      abi,
      args: [clientAddressHex, packed],
    })

    const calldata = Buffer.from(calldataHex.substring(2), 'hex')

    return { calldata, abi }
  }

  const prepareClientRemoveAllowedSps = (
    clientAddressHex: Hex,
    disallowedSPs: string[],
  ): { calldata: Buffer; abi: any } => {
    const abi = parseAbi([
      'function removeAllowedSPsForClientPacked(address client, bytes calldata disallowedSPs_)',
    ])

    const parsedSps = disallowedSPs.map((x) => BigInt(x))

    const packed = encodePacked(
      parsedSps.map(() => 'uint64'),
      parsedSps,
    )

    const calldataHex: Hex = encodeFunctionData({
      abi,
      args: [clientAddressHex, packed],
    })

    const calldata = Buffer.from(calldataHex.substring(2), 'hex')

    return { calldata, abi }
  }

  const checkTransactionState = async (
    transactionCid: string,
    transactionName: string,
  ): Promise<void> => {
    if (transactionCid == null) {
      throw new Error(
        `Error sending ${transactionName} transaction. Please try again or contact support.`,
      )
    }

    const response = await getStateWaitMsg(transactionCid)

    if (
      typeof response.data === 'object' &&
      response.data.ReturnDec.Applied &&
      response.data.ReturnDec.Code !== 0
    ) {
      throw new Error(
        `Error sending ${transactionName} transaction. Please try again or contact support. Error code: ${response.data.ReturnDec.Code}`,
      )
    }
  }

  const submitClientAllowedSpsAndMaxDeviation = useCallback(
    async (
      clientAddress: string,
      contractAddress: string,
      allowedSps?: string[],
      disallowedSPs?: string[],
      maxDeviation?: string,
    ): Promise<{
      maxDeviationCid?: string
      allowedSpCids?: {
        [key in string]: string[]
      }
      disallowedSpCids?: {
        [key in string]: string[]
      }
    }> => {
      if (wallet == null) throw new Error('No wallet initialized.')
      if (multisigAddress == null) throw new Error('Multisig address not set.')

      const evmClientAddress =
        await getEvmAddressFromFilecoinAddress(clientAddress)

      const wait = async (ms: number): Promise<void> => {
        await new Promise((resolve) => setTimeout(resolve, ms))
      }

      const signatures: {
        maxDeviationCid?: string
        allowedSpsCids?: { [key in string]: string[] }
        removedSpsCids?: { [key in string]: string[] }
      } = {}

      function chunkArray<T>(array: T[], size: number): T[][] {
        const result: T[][] = []
        for (let i = 0; i < array.length; i += size) {
          result.push(array.slice(i, i + size))
        }
        return result
      }

      if (maxDeviation) {
        setMessage('Preparing the max deviation transaction...')

        await wait(2000)

        const { calldata } = prepareClientMaxDeviation(
          evmClientAddress.data,
          maxDeviation,
        )

        const maxDeviationTransaction = await wallet.api.multisigEvmInvoke(
          multisigAddress,
          contractAddress,
          calldata,
          activeAccountIndex,
        )

        setMessage(
          `Checking max deviation transaction, It may several second, please wait...`,
        )

        await checkTransactionState(maxDeviationTransaction, 'max deviation')

        signatures.maxDeviationCid = maxDeviationTransaction
      }

      if (allowedSps?.length) {
        const allowedChunkedArray = chunkArray(allowedSps, 8)

        for (let i = 0; i < allowedChunkedArray.length; i++) {
          const allowedSpsPart = allowedChunkedArray[i]

          const countMessage =
            allowedChunkedArray.length === 1
              ? '...'
              : `${i} / ${allowedChunkedArray.length}`

          setMessage(`Preparing the allowed SPs transactions ${countMessage}`)

          await wait(2000)

          const { calldata } = prepareClientAddAllowedSps(
            evmClientAddress.data,
            allowedSpsPart,
          )

          const allowedSpsTransaction = await wallet.api.multisigEvmInvoke(
            multisigAddress,
            contractAddress,
            calldata,
            activeAccountIndex,
          )

          setMessage(
            `Checking allowed SPs transaction, It may several second, please wait...`,
          )

          await checkTransactionState(allowedSpsTransaction, 'allowed SPs')

          if (!signatures.allowedSpsCids) {
            signatures.allowedSpsCids = {}
          }

          signatures.allowedSpsCids[allowedSpsTransaction] = allowedSpsPart
        }
      }

      if (disallowedSPs?.length) {
        const disallowedChunkedArray = chunkArray(disallowedSPs, 8)

        for (let i = 0; i < disallowedChunkedArray.length; i++) {
          const disallowedSpsPart = disallowedChunkedArray[i]

          const countMessage =
            disallowedChunkedArray.length === 1
              ? '...'
              : `${i} / ${disallowedChunkedArray.length}`

          setMessage(
            `Preparing the disallowed SPs transactions ${countMessage}`,
          )

          await wait(2000)

          const { calldata } = prepareClientRemoveAllowedSps(
            evmClientAddress.data,
            disallowedSpsPart,
          )

          const disallowedSpsTransaction = await wallet.api.multisigEvmInvoke(
            multisigAddress,
            contractAddress,
            calldata,
            activeAccountIndex,
          )

          setMessage(
            `Checking disallowed SPs transaction, It may several second, please wait...`,
          )

          await checkTransactionState(disallowedSpsTransaction, 'disallow SPs')

          if (!signatures.removedSpsCids) {
            signatures.removedSpsCids = {}
          }

          signatures.removedSpsCids[disallowedSpsTransaction] =
            disallowedSpsPart
        }
      }

      return signatures
    },
    [wallet, multisigAddress, activeAccountIndex],
  )

  const activeAddress = accounts[activeAccountIndex] ?? ''

  return {
    walletError,
    sign,
    activeAddress,
    getProposalTx,
    sendProposal,
    sendApproval,
    setActiveAccountIndex,
    initializeWallet,
    message,
    setMessage,
    accounts,
    loadMoreAccounts,
    getAllocatorAllowanceFromContract,
    getClientSPs,
    submitClientAllowedSpsAndMaxDeviation,
    getClientConfig,
    getChangeSpsProposalTxs,
  }
}

export default useWallet
