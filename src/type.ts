import type { Address } from 'viem'

export enum AllocationUnit {
  B = 'B',
  GIB = 'GiB',
  TIB = 'TiB',
  PIB = 'PiB',
}

export interface RequestAmount {
  amount: string
  amountType: AllocationUnit
}

export interface Application {
  Version: number
  ID: string
  'Issue Number': string
  'Issue Reporter Handle': string
  Client: Client
  Project: Record<string, unknown>
  Datacap: Datacap
  Lifecycle: Lifecycle
  'Allocation Requests': AllocationRequest[]
  repo: string
  owner: string
  fullSpan?: boolean
  'Client Contract Address': string | null
  'Storage Providers Change Requests': StorageProvidersChangeRequest[]
}

export interface Allocation {
  allocation_amount_type: string
  allocation_amount_quantity_options: string[]
}

export interface Client {
  Name: string
  Region: string
  Industry: string
  Website: string
  'Social Media': string
  'Social Media Type': string
  Role: string
}

export interface Datacap {
  Type: string
  'Data Type': string
  'Total Requested Amount': string
  'Single Size Dataset': string
  Replicas: number
  'Weekly Allocation': string
}

export interface Lifecycle {
  State:
    | 'KYCRequested'
    | 'AdditionalInfoRequired'
    | 'AdditionalInfoSubmitted'
    | 'Submitted'
    | 'ChangesRequested'
    | 'ReadyToSign'
    | 'StartSignDatacap'
    | 'Granted'
    | 'TotalDatacapReached'
    | 'Error'
    | 'ChangingSP'
    | 'Declined'
    | 'TotalDatacapReached'

  'Validated At': string
  'Validated By': string
  Active: boolean
  'Updated At': string
  'Active Request ID': string | null
  'On Chain Address': string
  'Multisig Address': string
}

export interface AllocationRequest {
  ID: string
  'Request Type': 'First' | 'Refill' | 'Remove'
  'Created At': string
  'Updated At': string
  Active: boolean
  'Allocation Amount': string
  Signers: Signer[]
  AllocationAmountInBytes?: number
}

export interface Signer {
  'Message CID': string
  'Increase allowance CID': string | undefined
  'Signing Address': string
  'Created At': string
  'Github Username': string
  'Set Max Deviation CID': string | undefined
  'Add Allowed Storage Providers CID': { [key in string]: string[] } | undefined
  'Remove Allowed Storage Providers CID':
    | { [key in string]: string[] }
    | undefined
}

export interface StorageProvidersChangeRequest {
  ID: string
  'Created At': string
  'Updated At': string
  Active: boolean
  Signers: Signer[]
  'Allowed Storage Providers': string[]
  'Removed Storage Providers': string[]
  'Max Deviation': string
}

export interface IWallet {
  loadWallet: (networkIndex: number) => Promise<void>
  selectNetwork: (nodeIndex: number) => Promise<this>
  getAccounts: (nStart?: number) => Promise<string[]>
  sign: (filecoinMessage: any, indexAccount: number) => Promise<any>
  api: any
}

export interface ConfigLotusNode {
  name?: string
  code: number
  url: string | undefined
  token: string | undefined
  notaryRepo?: string
  notaryOwner?: string
  rkhMultisig?: string
  rkhtreshold?: number
  largeClientRequestAssign?: string[]
}

export interface API {
  actorAddress: (account: string) => Promise<string>
}

export interface ApiAllowanceResponse {
  error: string
  success: boolean
  data: string
}

export interface ApiFilecoinAddressToEthAddressResponse {
  error: string
  success: boolean
  data: Address
}

export interface ApiEthCallResponse {
  error: string
  success: boolean
  data: string
}

export interface ApiStateWaitMsgResponse {
  error: string
  success: boolean
  data:
    | {
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
    | string
}

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

export interface LDNActorsResponse {
  governance_gh_handles: string[]
  notary_gh_handles: string[]
}

export enum LDNActorType {
  Verifier = 'verifier',
}

export interface Allocator {
  id: number
  owner: string
  repo: string
  installation_id: string
  multisig_address: string
  multisig_threshold: number
  allocation_amount_type: string | null
  address: string
  tooling: string | null
  verifiers_gh_handles: string | string[]
  client_contract_address: string | null
  ma_address: string | null
}

export enum AllocatorTypeEnum {
  DIRECT = 'direct',
  CONTRACT = 'contract',
}

export interface SendProposalProps {
  allocatorType: AllocatorTypeEnum
  contractAddress: string
  clientAddress: string
  proposalAllocationAmount: string
}

export interface MsigPendingTransactions {
  result?: MsigResultItem[]
  error?: MsigError
}

interface MsigError {
  code?: number
  message: string
}

export interface MsigResultItem {
  Approved: string[]
  ID: number
  Method: number
  Params: string
  To: string
  Value: string
}

export interface ParsedTransaction {
  id: number
  tx: {
    from: string
    to: string
    value: string
    method: number
    params: Buffer
    calldata?: Buffer
    address?: string
    cap?: bigint
  }
}
