export enum RefillUnit {
  PIB = 'PiB',
  TIB = 'TiB',
  GIB = 'GiB',
}

export interface RequestAmount {
  amount: string
  amountType: RefillUnit
}

export interface Application {
  Version: number
  ID: string
  'Issue Number': string
  Client: Client
  Project: Record<string, unknown>
  Datacap: Datacap
  Lifecycle: Lifecycle
  'Allocation Requests': AllocationRequest[]
  repo: string
  owner: string
  fullSpan?: boolean
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
}

export interface Signer {
  'Message CID': string
  'Signing Address': string
  'Created At': string
  'Github Username': string
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
  verifiers_gh_handles: string | string[]
}

export interface ByteConverterAutoscaleOptions {
  preferByte: boolean
  preferBit: boolean
  preferBinary: boolean
  preferDecimal: boolean
  preferSameBase: boolean
  preferOppositeBase: boolean
  preferSameUnit: boolean
  preferOppositeUnit: boolean
  // eslint-disable-next-line @typescript-eslint/ban-types
  handler: (curDataFormat: string, isUppingDataFormat: boolean) => {}
}
