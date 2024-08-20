'use client'
import AppHistory from '@/components/AppHistory'
import AppInfoCard from '@/components/cards/AppInfoCard'
import ProjectInfoCard from '@/components/cards/ProjectInfoCard'
import { Spinner } from '@/components/ui/spinner'
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
  const { allocators } = useAllocator()

  const { data, isLoading } = useQuery({
    queryKey: ['posts', id],
    queryFn: async () => await getApplicationByParams(id, repo, owner),
    refetchInterval: 10000,
  })

  const [allowanceMultisig, setAllowanceMultisig] = useState<any>()

  const multisigAddress = allocators[0]?.multisig_address

  const getAllowance = async (address: string): Promise<void> => {
    try {
      const response = await getAllowanceForVerifier(address)

      if (response.success) {
        setAllowanceMultisig(parseInt(response.data))
      }
    } catch (error) {
      console.log(error, 'error in getAllowance')
    }
  }

  useEffect(() => {
    if (multisigAddress) {
      void getAllowance(multisigAddress)
    }
  }, [multisigAddress])

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
            allowanceMultisig={allowanceMultisig}
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
