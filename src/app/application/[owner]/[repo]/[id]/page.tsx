'use client'
import AppHistory from '@/components/AppHistory'
import AppInfoCard from '@/components/cards/AppInfoCard'
import ProjectInfoCard from '@/components/cards/ProjectInfoCard'
import { Spinner } from '@/components/ui/spinner'
import useWallet from '@/hooks/useWallet'
import { useAllocator } from '@/lib/AllocatorProvider'
import { getApplicationByParams } from '@/lib/apiClient'
import { getAllowanceForVerifier } from '@/lib/glifApi'
// import { anyToBytes, bytesToiB } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { useQuery } from 'react-query'

interface ComponentProps {
  params: {
    id: string
    repo: string
    owner: string
  }
}

const ApplicationDetailPage: React.FC<ComponentProps> = ({
  params: { id, repo, owner },
}) => {
  const { selectedAllocator } = useAllocator()
  const { getAllocatorAllowanceFromContract } = useWallet()
  const { data, isLoading } = useQuery({
    queryKey: ['posts', id],
    queryFn: async () => await getApplicationByParams(id, repo, owner),
    refetchInterval: 10000,
  })

  const [allowance, setAllowance] = useState<any>()

  const getAllowanceClassic = async (
    multisigAddress: string,
  ): Promise<void> => {
    const multisigAllowance = await getAllowanceForVerifier(multisigAddress)
    if (multisigAllowance.success) {
      const allowance = parseInt(multisigAllowance.data)
      if (!isNaN(allowance)) {
        setAllowance(allowance)
      } else {
        setAllowance(0)
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
        setAllowance(allowance)
      } else {
        setAllowance(0)
      }
    }
  }

  useEffect(() => {
    if (typeof selectedAllocator === 'object') {
      const isMetaallocatorContract = (selectedAllocator?.tooling ?? '')
        .split(', ')
        .includes('smart_contract_allocator')
      if (!isMetaallocatorContract) {
        void getAllowanceClassic(selectedAllocator.multisig_address)
      } else {
        void getAllowanceSmartContract(
          selectedAllocator.address,
          selectedAllocator.multisig_address,
        )
      }
    }
  }, [selectedAllocator]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading || !data?.application_file)
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-20">
        <Spinner />
      </div>
    )

  if (data?.application_file)
    return (
      <div className="p-10">
        <div className="mb-10">
          <AppInfoCard
            application={data.application_file}
            allocation={data.allocation}
            repo={repo}
            owner={owner}
            allowance={allowance}
          />
        </div>
        <div className="mb-10">
          <ProjectInfoCard application={data.application_file} />
        </div>
        <div>
          <AppHistory
            datacapAllocations={data.application_file?.['Allocation Requests']}
            actor={data.application_file?.Lifecycle['Validated By']}
            totalRequestedAmount={
              data.application_file.Datacap['Total Requested Amount']
            }
          />
        </div>
      </div>
    )
}

export default ApplicationDetailPage
