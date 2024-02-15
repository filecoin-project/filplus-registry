'use client'
import AppHistory from '@/components/AppHistory'
import AppInfoCard from '@/components/cards/AppInfoCard'
import ProjectInfoCard from '@/components/cards/ProjectInfoCard'
import { Spinner } from '@/components/ui/spinner'
import { getApplicationByParams } from '@/lib/apiClient'
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
  const { data, isLoading } = useQuery({
    queryKey: ['posts', id],
    queryFn: async () => await getApplicationByParams(id, repo, owner),
    refetchInterval: 10000,
  })

  if (isLoading)
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-20">
        <Spinner />
      </div>
    )

  if (data != null)
    return (
      <div className="p-10">
        <div className="mb-10">
          <AppInfoCard application={data} repo={repo} owner={owner} />
        </div>
        <div className="mb-10">
          <ProjectInfoCard application={data} />
        </div>
        <div>
          <AppHistory
            datacapAllocations={data['Allocation Requests']}
            actor={data.Lifecycle['Validated By']}
          />
        </div>
      </div>
    )
}

export default ApplicationDetailPage
