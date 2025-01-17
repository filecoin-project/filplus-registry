import { config } from '@/config'
import { type MsigResultItem } from '@/type'
import { type Address, createPublicClient, http, rpcSchema } from 'viem'
import { filecoin, filecoinCalibration } from 'viem/chains'

interface ApproveReturn {
  Applied: boolean
  Code: number
  Ret: string
}

interface ProposeReturn {
  Applied: boolean
  Code: number
  Ret: string
  TxnID: number
}

interface StateWaitMsgResponse {
  Height: number
  Message: {
    '/': string
  }
  Receipt: {
    EventsRoot: string | null
    ExitCode: number
    GasUsed: number
    Return: string
  }
  ReturnDec: ApproveReturn | ProposeReturn
  TipSet: Array<{
    '/': string
  }>
}

type FilecoinRpcSchema = [
  {
    Method: 'Filecoin.StateVerifierStatus'
    Parameters: [string, null]
    ReturnType: string | null
  },
  {
    Method: 'Filecoin.StateVerifiedClientStatus'
    Parameters: [string, null]
    ReturnType: string | null
  },
  {
    Method: 'Filecoin.FilecoinAddressToEthAddress'
    Parameters: [string, string | null]
    ReturnType: string | null
  },
  {
    Method: 'Filecoin.EthCall'
    Parameters: [
      {
        from: string | null
        to: string
        data: Address
      },
      string | number,
    ]
    ReturnType: string | null
  },
  {
    Method: 'Filecoin.StateWaitMsg'
    Parameters: [
      {
        '/': string
      },
      number,
      number,
      boolean,
    ]
    ReturnType: StateWaitMsgResponse
  },
  {
    Method: 'Filecoin.MsigGetPending'
    Parameters: [string, null]
    ReturnType: MsigResultItem[]
  },
]

export interface IFilecoinClient {
  verifierStatus: (address: string) => Promise<string | null>
  verifiedClientStatus: (address: string) => Promise<string | null>
  filecoinAddressToEthAddress: (address: string) => Promise<string | null>
  waitMsg: (
    cid: string,
    confidence: number,
    limitChainEpoch: number,
    allowReplaced: boolean,
  ) => Promise<StateWaitMsgResponse | string | null>
  staticCall: (
    params: { from: string | null; to: string; data: Address },
    blockNumber: string | number,
  ) => Promise<string | null>
  msigGetPending: (msigAddress: string) => Promise<MsigResultItem[]>
}

export class FilecoinClient implements IFilecoinClient {
  private readonly client

  constructor() {
    this.client = createPublicClient({
      chain: config.dev_mode === 'production' ? filecoin : filecoinCalibration,
      rpcSchema: rpcSchema<FilecoinRpcSchema>(),
      transport: http(config?.glifNodeUrl),
    })
  }

  public async verifierStatus(address: string): Promise<string | null> {
    const status: string = await this.client.request({
      method: 'Filecoin.StateVerifierStatus',
      params: [address, null],
    })

    return status
  }

  public async verifiedClientStatus(address: string): Promise<string | null> {
    const status: string = await this.client.request({
      method: 'Filecoin.StateVerifiedClientStatus',
      params: [address, null],
    })

    return status
  }

  public async filecoinAddressToEthAddress(
    address: string,
  ): Promise<Address | null> {
    const status: Address = await this.client.request({
      method: 'Filecoin.FilecoinAddressToEthAddress',
      params: [address, null],
    })

    return status
  }

  public async staticCall(
    params: { from: string | null; to: string; data: Address },
    blockNumber: string | number,
  ): Promise<string | null> {
    const status: string = await this.client.request({
      method: 'Filecoin.EthCall',
      params: [params, blockNumber ?? 'latest'],
    })

    return status
  }

  public async waitMsg(
    cid: string,
    confidence = 1,
    limitChainEpoch = 10,
    allowReplaced = true,
  ): Promise<StateWaitMsgResponse | string | null> {
    const waitMsg = await this.client.request({
      method: 'Filecoin.StateWaitMsg',
      params: [
        {
          '/': cid,
        },
        confidence,
        limitChainEpoch,
        allowReplaced,
      ],
    })

    return waitMsg
  }

  public async msigGetPending(msigAddress: string): Promise<MsigResultItem[]> {
    const response = await this.client.request({
      method: 'Filecoin.MsigGetPending',
      params: [msigAddress, null],
    })
    return response
  }
}
