import TransportWebUSB from '@ledgerhq/hw-transport-webusb'
import signer from '@zondax/filecoin-signing-tools/js'
import FilecoinApp from '@zondax/ledger-filecoin'
import { VerifyAPI } from 'filecoin-verifier-tools'
import { config } from '../../config'
import { BaseWallet } from './BaseWallet'

/**
 * This class is responsible for interfacing with a Ledger hardware wallet for Filecoin.
 */
export class LedgerWallet extends BaseWallet {
  ledgerBusy = false
  ledgerApp: any = false
  name: string = 'Ledger'
  maxAccounts: number = config.numberOfWalletAccounts
  loadedAccounts: string[] = []

  /**
   * Loads the wallet given a network index.
   * @param networkIndex - Index of the network to load the wallet for.
   */
  public async loadWallet(): Promise<void> {
    await this.initializeApi()
    await this.initializeLedger()
  }

  /**
   * Lists the Ledger devices connected to the computer.
   *
   * @returns {Promise<USBDevice[]>} - A promise that resolves with the list of devices.
   */
  public async detectLedgerDevices(): Promise<any[]> {
    return await TransportWebUSB.list()
  }

  /**
   * Initializes the API for the wallet.
   * @private
   */
  private async initializeApi(): Promise<void> {
    this.api = new VerifyAPI(
      VerifyAPI.browserProvider(this.lotusNode.url, {
        token: async () => this.lotusNode?.token,
      }),
      {
        sign: this.sign,
        getAccounts: () => this.loadedAccounts,
      },
      process.env.NEXT_PUBLIC_MODE !== 'production',
    )
  }

  /**
   * Initializes the Ledger hardware connection.
   * @private
   */
  private async initializeLedger(): Promise<void> {
    let transport
    try {
      transport = await TransportWebUSB.create()
    } catch (e: any) {
      throw new Error(e.message)
    }

    if (transport === null || transport === undefined) {
      throw new Error('Device not found')
    }

    try {
      this.ledgerApp = new FilecoinApp(transport)
      const version = await this.ledgerApp.getVersion()

      if (
        version.return_code === 65535 &&
        version.error_message.includes('LockedDeviceError') === true
      ) {
        throw new Error('Ledger locked. Please, unlock it.')
      }

      if (version.return_code === 28161) {
        throw new Error(
          'Filecoin application is not open in Ledger. Please, open it.',
        )
      }

      if (version.test_mode === true)
        throw new Error('Filecoin app in test mode.')

      if (version.minor < 18 || (version.minor === 18 && version.patch < 2)) {
        throw new Error('Please update Filecoin app on Ledger.')
      }
    } catch (e: any) {
      throw new Error(e.message)
    }
  }

  /**
   * Retrieves the account addresses from the Ledger wallet.
   * @param nStart - The starting index for the accounts to fetch.
   * @returns - An array of account addresses.
   */
  public getAccounts = async (numAccounts = 0): Promise<string[]> => {
    if (numAccounts === 0) numAccounts = config.numberOfWalletAccounts

    const paths = Array.from({ length: numAccounts }, (_, i) =>
      this.getBIP44Path(this.loadedAccounts.length + i),
    )
    const accounts = []

    for (const path of paths) {
      const returnLoad = await this.ledgerApp.getAddressAndPubKey(path)
      this.handleErrors(returnLoad)
      accounts.push(returnLoad.addrString)
    }

    this.loadedAccounts = this.loadedAccounts.concat(accounts)
    return accounts
  }

  /**
   * Signs a Filecoin message using the Ledger wallet.
   * @param filecoinMessage - The message to sign.
   * @param indexAccount - The index of the account to use for signing.
   * @returns - The signed message.
   */
  public sign = async (
    filecoinMessage: string,
    indexAccount: number,
  ): Promise<any> => {
    console.log(`Signing with account n.: ${indexAccount}`)
    debugger
    this.setMessage('Please review and sign the transaction on your Ledger.')
    const serializedMessage = signer.transactionSerialize(filecoinMessage)
    const signedMessage = this.handleErrors(
      await this.ledgerApp.sign(
        this.getBIP44Path(indexAccount),
        Buffer.from(serializedMessage, 'hex'),
      ),
    )
    return await this.generateSignedMessage(filecoinMessage, signedMessage)
  }

  /**
   * Generates a signed message based on a Filecoin message and its signature.
   * @private
   * @param filecoinMessage - The Filecoin message.
   * @param signedMessage - The message's signature.
   * @returns - A string representation of the signed message.
   */
  private readonly generateSignedMessage = async (
    filecoinMessage: any,
    signedMessage: any,
  ): Promise<string> => {
    return JSON.stringify({
      Message: {
        From: filecoinMessage.from,
        GasLimit: filecoinMessage.gaslimit,
        GasFeeCap: filecoinMessage.gasfeecap,
        GasPremium: filecoinMessage.gaspremium,
        Method: filecoinMessage.method,
        Nonce: filecoinMessage.nonce,
        Params: Buffer.from(filecoinMessage.params, 'hex').toString('base64'),
        To: filecoinMessage.to,
        Value: filecoinMessage.value,
      },
      Signature: {
        Data: signedMessage.signature_compact.toString('base64'),
        Type: 1,
      },
    })
  }

  /**
   * Signs a RemoveDataCap message using the Ledger wallet.
   * @param message - The message to sign.
   * @param indexAccount - The index of the account to use for signing.
   * @returns - The signed message in hex format.
   */
  public signRemoveDataCap = async (
    message: any,
    indexAccount: number,
  ): Promise<string> => {
    const messageBlob = Buffer.from(message.toString('hex'), 'hex')
    const signedMessage = await this.ledgerApp.signRemoveDataCap(
      `m/44'/${this.lotusNode.code}'/0'/0/${indexAccount}`,
      messageBlob,
    )
    const tsCompact: string = signedMessage.signature_compact.toString('hex')
    // const ts_der = signedMessage.signature_der.toString('hex')
    return `01${tsCompact}`
  }

  /**
   * Handles errors returned from the Ledger device or API.
   * @private
   * @param response - The response object to check for errors.
   * @returns - The response if no errors were found.
   * @throws {Error} - Throws an error if any were found in the response.
   */
  private handleErrors(response: any): any {
    if (response.error_message?.toLowerCase().includes('no errors') === true)
      return response

    if (
      response.error_message
        ?.toLowerCase()
        .includes('transporterror: invalild channel') === true
    ) {
      throw new Error(
        'Lost connection with Ledger. Please unplug and replug device.',
      )
    }

    throw new Error(response.error_message)
  }
}
