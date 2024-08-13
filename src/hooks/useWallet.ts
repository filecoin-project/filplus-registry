import { anyToBytes } from '@/lib/utils'
import { BurnerWallet } from '@/lib/wallet/BurnerWallet'
import { LedgerWallet } from '@/lib/wallet/LedgerWallet'
import { type IWallet } from '@/type'
import { useCallback, useState } from 'react'
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
  ) => Promise<string | boolean>
  sendProposal: (clientAddress: string, datacap: string) => Promise<string>
  sendApproval: (txHash: string) => Promise<string>
  sign: (message: string) => Promise<string>
  initializeWallet: (multisigAddress?: string) => Promise<string[]>
  message: string | null
  setMessage: (message: string | null) => void
  loadMoreAccounts: (number: number) => Promise<void>
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
      const pendingForClient = pendingTxs?.filter(
        (tx: any) =>
          tx?.parsed?.params?.address === clientAddress &&
          tx?.parsed?.params?.cap === BigInt(bytesDatacap),
      )
      return pendingForClient.length > 0 ? pendingForClient.at(-1) : false
    },
    [wallet, multisigAddress],
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
    async (clientAddress: string, datacap: string): Promise<string> => {
      if (wallet == null) throw new Error('No wallet initialized.')
      if (multisigAddress == null) throw new Error('Multisig address not set.')

      setMessage('Sending proposal...')

      const bytesDatacap = Math.floor(anyToBytes(datacap))
      try {
        const messageCID = await wallet.api.multisigVerifyClient(
          multisigAddress,
          clientAddress,
          BigInt(bytesDatacap),
          activeAccountIndex,
        )

        setMessage(`Proposal sent correctly. CID: ${messageCID as string}`)

        return messageCID
      } catch (error) {
        console.log(error)
        throw new Error(
          'Error sending proposal. Please try again or contact support.',
        )
      }
    },
    [wallet, multisigAddress, activeAccountIndex],
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
      try {
        const messageCID = await wallet.api.approvePending(
          multisigAddress,
          txHash,
          activeAccountIndex,
        )

        setMessage(`Approval sent correctly. CID: ${messageCID as string}`)

        return messageCID
      } catch (error) {
        console.log(error)

        throw new Error(
          'Error sending approval. Please try again or contact support.',
        )
      }
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
  }
}

export default useWallet
