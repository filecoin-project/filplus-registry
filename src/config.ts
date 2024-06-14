const localConfig = {
  apiUri: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  networks: 'Localhost',
  lotusNodes: [
    {
      name: 'Localhost',
      code: 461,
      url: process.env.NEXT_PUBLIC_NODE_ADDRESS,
      token: process.env.NEXT_PUBLIC_NODE_TOKEN,
      notaryRepo: 'filecoin-notaries-onboarding',
      notaryOwner: 'keyko-io',
      rkhMultisig: 'f080',
      rkhtreshold: 2,
      largeClientRequestAssign: ['clriesco'],
    },
  ],
  dev_mode: process.env.NEXT_PUBLIC_MODE,
  numberOfWalletAccounts: 5,
  mnemonic: process.env.NEXT_PUBLIC_MNEMONIC,
  walletClass: 'LedgerWallet',
  dmobApiUrl: 'https://api.filplus.d.interplanetary.one/public/api',
  dmobApiKey: process.env.NEXT_PUBLIC_DMOB_API_KEY ?? '',
}

const prodConfig = {
  apiUri: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  networks: 'Mainnet',
  lotusNodes: [
    {
      name: 'Mainnet',
      code: 461,
      url: process.env.NEXT_PUBLIC_NODE_ADDRESS,
      token: process.env.NEXT_PUBLIC_NODE_TOKEN,
      notaryRepo: 'notary-governance',
      notaryOwner: 'filecoin-project',
      rkhMultisig: 'f2yk6skf7mpk5mkp3bk5qyy5pmxgic6hfp55z2wcq',
      rkhtreshold: 2,
      largeClientRequestAssign: ['galen-mcandrew'],
    },
  ],
  dev_mode: process.env.NEXT_PUBLIC_MODE,
  numberOfWalletAccounts: 5,
  mnemonic: process.env.MNEMONIC,
  walletClass: 'LedgerWallet',
  dmobApiUrl: 'https://api.filplus.d.interplanetary.one/public/api',
  dmobApiKey: process.env.NEXT_PUBLIC_DMOB_API_KEY ?? '',
}

export const config =
  process.env.NEXT_PUBLIC_MODE !== 'production' ? localConfig : prodConfig
