'use client'
import AppCard from '@/components/cards/HomePageCard'
import { columns } from '@/components/table/columns'
import { DataTable } from '@/components/table/data-table'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getAllApplications } from '@/lib/apiClient'
import { Search } from 'lucide-react'
import { useQuery } from 'react-query'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Fuse from 'fuse.js'
import { type Application } from '@/type'
import { Spinner } from '@/components/ui/spinner'
import 'react-toastify/dist/ReactToastify.css'
import { toast, ToastContainer } from 'react-toastify'
import { ToastContent } from '@/components/ui/toast-message-cid'

export default function Home(): JSX.Element {
  const { data, isLoading, error } = useQuery({
    queryKey: ['application'],
    queryFn: getAllApplications,
  })
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
          </div>

          <TabsList>
            <TabsTrigger value="table">Table View</TabsTrigger>
            <TabsTrigger value="grid">Grid View</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="table">
          <DataTable columns={columns} data={searchResults} />
        </TabsContent>
        <TabsContent value="grid">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 ">
            {searchResults?.map((app: Application) => (
              <AppCard application={app} key={app.ID} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </main>
  )
}
