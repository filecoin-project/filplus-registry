import { useAllocator } from '@/lib/AllocatorProvider'
import { getAllowanceForVerifier } from '@/lib/glifApi'
import { bytesToiB, getUnallocatedDataCapFromContract } from '@/lib/utils'
import { useEffect, useMemo, useState } from 'react'
import useWallet from '@/hooks/useWallet'

interface ComponentProps {
  repo: string
  owner: string
  clientContractAddress: string | null
}

const AllocatorBalance: React.FC<ComponentProps> = ({
  owner,
  repo,
  clientContractAddress,
}) => {
  const { allocators } = useAllocator()
  const { getAllocatorAllowanceFromContract, getAllowanceFromClientContract } =
    useWallet()
  const [balance, setBalance] = useState<number | null>(null)
  const [unallocatedDataCap, setUnallocatedDataCap] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)
  const allocator = useMemo(
    () => allocators.find((a) => a.owner === owner && a.repo === repo),
    [allocators, owner, repo],
  )

  const getAllowanceClassic = async (
    multisigAddress: string,
  ): Promise<void> => {
    const multisigAllowance = await getAllowanceForVerifier(multisigAddress)
    if (multisigAllowance.success) {
      const allowance = parseInt(multisigAllowance.data)
      if (!isNaN(allowance)) {
        setBalance(allowance)
      } else {
        setBalance(0)
      }
    }
  }

  const getAllowanceSmartContract = async (
    contractAddress: string,
    multisigAddress: string,
  ): Promise<void> => {
    const [contractAllowance, allocatorAllowance] = await Promise.all([
      getAllowanceForVerifier(contractAddress),
      getAllocatorAllowanceFromContract(contractAddress, multisigAddress),
    ])
    if (contractAllowance.success) {
      const allowance = Math.min(
        parseInt(contractAllowance.data),
        allocatorAllowance,
      )
      if (!isNaN(allowance)) {
        setBalance(allowance)
      } else {
        setBalance(0)
      }
    }
  }

  const getUnallocatedDataCap = async (): Promise<void> => {
    if (!clientContractAddress) {
      return
    }
    const unallocatedDataCap = await getUnallocatedDataCapFromContract(
      clientContractAddress,
      getAllowanceFromClientContract,
    )
    if (Number(unallocatedDataCap) !== 0) {
      setUnallocatedDataCap(Number(unallocatedDataCap))
    }
  }

  const fetchBalance = async (
    address: string,
    multisigAddress: string,
    isMetaallocatorContract: boolean,
  ): Promise<void> => {
    setLoading(true)
    if (!isMetaallocatorContract) {
      await getAllowanceClassic(multisigAddress)
    } else {
      await getAllowanceSmartContract(address, multisigAddress)
    }
    await getUnallocatedDataCap()
    setLoading(false)
  }

  useEffect(() => {
    if (allocator) {
      const isMetaallocatorContract = (allocator?.tooling ?? '')
        .split(', ')
        .includes('smart_contract_allocator')
      void fetchBalance(
        allocator.ma_address ?? allocator.address,
        allocator.multisig_address,
        isMetaallocatorContract,
      )
    }
  }, [allocator]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div>Loading Allocator&apos;s DataCap balance...</div>

  return (
    <div className="flex flex-col gap-1">
      {balance !== null && (
        <div className="whitespace-nowrap">
          Allocator&apos;s DataCap balance: {bytesToiB(balance)}
        </div>
      )}
      {unallocatedDataCap !== 0 && (
        <div className="whitespace-nowrap">
          Unallocated DataCap on Contract: {bytesToiB(unallocatedDataCap)}
        </div>
      )}
    </div>
  )
}

export default AllocatorBalance
