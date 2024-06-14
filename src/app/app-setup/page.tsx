'use client'

import { Spinner } from '@/components/ui/spinner'
import { submitGitHubInstallationId } from '@/lib/apiClient'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'

const AppSetupSuccess: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [isSuccess, setIsSuccess] = useState(false)
  const [repositories, setRepositories] = useState<string[]>([])
  const params = useSearchParams()

  useEffect(() => {
    const githubInstallationId = params.get('installation_id')
    if (!githubInstallationId) {
      toast.error('No installation ID found')
      setIsSuccess(false)
      setIsLoading(false)
    } else {
      void (async () => {
        const response = await submitGitHubInstallationId(githubInstallationId)
        setRepositories(
          response.repositories.map((repo) => `${repo.owner}/${repo.slug}`),
        )
        setIsSuccess(true)
        setIsLoading(false)
      })()
    }
  }, [params])

  if (isLoading)
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-20">
        <Spinner />
      </div>
    )

  if (!isSuccess) {
    return (
      <div
        style={{ height: 'calc(100% - 4rem)' }}
        className="bg-gray-100 flex flex-col items-center justify-center"
      >
        <div className="text-center p-4">
          <h1 className="text-2xl font-bold text-red-600 mb-2">
            Installation Failed
          </h1>
          {params.get('installation_id') ? (
            <p className="text-lg text-gray-600">
              We encountered an issue recording the GitHub app installation in
              the repositories.
            </p>
          ) : (
            <p className="text-lg text-gray-600">No installation ID found</p>
          )}
        </div>

        {params.get('installation_id') && (
          <div className="mt-6 text-red-600">Please try again later</div>
        )}
      </div>
    )
  } else {
    return (
      <div
        style={{ height: 'calc(100% - 4rem)' }}
        className="bg-gray-100 flex flex-col items-center justify-center"
      >
        <div className="text-center p-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Installation Successful!
          </h1>
          <p className="text-lg text-gray-600">
            The GitHub App has been successfully recorded in the following
            repositories:
          </p>
        </div>

        <div className="mt-4 p-4 bg-white shadow-md rounded-lg w-3/4 md:w-1/2">
          <ul>
            {repositories.map((repo, index) => (
              <li
                key={index}
                style={{ color: 'rgb(1,146,255)' }}
                className="text-lg list-none p-2 border-b border-gray-200"
              >
                {repo}
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }
}

export default AppSetupSuccess
