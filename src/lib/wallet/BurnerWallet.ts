import signer from '@zondax/filecoin-signing-tools/js'
import { VerifyAPI } from 'filecoin-verifier-tools'
import { config } from '../../config'
import { BaseWallet } from './BaseWallet'

/**
 * Represents a BurnerWallet, a simple and ephemeral wallet type.
 */
export class BurnerWallet extends BaseWallet {
  private mnemonic: string = config.mnemonic ?? ''
  public name: string = 'Burner'

  constructor(
    networkIndex: number,
    readonly setMessage: (message: string | null) => void,
  ) {
    super(networkIndex, setMessage)

    if (this.mnemonic === '') {
      throw new Error(
        'No mnemonic provided. Please ensure the MNEMONIC environment variable is set.',
      )
    }
  }

  /**
   * Loads the wallet with a given network index.
   * @param networkIndex - Index of the network to load the wallet for.
   */
  public async loadWallet(): Promise<void> {
    try {
      const tokenProvider =
        config.dev_mode === 'production'
          ? {
              token: async () => this.lotusNode?.token,
            }
          : {
              token: async () => this.lotusNode?.token,
            }
      const isTestnet = process.env.NEXT_PUBLIC_IS_TESTNET === 'true'
      this.api = new VerifyAPI(
        VerifyAPI.browserProvider(this.lotusNode.url, tokenProvider),
        { sign: this.sign, getAccounts: this.getAccounts },
        isTestnet,
      )
    } catch (error) {
      console.error('Error loading wallet:', error)
      throw error
    }
  }

  /**
   * Imports a seed phrase to the wallet.
   * @param seedphrase - The mnemonic seed phrase.
   * @returns - The current instance of the BurnerWallet.
   */
  public importSeed(seedphrase: string): this {
    this.mnemonic = seedphrase
    return this
  }

  /**
   * Retrieves the account addresses from the burner wallet.
   * @param nStart - The starting index for the accounts to fetch.
   * @returns - An array of account addresses.
   */
  public getAccounts = async (nStart = 0): Promise<string[]> => {
    try {
      const accounts: string[] = []
      for (let i = nStart; i < config.numberOfWalletAccounts; i += 1) {
        const acc = signer.keyDerive(this.mnemonic, this.getBIP44Path(i), '')
        accounts.push(acc.address)
      }
      return accounts
    } catch (error) {
      console.error('Error getting accounts:', error)
      throw error
    }
  }

  /**
   * Signs a Filecoin message using the burner wallet's private key.
   * @param filecoinMessage - The message to sign.
   * @param indexAccount - The index of the account to use for signing.
   * @returns - The signed message.
   */
  public sign = async (
    filecoinMessage: string,
    indexAccount: number,
  ): Promise<any> => {
    try {
      const privateHex = signer.keyDerive(
        this.mnemonic,
        this.getBIP44Path(indexAccount),
        '',
      ).private_hexstring
      return signer.transactionSignLotus(filecoinMessage, privateHex)
    } catch (error) {
      console.error('Error signing transaction:', error)
      throw error
    }
  }
}
