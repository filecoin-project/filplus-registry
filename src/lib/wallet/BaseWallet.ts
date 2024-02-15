import { config } from '../../config'
import { type ConfigLotusNode, type IWallet } from '@/type'

export abstract class BaseWallet implements IWallet {
  public api: any
  public lotusNode: ConfigLotusNode

  public abstract loadWallet(): Promise<void>
  public abstract getAccounts: (nStart?: number) => Promise<string[]>
  public abstract sign: (
    filecoinMessage: any,
    indexAccount: number,
  ) => Promise<any>

  /**
   * Creates an instance of BaseWallet.
   *
   * @param networkIndex - number - Index of the network to load the wallet for.
   * @param setMessage - (message: string | null) => void - Callback to set the message.
   */
  constructor(
    networkIndex: number = 0,
    readonly setMessage: (message: string | null) => void,
  ) {
    if (networkIndex === undefined) {
      networkIndex = 0
    }
    this.lotusNode = config.lotusNodes[networkIndex]
  }

  /**
   * This method selects the network to use.
   *
   * @param nodeIndex - Index of the node to select.
   * @returns
   */
  public async selectNetwork(nodeIndex: number): Promise<this> {
    this.lotusNode = config.lotusNodes[nodeIndex]
    await this.loadWallet()
    return this
  }

  /**
   * This method returns the BIP44 path for a given account index.
   *
   * @param index - Index of the account to get the BIP44 path for.
   * @returns
   */
  protected getBIP44Path(index: number): string {
    return `m/44'/${this.lotusNode.code}'/0'/0/${index}`
  }
}
