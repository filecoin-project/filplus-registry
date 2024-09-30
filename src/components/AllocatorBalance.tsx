import { useAllocator } from '@/lib/AllocatorProvider'
import { getAllowanceForVerifier } from '@/lib/glifApi'
import { bytesToiB } from '@/lib/utils'
import { useEffect, useMemo, useState } from 'react'
import useWallet from '@/hooks/useWallet'

interface ComponentProps {
  repo: string
  owner: string
}

const AllocatorBalance: React.FC<ComponentProps> = ({ owner, repo }) => {
  const { allocators } = useAllocator()
  const { getAllocatorAllowanceFromContract } = useWallet()
  const [balance, setBalance] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)
  const allocator = useMemo(
    () => allocators.find((a) => a.owner === owner && a.repo === repo),
    [allocators, owner, repo],
  )

  const getAllowance = async (
    contractAddress: string,
    multisigAddress: string,
    allocatorSmartContract: boolean,
  ): Promise<number> => {
    let allowance = 0
    if (!allocatorSmartContract) {
      const multisigAllowance = await getAllowanceForVerifier(multisigAddress)
      if (multisigAllowance.success) {
        allowance = parseInt(multisigAllowance.data)
      }
    } else {
      const contractAllowance = await getAllowanceForVerifier(contractAddress)
      const allocatorAllowance = await getAllocatorAllowanceFromContract(
        contractAddress,
        multisigAddress,
      )
      if (contractAllowance.success) {
        allowance = Math.min(
          parseInt(contractAllowance.data),
          allocatorAllowance,
        )
      }
    }

    if (!isNaN(allowance)) {
      return allowance
    } else {
      return 0
    }
  }

  const fetchBalance = async (
    address: string,
    multisigAddress: string,
    allocatorSmartContract: boolean,
  ): Promise<void> => {
    setLoading(true)
    setBalance(
      await getAllowance(address, multisigAddress, allocatorSmartContract),
    )
    setLoading(false)
  }

  useEffect(() => {
    if (allocator) {
      const isMetaallocatorContract = allocator?.tooling
        .split(', ')
        .includes('smart_contract_allocator')
      void fetchBalance(
        allocator.address,
        allocator.multisig_address,
        isMetaallocatorContract,
      )
    }
  }, [allocator]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div>Loading Allocator&apos;s DataCap balance...</div>

  if (balance === null) return

  return <div>Allocator&apos;s DataCap balance: {bytesToiB(balance, true)}</div>
}

export default AllocatorBalance
