'use client'
import AppCard from '@/components/cards/HomePageCard'
import { generateColumns } from '@/components/table/columns'
import { DataTable } from '@/components/table/data-table'
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
import { getAllApplications, getApplicationsForRepo } from '@/lib/apiClient'
import { type Application } from '@/type'
import Fuse from 'fuse.js'
import { Search } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useQuery } from 'react-query'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

export default function Home(): JSX.Element {
  const { allocators, selectedAllocator, setSelectedAllocator } = useAllocator()
  const session = useSession()

  const { data, isLoading, error } = useQuery({
    queryKey: ['application', selectedAllocator, session.status],
    queryFn: async () => {
      if (
        selectedAllocator &&
        typeof selectedAllocator !== 'string' &&
        session.status === 'authenticated'
      ) {
        return await getApplicationsForRepo(
          selectedAllocator.repo,
          selectedAllocator.owner,
        )
      }

      if (
        (!selectedAllocator && session.status === 'unauthenticated') ||
        selectedAllocator === 'all' ||
        (session.status === 'authenticated' && selectedAllocator === undefined)
      ) {
        return await getAllApplications()
      }

      return []
    },
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
  }, [allocators, selectedAllocator])

  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Application[]>([])

  const searchParams = useSearchParams()
  const notification = searchParams.get('notification')
  const router = useRouter()
  const pathName = usePathname()

  useEffect(() => {
    if (error instanceof Error) toast.error(`Error: ${error.message}`)
  }, [error])

  useEffect(() => {
    const handleNotification = async (): Promise<void> => {
      if (notification != null) {
        const messageCID = searchParams.get('messageCID') ?? ''
        const amount = searchParams.get('amount') ?? '-'
        const client = searchParams.get('client') ?? '-'

        toast(
          <ToastContent
            amount={amount}
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
    if (isLoading || data == null) return

    const filteredData = data?.filter(
      (app) => filter === 'all' || app.Lifecycle.State === filter,
    )

    const fuseOptions =
      filteredData?.length > 0
        ? {
            keys: [
              ...Object.keys(filteredData[0].Client).map(
                (key) => `Client.${key}`,
              ),
              'id',
            ],
          }
        : { keys: [] }

    const fuse = new Fuse(filteredData, fuseOptions)
    const results = fuse.search(searchTerm)

    const searchResults =
      searchTerm !== '' ? results.map((result) => result.item) : filteredData
    setSearchResults(searchResults)
  }, [searchTerm, filter, data, isLoading])

  if (isLoading)
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-20">
        <Spinner />
      </div>
    )

  return (
    <main className="mt-10 px-10 grid select-none">
      <ToastContainer position="top-right" autoClose={10000} />

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
                <SelectItem value="Submitted">Governance Review</SelectItem>
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
            data={searchResults}
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
                    : ''
                }
                owner={
                  selectedAllocator && typeof selectedAllocator !== 'string'
                    ? selectedAllocator.owner
                    : ''
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
