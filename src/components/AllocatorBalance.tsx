import { useAllocator } from '@/lib/AllocatorProvider'
import { getAllowanceForAddress } from '@/lib/dmobApi'
import { bytesToiB } from '@/lib/utils'
import { useEffect, useMemo, useState } from 'react'

interface ComponentProps {
  repo: string
  owner: string
}

const getAllowance = async (address: string): Promise<number | null> => {
  const response = await getAllowanceForAddress(address)

  if (response.success) {
    return parseInt(response.data)
  }
  return null
}

const AllocatorBalance: React.FC<ComponentProps> = ({ owner, repo }) => {
  const { allocators } = useAllocator()
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const allocator = useMemo(
    () => allocators.find((a) => a.owner === owner && a.repo === repo),
    [allocators, owner, repo],
  )

  const fetchBalance = async (address: string): Promise<void> => {
    setLoading(true)
    setBalance(await getAllowance(address))
    setLoading(false)
  }

  useEffect(() => {
    if (allocator) {
      void fetchBalance(allocator.multisig_address)
    }
  }, [allocator])

  if (loading) return <div>Loading Allocator&apos;s DataCap balance...</div>

  if (balance === null) return

  return <div>Allocator&apos;s DataCap balance: {bytesToiB(balance, true)}</div>
}

export default AllocatorBalance
