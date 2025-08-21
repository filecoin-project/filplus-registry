import {
  getEvmAddressFromFilecoinAddress,
  getStateWaitMsg,
  makeStaticEthCall,
} from '@/lib/glifApi'
import { anyToBytes, getParsedMsigPendingTransactionParams } from '@/lib/utils'
import { BurnerWallet } from '@/lib/wallet/BurnerWallet'
import { LedgerWallet } from '@/lib/wallet/LedgerWallet'
import {
  AllocatorTypeEnum,
  type ParsedTransaction,
  type IWallet,
  type SendProposalProps,
} from '@/type'
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
    clientContractAddress?: string | null,
    amountOfDataCapSentToContract?: string | null,
  ) => Promise<{
    pendingVerifyClientTransaction: any
    pendingIncreaseAllowanceTransaction: any
  } | null>
  sendProposal: (props: SendProposalProps) => Promise<string>
  sendClientIncreaseAllowance: (props: {
    contractAddress: string
    clientAddress: string
    proposalAllocationAmount: string
  }) => Promise<string>
  sendClientDecreaseAllowanceProposal: (props: {
    clientContractAddress: string
    clientAddress: string
    amountOfDatacapToDecreaseInBytes: string
  }) => Promise<string>
  getDecreaseAllowanceProposalTx: (
    clientAddress: string,
    amountOfDatacapToDecreaseInBytes: string,
    clientContractAddress: string,
  ) => Promise<ParsedTransaction | null>
  sendApproval: (transaction: any) => Promise<string>
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
  getAllowanceFromClientContract: (
    clientAddress: string,
    contractAddress: string,
  ) => Promise<bigint>
  submitClientAllowedSpsAndMaxDeviation: (
    clientAddress: string,
    contractAddress: string,
    allowedSps: string[],
    disallowedSPs: string[],
    maxDeviationInPercentage?: number,
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
  ) => Promise<number | null>
  getChangeSpsProposalTxs: (
    clientAddress: string,
    maxDeviation?: number,
    allowedSpCids?: {
      [key in string]: string[]
    },
    disallowedSpCids?: {
      [key in string]: string[]
    },
  ) => Promise<Array<{
    cidName: 'max deviation' | 'add allowed Sps' | 'remove allowed Sps'
    tx: any
    args: string[]
    decodedPacked?: string[]
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
        throw err
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
      allocationAmount: string,
      allocatorType: AllocatorTypeEnum,
      clientContractAddress?: string | null,
      amountOfDataCapSentToContract?: string | null,
    ): Promise<{
      pendingVerifyClientTransaction: any
      pendingIncreaseAllowanceTransaction: any
    } | null> => {
      if (wallet == null) throw new Error('No wallet initialized.')
      if (multisigAddress == null) throw new Error('Multisig address not set.')

      const bytesAllocationAmount = Math.floor(anyToBytes(allocationAmount))

      const pendingTxs: ParsedTransaction[] =
        await getParsedMsigPendingTransactionParams(multisigAddress)

      const verifiedAbi = parseAbi([
        'function addVerifiedClient(bytes clientAddress, uint256 amount)',
      ])

      const increaseAllowanceAbi = parseAbi([
        'function increaseAllowance(address client, uint256 amount)',
      ])

      let pendingVerifyClientTransaction: ParsedTransaction | null = null
      let pendingIncreaseAllowanceTransaction: ParsedTransaction | null = null

      for (const transaction of pendingTxs) {
        if (clientContractAddress && !pendingIncreaseAllowanceTransaction) {
          if (typeof transaction.tx.calldata === 'undefined') {
            continue
          }
          const paramsHex = transaction.tx.calldata.toString('hex')
          const dataHex: Hex = `0x${paramsHex}`
          try {
            const increaseDecodedData = decodeFunctionData({
              abi: increaseAllowanceAbi,
              data: dataHex,
            })

            const [increaseClientAddress, increaseAmount] =
              increaseDecodedData.args

            const evmClientAddress = (
              await getEvmAddressFromFilecoinAddress(clientAddress)
            ).data

            if (
              increaseClientAddress.toLocaleLowerCase() === evmClientAddress &&
              increaseAmount === BigInt(bytesAllocationAmount)
            ) {
              pendingIncreaseAllowanceTransaction = transaction
              continue
            }
          } catch (err) {
            console.error(err)
          }
        }

        if (!pendingVerifyClientTransaction) {
          if (allocatorType !== AllocatorTypeEnum.CONTRACT) {
            if (
              typeof transaction.tx.address === 'undefined' ||
              typeof transaction.tx.cap === 'undefined'
            ) {
              continue
            }
            const addressToGrantDataCap = clientContractAddress ?? clientAddress
            if (
              transaction.tx.address === addressToGrantDataCap &&
              transaction.tx.cap === BigInt(bytesAllocationAmount)
            ) {
              pendingVerifyClientTransaction = transaction
              continue
            }
          } else {
            if (typeof transaction.tx.calldata === 'undefined') {
              continue
            }
            const paramsHex = transaction.tx.calldata.toString('hex')
            const dataHex: Hex = `0x${paramsHex}`
            try {
              const decodedData = decodeFunctionData({
                abi: verifiedAbi,
                data: dataHex,
              })

              const [clientAddressData, amount] = decodedData.args
              const address = newFromString(
                clientContractAddress ?? clientAddress,
              )
              const addressHex: Hex = `0x${Buffer.from(address.bytes).toString('hex')}`
              const bytesAmountOfDataCapSentToContract =
                amountOfDataCapSentToContract
                  ? Math.floor(anyToBytes(amountOfDataCapSentToContract))
                  : undefined

              if (
                clientAddressData === addressHex &&
                amount ===
                  BigInt(
                    bytesAmountOfDataCapSentToContract ?? bytesAllocationAmount,
                  )
              ) {
                pendingVerifyClientTransaction = transaction
                continue
              }
            } catch (err) {
              console.error(err)
            }
          }
        }

        if (
          (!clientContractAddress && !!pendingVerifyClientTransaction) ||
          (!!pendingVerifyClientTransaction &&
            !!pendingIncreaseAllowanceTransaction)
        ) {
          break
        }
      }

      if (
        !!pendingVerifyClientTransaction ||
        !!pendingIncreaseAllowanceTransaction
      ) {
        return {
          pendingVerifyClientTransaction,
          pendingIncreaseAllowanceTransaction,
        }
      } else {
        return null
      }
    },
    [wallet, multisigAddress],
  )

  const getChangeSpsProposalTxs = useCallback(
    async (
      clientAddress: string,
      maxDeviation?: number,
      allowedSpCids?: {
        [key in string]: string[]
      },
      disallowedSpCids?: {
        [key in string]: string[]
      },
    ): Promise<Array<{
      cidName: 'max deviation' | 'add allowed Sps' | 'remove allowed Sps'
      tx: any
      args: any
      decodedPacked?: string[]
    }> | null> => {
      if (wallet == null) throw new Error('No wallet initialized.')
      if (multisigAddress == null) throw new Error('Multisig address not set.')

      const searchTransactions: Array<{
        cidName: 'max deviation' | 'add allowed Sps' | 'remove allowed Sps'
        abi: any
        args: any
        decodedPacked?: string[]
      }> = []

      const evmClientAddress =
        await getEvmAddressFromFilecoinAddress(clientAddress)

      if (maxDeviation) {
        searchTransactions.push({
          cidName: 'max deviation',
          abi: parseAbi([
            'function setClientMaxDeviationFromFairDistribution(address client, uint256 maxDeviation)',
          ]),
          args: [evmClientAddress.data, BigInt(maxDeviation)],
        })
      }

      if (allowedSpCids) {
        for (const aSps of Object.values(allowedSpCids)) {
          const packed = encodePacked(
            aSps.map(() => 'uint64'),
            aSps,
          )

          searchTransactions.push({
            cidName: 'add allowed Sps',
            abi: parseAbi([
              'function addAllowedSPsForClientPacked(address client, bytes calldata allowedSPs_)',
            ]),
            args: [evmClientAddress.data, packed],
            decodedPacked: aSps,
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
            cidName: 'remove allowed Sps',
            abi: parseAbi([
              'function removeAllowedSPsForClientPacked(address client, bytes calldata disallowedSPs_)',
            ]),
            args: [evmClientAddress.data, packed],
            decodedPacked: dSps,
          })
        }
      }

      if (!searchTransactions.length) return null

      const pendingTxs: ParsedTransaction[] =
        await getParsedMsigPendingTransactionParams(multisigAddress)

      const results: Array<{
        cidName: 'max deviation' | 'add allowed Sps' | 'remove allowed Sps'
        tx: ParsedTransaction
        args: any[]
        decodedPacked?: string[]
      }> = []

      for (const transaction of pendingTxs) {
        if (typeof transaction.tx.calldata === 'undefined') {
          continue
        }
        for (let i = 0; i < searchTransactions.length; i++) {
          const item = searchTransactions[i]
          const decodedString = transaction.tx.calldata.toString('hex')
          const transactionDataHex: Hex = `0x${decodedString}`
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
            evmTransactionClientAddress.toLowerCase() === item.args[0] &&
            data === item.args[1]
          ) {
            results.push({
              tx: transaction,
              cidName: item.cidName,
              args: decodedData.args,
              decodedPacked: item.decodedPacked,
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

  const sendClientIncreaseAllowance = useCallback(
    async (props: {
      contractAddress: string
      clientAddress: string
      proposalAllocationAmount: string
    }) => {
      const { clientAddress, contractAddress, proposalAllocationAmount } = props

      if (wallet == null) throw new Error('No wallet initialized.')

      setMessage('Sending transaction to increase allowance...')

      const abi = parseAbi([
        'function increaseAllowance(address client, uint256 amount)',
      ])

      const bytesDatacap = Math.floor(anyToBytes(proposalAllocationAmount))
      if (bytesDatacap === 0) throw new Error("Can't grant 0 datacap.")

      const calldataHex: Hex = encodeFunctionData({
        abi,
        args: [clientAddress as `0x${string}`, BigInt(bytesDatacap)],
      })

      const calldata = Buffer.from(calldataHex.substring(2), 'hex')

      const increaseTransactionCID = await wallet.api.multisigEvmInvoke(
        multisigAddress,
        contractAddress,
        calldata,
        activeAccountIndex,
      )

      setMessage(
        `The 'increase allowance' transaction sent correctly CID: ${increaseTransactionCID as string}`,
      )

      return increaseTransactionCID
    },
    [wallet, multisigAddress, activeAccountIndex],
  )

  const sendClientDecreaseAllowanceProposal = useCallback(
    async (props: {
      clientContractAddress: string
      clientAddress: string
      amountOfDatacapToDecreaseInBytes: string
    }) => {
      const {
        clientAddress,
        clientContractAddress,
        amountOfDatacapToDecreaseInBytes,
      } = props

      if (wallet == null) throw new Error('No wallet initialized.')

      setMessage('Sending transaction to decrease allowance...')

      const abi = parseAbi([
        'function decreaseAllowance(address client, uint256 amount)',
      ])

      const bytesDatacap = Math.floor(
        anyToBytes(amountOfDatacapToDecreaseInBytes),
      )
      if (bytesDatacap === 0) throw new Error('Cannot decrease DataCap by 0.')
      const evmClientAddress = (
        await getEvmAddressFromFilecoinAddress(clientAddress)
      ).data
      const calldataHex: Hex = encodeFunctionData({
        abi,
        args: [evmClientAddress, BigInt(bytesDatacap)],
      })

      const calldata = Buffer.from(calldataHex.substring(2), 'hex')

      const decreaseTransactionCID = await wallet.api.multisigEvmInvoke(
        multisigAddress,
        clientContractAddress,
        calldata,
        activeAccountIndex,
      )

      setMessage(
        `The 'decrease allowance' transaction sent correctly CID: ${decreaseTransactionCID as string}`,
      )

      return decreaseTransactionCID
    },
    [wallet, multisigAddress, activeAccountIndex],
  )

  const getDecreaseAllowanceProposalTx = useCallback(
    async (
      clientAddress: string,
      amountOfDatacapToDecrease: string,
      clientContractAddress: string,
    ): Promise<ParsedTransaction | null> => {
      if (wallet == null) throw new Error('No wallet initialized.')
      if (multisigAddress == null) throw new Error('Multisig address not set.')

      const decreasedAmountInBytes = Math.floor(
        anyToBytes(amountOfDatacapToDecrease),
      )
      const pendingTxs: ParsedTransaction[] =
        await getParsedMsigPendingTransactionParams(multisigAddress)

      const decreaseAllowanceAbi = parseAbi([
        'function decreaseAllowance(address client, uint256 amount)',
      ])

      let pendingDecreaseAllowanceTransaction: ParsedTransaction | null = null

      for (const transaction of pendingTxs) {
        if (clientContractAddress && !pendingDecreaseAllowanceTransaction) {
          if (typeof transaction.tx.calldata === 'undefined') {
            continue
          }
          const paramsHex = transaction.tx.calldata.toString('hex')
          const dataHex: Hex = `0x${paramsHex}`
          try {
            const decreaseDecodedData = decodeFunctionData({
              abi: decreaseAllowanceAbi,
              data: dataHex,
            })

            const [decreaseClientAddress, decreaseAmount] =
              decreaseDecodedData.args

            const evmClientAddress = (
              await getEvmAddressFromFilecoinAddress(clientAddress)
            ).data

            if (
              decreaseClientAddress.toLocaleLowerCase() === evmClientAddress &&
              decreaseAmount === BigInt(decreasedAmountInBytes)
            ) {
              pendingDecreaseAllowanceTransaction = transaction
              break
            }
          } catch (err) {
            console.error(err)
          }
        }
      }

      return pendingDecreaseAllowanceTransaction
    },
    [wallet, multisigAddress],
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

      setMessage(
        `Waiting for confirmation. This can take a few minutes, don't close this page. CID: ${messageCID as string}`,
      )

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
    async (transaction: any): Promise<string> => {
      if (wallet == null) throw new Error('No wallet initialized.')
      if (multisigAddress == null) throw new Error('Multisig address not set.')

      setMessage('Sending approval...')

      const messageCID = await wallet.api.approvePending(
        multisigAddress,
        transaction,
        activeAccountIndex,
      )

      setMessage(
        `Waiting for confirmation. This can take a few minutes, don't close this page. CID: ${messageCID as string}`,
      )

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

  const getAllowanceFromClientContract = useCallback(
    async (client: string, contractAddress: string): Promise<bigint> => {
      const abi = parseAbi([
        'function allowances(address client) external view returns (uint256)',
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
        return BigInt(0)
      }

      const decodedData = decodeFunctionResult({
        abi,
        data: response.data as `0x${string}`,
      })

      return decodedData
    },
    [],
  )

  const getClientConfig = useCallback(
    async (client: string, contractAddress: string): Promise<number | null> => {
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

      return Number(decodedData)
    },
    [],
  )

  const prepareClientMaxDeviation = (
    clientAddressHex: Hex,
    maxDeviation: number,
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
      maxDeviation?: number,
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
        setMessage(`Preparing the 'max deviation' transaction...`)

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
          `Checking the 'max deviation' transaction, it may take a few minutes, please wait... Do not close this window.`,
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
              : `${i + 1} / ${allowedChunkedArray.length}`

          setMessage(
            `Preparing the 'add allowed SPs' transactions ${countMessage}`,
          )

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
            `Checking the 'add allowed SPs' transaction, it may take a few minutes, please wait... Do not close this window.`,
          )

          await checkTransactionState(allowedSpsTransaction, 'add allowed SPs')

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
              : `${i + 1} / ${disallowedChunkedArray.length}`

          setMessage(
            `Preparing the 'remove allowed SPs' transactions ${countMessage}`,
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
            `Checking the 'remove allowed SPs' transaction, it may take a few minutes, please wait... Do not close this window.`,
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
    sendClientIncreaseAllowance,
    getAllowanceFromClientContract,
    sendClientDecreaseAllowanceProposal,
    getDecreaseAllowanceProposalTx,
  }
}

export default useWallet
