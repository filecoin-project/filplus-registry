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
import { cacheRenewal } from '@/lib/apiClient'
import { bytesToiB } from '@/lib/utils'
import { type Application } from '@/type'
import { Checkbox, FormControlLabel } from '@mui/material'
import { Search } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { type MouseEventHandler, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import {
  useAllActiveApplications,
  useAllClosedApplications,
  useRepoActiveApplications,
  useRepoClosedApplications,
} from '@/hooks/useApplications'

export default function Home(): JSX.Element {
  const { allocators, selectedAllocator, setSelectedAllocator } = useAllocator()
  const [isShowClosedApplicationChecked, setIsShowClosedApplicationChecked] =
    useState(false)
  const session = useSession()

  const {
    data: allActiveApps,
    isLoading: isAllActiveAppsLoading,
    error: allActiveAppsError,
    refetch: refetchAllActiveApps,
  } = useAllActiveApplications(
    (!selectedAllocator && session.status !== 'authenticated') ||
      selectedAllocator === 'all',
  )

  const {
    data: allClosedApps,
    isLoading: isAllClosedLoading,
    error: allClosedAppsError,
    refetch: refetchAllClosedApps,
  } = useAllClosedApplications(
    (!selectedAllocator && session.status !== 'authenticated') ||
      selectedAllocator === 'all',
  )

  const {
    data: repoActiveApps,
    isLoading: isRepoActiveAppsLoading,
    error: repoActiveAppsError,
    refetch: refetchRepoActiveApps,
  } = useRepoActiveApplications(
    selectedAllocator,
    !!selectedAllocator &&
      typeof selectedAllocator !== 'string' &&
      session.status === 'authenticated',
  )

  const {
    data: repoClosedApps,
    isLoading: isRepoClosedAppsLoading,
    error: repoClosedAppsError,
    refetch: refetchRepoClosedApps,
  } = useRepoClosedApplications(
    selectedAllocator,
    !!selectedAllocator &&
      typeof selectedAllocator !== 'string' &&
      session.status === 'authenticated',
  )

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
    if (repoActiveAppsError instanceof Error)
      toast.error(`Error: ${repoActiveAppsError.message}`)
    if (allActiveAppsError instanceof Error)
      toast.error(`Error: ${allActiveAppsError.message}`)
    if (allClosedAppsError instanceof Error)
      toast.error(`Error: ${allClosedAppsError.message}`)
    if (repoClosedAppsError instanceof Error)
      toast.error(`Error: ${repoClosedAppsError.message}`)
  }, [
    repoActiveAppsError,
    allActiveAppsError,
    repoClosedAppsError,
    allClosedAppsError,
  ])

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
      isRepoActiveAppsLoading &&
      repoActiveApps == null &&
      isAllActiveAppsLoading &&
      allActiveApps == null
    )
      return

    const debounceTimeout = setTimeout(() => {
      let dataToFilter: Application[] = []
      if (!isShowClosedApplicationChecked) {
        dataToFilter =
          (selectedAllocator && typeof selectedAllocator !== 'string'
            ? repoActiveApps
            : allActiveApps) ?? []
      } else {
        dataToFilter =
          (selectedAllocator && typeof selectedAllocator !== 'string'
            ? repoClosedApps
            : allClosedApps) ?? []
      }
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
    repoActiveApps,
    allActiveApps,
    allClosedApps,
    repoClosedApps,
    isRepoActiveAppsLoading,
    isAllActiveAppsLoading,
    selectedAllocator,
    isShowClosedApplicationChecked,
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
          await refetchRepoActiveApps()
          await refetchAllActiveApps()
          await refetchAllClosedApps()
          await refetchRepoClosedApps()
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

  if (
    isRepoActiveAppsLoading ||
    isRepoClosedAppsLoading ||
    isLoading ||
    isAllActiveAppsLoading ||
    isAllClosedLoading
  )
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-20">
        <Spinner />
      </div>
    )

  const groupedAllocators: Record<string, Application[]> = {}
  searchResults.forEach((app) => {
    const key = `${app.owner}_${app.repo}`
    if (!groupedAllocators[key]) groupedAllocators[key] = []
    groupedAllocators[key].push(app)
  })
  const sortedApplications: Application[] = []
  Object.values(groupedAllocators).forEach((apps) => {
    apps.sort(
      (a, b) => parseInt(b['Issue Number']) - parseInt(a['Issue Number']),
    )
    apps.forEach((app, idx) => {
      sortedApplications.push({
        ...app,
        fullSpan: idx === 0,
      })
    })
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
            data={sortedApplications}
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
