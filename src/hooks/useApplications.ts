import { useQuery, type UseQueryResult } from 'react-query'
import {
  getAllActiveApplications,
  getAllClosedApplications,
  getApplicationsForRepo,
  getClosedApplicationsForRepo,
} from '@/lib/apiClient'
import type { Allocator, Application } from '@/type'

export const useAllActiveApplications = (
  enabled: boolean,
): UseQueryResult<Application[] | undefined, unknown> => {
  return useQuery({
    queryKey: ['allApplications'],
    queryFn: async () => await getAllActiveApplications(),
    enabled,
    refetchOnWindowFocus: false,
  })
}

export const useAllClosedApplications = (
  enabled: boolean,
): UseQueryResult<Application[] | undefined, unknown> => {
  return useQuery({
    queryKey: ['allClosedApplications'],
    queryFn: async () => await getAllClosedApplications(),
    enabled,
    refetchOnWindowFocus: false,
  })
}

export const useRepoActiveApplications = (
  selectedAllocator: Allocator | undefined | 'all',
  enabled: boolean,
): UseQueryResult<Application[] | undefined, unknown> => {
  return useQuery({
    queryKey: ['repoActiveApplications', selectedAllocator],
    queryFn: async () => {
      if (selectedAllocator && typeof selectedAllocator !== 'string') {
        return await getApplicationsForRepo(
          selectedAllocator.repo,
          selectedAllocator.owner,
        )
      }
      return []
    },
    enabled,
    refetchOnWindowFocus: false,
  })
}

export const useRepoClosedApplications = (
  selectedAllocator: Allocator | undefined | 'all',
  enabled: boolean,
): UseQueryResult<Application[] | undefined, unknown> => {
  return useQuery({
    queryKey: ['repoClosedApplications', selectedAllocator],
    queryFn: async () => {
      if (selectedAllocator && typeof selectedAllocator !== 'string') {
        return await getClosedApplicationsForRepo(
          selectedAllocator.repo,
          selectedAllocator.owner,
        )
      }
      return []
    },
    enabled,
    refetchOnWindowFocus: false,
  })
}
