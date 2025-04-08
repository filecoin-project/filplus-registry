'use client'
import AppCard from '@/components/cards/HomePageCard'
import { generateColumns } from '@/components/table/columns'
import { DataTable } from '@/components/table/data-table'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ToastContent } from '@/components/ui/toast-message-cid'
import { useAllocator } from '@/lib/AllocatorProvider'
import {
  cacheRenewal,
  getAllActiveApplications,
  getAllClosedApplications,
  getApplicationsForRepo,
  getClosedApplicationsForRepo,
} from '@/lib/apiClient'
import { bytesToiB } from '@/lib/utils'
import { type Application } from '@/type'
import { Checkbox, FormControlLabel } from '@mui/material'
import { Search } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { type MouseEventHandler, useEffect, useState } from 'react'
import { useQuery } from 'react-query'
import { toast } from 'react-toastify'

export default function Home(): JSX.Element {
  const { allocators, selectedAllocator, setSelectedAllocator } = useAllocator()
  const [isShowClosedApplicationChecked, setIsShowClosedApplicationChecked] =
    useState(false)
  const [closedApplications, setClosedApplications] = useState<
    Application[] | undefined
  >(undefined)
  const [activeApplications, setActiveApplications] = useState<
    Application[] | undefined
  >(undefined)
  const [closedApplicationsForRepo, setClosedApplicationsForRepo] = useState<
    Application[] | undefined
  >(undefined)
  const [activeApplicationsForRepo, setActiveApplicationsForRepo] = useState<
    Application[] | undefined
  >(undefined)
  const session = useSession()

  const fetchApplications = async (): Promise<Application[] | undefined> => {
    if (isShowClosedApplicationChecked) {
      if (!closedApplications) {
        const closedApps = await getAllClosedApplications()
        setClosedApplications(closedApps)
        return closedApps
      }
      return closedApplications
    } else {
      if (!activeApplications) {
        const activeApps = await getAllActiveApplications()
        setActiveApplications(activeApps)
        return activeApps
      }
      return activeApplications
    }
  }

  const fetchApplicationsForRepo = async (
    repo: string,
    owner: string,
  ): Promise<Application[] | undefined> => {
    if (!isShowClosedApplicationChecked) {
      if (!activeApplicationsForRepo) {
        const activeApps = await getApplicationsForRepo(repo, owner)
        setActiveApplicationsForRepo(activeApps)
        return activeApps
      }
      return activeApplicationsForRepo
    } else {
      if (!closedApplicationsForRepo) {
        const closedApps = await getClosedApplicationsForRepo(repo, owner)
        setClosedApplicationsForRepo(closedApps)
        return closedApps
      }
      return closedApplicationsForRepo
    }
  }

  const {
    data: repoApplications,
    isLoading: isRepoLoading,
    error: repoError,
    refetch: refetchRepoApplications,
  } = useQuery({
    queryKey: [
      'repoApplications',
      selectedAllocator,
      isShowClosedApplicationChecked,
    ],
    queryFn: async () => {
      if (selectedAllocator && typeof selectedAllocator !== 'string') {
        return await fetchApplicationsForRepo(
          selectedAllocator.repo,
          selectedAllocator.owner,
        )
      }
      return []
    },
    enabled:
      !!selectedAllocator &&
      typeof selectedAllocator !== 'string' &&
      session.status === 'authenticated',
    refetchOnWindowFocus: false,
    refetchInterval: false,
    retry: false,
  })

  const {
    data: allApplications,
    isLoading: isAllLoading,
    error: allApplicationsError,
    refetch: refetchAllApplications,
  } = useQuery({
    queryKey: ['allApplications', isShowClosedApplicationChecked],
    queryFn: async () => {
      return await fetchApplications()
    },
    enabled:
      (!selectedAllocator && session.status !== 'authenticated') ||
      selectedAllocator === 'all',
    refetchOnWindowFocus: false,
    refetchInterval: false,
    retry: false,
  })

  useEffect(() => {
    if (!allocators?.length) {
      setSelectedAllocator(undefined)
    } else if (!selectedAllocator) {
      setSelectedAllocator(allocators[0])
    }
  }, [allocators, selectedAllocator, setSelectedAllocator])

  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Application[]>([])

  const [openDialog, setOpenDialog] = useState(false)
  const [isModalLoading, setIsModalLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const searchParams = useSearchParams()
  const notification = searchParams.get('notification')
  const router = useRouter()
  const pathName = usePathname()

  useEffect(() => {
    if (repoError instanceof Error) toast.error(`Error: ${repoError.message}`)
    if (allApplicationsError instanceof Error)
      toast.error(`Error: ${allApplicationsError.message}`)
  }, [repoError, allApplicationsError])

  useEffect(() => {
    const handleNotification = async (): Promise<void> => {
      if (notification != null) {
        const messageCID = searchParams.get('messageCID') ?? ''
        const amount = searchParams.get('amount') ?? '-'
        const client = searchParams.get('client') ?? '0'

        toast(
          <ToastContent
            amount={bytesToiB(Number(amount))}
            client={client}
            messageCID={messageCID}
          />,
          {
            autoClose: 5000,
            type: toast.TYPE.SUCCESS,
          },
        )

        router.replace(pathName)
      }
    }

    handleNotification().catch((error) => {
      console.error(error)
    })
  }, [notification, router, searchParams, pathName])

  useEffect(() => {
    if (
      isRepoLoading &&
      repoApplications == null &&
      isAllLoading &&
      allApplications == null
    )
      return

    const debounceTimeout = setTimeout(() => {
      const dataToFilter =
        (selectedAllocator && typeof selectedAllocator !== 'string'
          ? repoApplications
          : allApplications) ?? []
      const filteredData = dataToFilter.filter(
        (app) => filter === 'all' || app.Lifecycle.State === filter,
      )
      const searchResults = searchTerm
        ? filteredData.filter((app) => {
            const clientName = app.Client?.Name?.toLowerCase() || ''
            const owner = app.owner?.toLowerCase() || ''
            const repo = app.repo?.toLowerCase() || ''
            const issueReporterHandle =
              app['Issue Reporter Handle']?.toLowerCase() || ''
            const dataSampleSet =
              (app.Project[
                'Please share a sample of the data (a link to a file, an image, a table, etc., are good ways to do this.)'
              ] as string) || ''
            const dataSampleSetToLower = dataSampleSet.toLowerCase()
            const searchLower = searchTerm.toLowerCase()

            return (
              clientName.includes(searchLower) ||
              owner.includes(searchLower) ||
              repo.includes(searchLower) ||
              issueReporterHandle.includes(searchLower) ||
              dataSampleSetToLower.includes(searchLower)
            )
          })
        : filteredData
      setSearchResults(searchResults)
    }, 500)

    return () => {
      clearTimeout(debounceTimeout)
    }
  }, [
    searchTerm,
    filter,
    repoApplications,
    allApplications,
    isRepoLoading,
    isAllLoading,
    selectedAllocator,
  ])

  const handleRenewal = async (): Promise<void> => {
    try {
      if (selectedAllocator && selectedAllocator !== 'all') {
        setIsModalLoading(true)
        const { owner, repo } = selectedAllocator
        const data = await cacheRenewal(owner, repo)

        if (data) {
          toast.success('Renewal successful')
          setIsModalLoading(false)
          setOpenDialog(false)
          setIsLoading(true)
          await refetchRepoApplications()
          await refetchAllApplications()
          setIsLoading(false)
        }
      }
    } catch (error) {
      console.log(error)
      toast.error('Something went wrong! Please try again.')
    }
  }

  const handleCheckboxChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const isChecked = e.target.checked
    setIsShowClosedApplicationChecked(isChecked)
  }

  if (isRepoLoading || isAllLoading || isLoading)
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-20">
        <Spinner />
      </div>
    )

  const sortedResults = searchResults?.sort((a, b) => {
    const ownerA = a.owner?.toLowerCase()
    const ownerB = b.owner?.toLowerCase()

    if (ownerA < ownerB) {
      return -1
    }
    if (ownerA > ownerB) {
      return 1
    }
    return 0
  })

  sortedResults.forEach((item, index) => {
    if (index === 0 || item.repo !== sortedResults[index - 1].repo) {
      const repoIssues = sortedResults.filter(
        (issue) => issue.repo === item.repo,
      )
      repoIssues.sort(
        (a, b) => parseInt(b['Issue Number']) - parseInt(a['Issue Number']),
      )
      repoIssues.forEach((issue, i) => {
        sortedResults[index + i] = issue
      })
    }
  })

  let prevRepo: string | null = null

  const mappedData = sortedResults.map((item, index) => {
    const newItem = { ...item }

    if (prevRepo !== null && newItem.repo !== prevRepo) {
      newItem.fullSpan = true
    } else {
      newItem.fullSpan = false
    }

    if (index === 0) {
      newItem.fullSpan = true
    }

    prevRepo = newItem.repo
    return newItem
  })

  return (
    <main className="mt-10 px-10 grid select-none">
      <Tabs defaultValue="table">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex items-center relative">
              <Search className="absolute left-2" size={20} />
              <Input
                type="search"
                placeholder="Search Application..."
                className="md:w-[100px] lg:w-[300px] pl-10"
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                }}
              />
            </div>

            <Select
              onValueChange={(value) => {
                setFilter(value)
              }}
            >
              <SelectTrigger id="area" className="w-[180px]">
                <SelectValue placeholder="Filter Applications" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Granted">Granted</SelectItem>
                <SelectItem value="ReadyToSign">Ready to sign</SelectItem>
                <SelectItem value="StartSignDatacap">
                  Start signing datacap
                </SelectItem>
                <SelectItem value="ChangesRequested">
                  Changes Requested
                </SelectItem>
                <SelectItem value="Submitted">Verifier Review</SelectItem>
                <SelectItem value="AdditionalInfoSubmitted">
                  Additional Info Submitted
                </SelectItem>
                <SelectItem value="AdditionalInfoRequired">
                  Additional Info Required
                </SelectItem>
              </SelectContent>
            </Select>
            {allocators && allocators.length > 0 && (
              <Select
                value={
                  selectedAllocator
                    ? typeof selectedAllocator !== 'string'
                      ? selectedAllocator.owner + '-' + selectedAllocator.repo
                      : 'all'
                    : ''
                }
                onValueChange={(value) => {
                  setIsShowClosedApplicationChecked(false)
                  setClosedApplicationsForRepo(undefined)
                  setActiveApplicationsForRepo(undefined)
                  if (value === 'all') {
                    setSelectedAllocator(value)
                    return
                  }
                  setSelectedAllocator(
                    allocators.find((e) => e.owner + '-' + e.repo === value),
                  )
                }}
              >
                <SelectTrigger id="area" className="w-[240px]">
                  <SelectValue placeholder="Select Repository" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key={'All repositories'} value={'all'}>
                    All repositories
                  </SelectItem>
                  {allocators.map((e) => (
                    <SelectItem
                      key={e.owner + '-' + e.repo}
                      value={e.owner + '-' + e.repo}
                    >
                      {(e.owner + '/' + e.repo).length > 26
                        ? e.owner.slice(0, 7) +
                          '...' +
                          '/' +
                          e.repo.slice(0, 12) +
                          '...'
                        : e.owner + '/' + e.repo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {allocators && allocators.length > 0 && (
              <div>
                {selectedAllocator && selectedAllocator !== 'all' && (
                  <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                    <DialogTrigger asChild>
                      <Button variant="default">Renew cache</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] border-none">
                      {isModalLoading && (
                        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
                          <Spinner />
                        </div>
                      )}
                      <DialogHeader>
                        <DialogTitle>Renew cache</DialogTitle>
                        <DialogDescription>
                          This action will renew the cache for{' '}
                          <span className="text-xs bg-gray-200 p-1 rounded-sm">
                            {selectedAllocator?.owner}/{selectedAllocator.repo}.
                          </span>
                        </DialogDescription>
                      </DialogHeader>

                      <DialogFooter className="mt-4 sm:justify-end">
                        <DialogClose asChild>
                          <Button type="button" variant="secondary">
                            Close
                          </Button>
                        </DialogClose>
                        <Button
                          onClick={
                            handleRenewal as MouseEventHandler<HTMLButtonElement>
                          }
                        >
                          Confirm
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            )}

            <div>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isShowClosedApplicationChecked}
                    onChange={handleCheckboxChange}
                  />
                }
                label={'Show closed applications'}
              />
            </div>
          </div>

          <TabsList>
            <TabsTrigger value="table">Table View</TabsTrigger>
            <TabsTrigger value="grid">Grid View</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="table">
          <DataTable
            columns={generateColumns(
              selectedAllocator && typeof selectedAllocator !== 'string'
                ? {
                    owner: selectedAllocator.owner,
                    repo: selectedAllocator.repo,
                  }
                : undefined,
            )}
            data={mappedData}
          />
        </TabsContent>
        <TabsContent value="grid">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 ">
            {searchResults?.map((app: Application) => (
              <AppCard
                application={app}
                repo={
                  selectedAllocator && typeof selectedAllocator !== 'string'
                    ? selectedAllocator.repo
                    : undefined
                }
                owner={
                  selectedAllocator && typeof selectedAllocator !== 'string'
                    ? selectedAllocator.owner
                    : undefined
                }
                key={app.ID}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </main>
  )
}
