export const requestTypeColor = {
  First: 'bg-lime-500 text-white',
  Refill: 'bg-teal-500 text-white',
  default: 'bg-gray-400 text-white',
}

export const stateColor = {
  AdditionalInfoRequired: 'bg-red-400 text-white',
  AdditionalInfoSubmitted: 'bg-yellow-500 text-black', // 'bg-blue-400 text-white
  Submitted: 'bg-blue-400 text-white',
  ChangesRequested: 'bg-yellow-500 text-black',
  StartSignDatacap: 'bg-purple-400 text-white',
  ReadyToSign: 'bg-orange-500 text-white',
  Granted: 'bg-green-400 text-white',
  KYCRequested: 'bg-lime-400 text-white',
  ChangingSP: 'bg-amber-400 text-white',
  Declined: 'bg-red-400 text-white',
  TotalDatacapReached: 'bg-black text-white',
}

export const allocationActiveColor = {
  inactive: 'bg-purple-400 text-white',
  active: 'bg-green-500 text-white',
}

export const stateMapping = {
  Submitted: 'Pending Verifier Review',
  ChangesRequested: 'Changes requested',
  ReadyToSign: 'Ready to sign',
  StartSignDatacap: 'Start sign datacap',
  Granted: 'Granted',
  KYCRequested: 'KYC requested',
  ChangingSP: 'Changing SP',
}
