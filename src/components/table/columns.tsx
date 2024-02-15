'use client'

import { requestTypeColor, stateColor, stateMapping } from '@/lib/constants'
import { shortenUrl } from '@/lib/utils'
import { type Application } from '@/type'
import { type ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'
import { Button } from '../ui/button'

export const generateColumns = (
  owner: string,
  repo: string,
): Array<ColumnDef<Application>> => {
  const columns: Array<ColumnDef<Application>> = [
    {
      accessorKey: 'Issue Number',
      header: 'Issue Number',
      cell: ({ row }) => (
        <a
          href={`https://github.com/${owner}/${repo}/issues/${row.original['Issue Number']}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500"
        >
          {row.original['Issue Number']}
        </a>
      ),
    },
    {
      accessorKey: 'Client.Name',
      header: 'Data Owner Name',
    },
    {
      accessorKey: 'Client.Region',
      header: 'Data Owner Region',
    },
    {
      accessorKey: 'Client.Industry',
      header: 'Data Owner Industry',
    },
    {
      accessorKey: 'Datacap.Total Requested Amount',
      header: 'Requested amount',
    },
    {
      accessorKey: 'Lifecycle.State',
      header: 'Status',
      cell: ({ row }) => {
        const allocation = row.original['Allocation Requests'].find(
          (alloc) => alloc.Active,
        )

        const requestType = allocation?.['Request Type']

        const stateLabel =
          stateMapping[
            row.original.Lifecycle.State as keyof typeof stateMapping
          ] ?? row.original.Lifecycle.State

        return (
          <div className="flex items-center">
            <span
              className={`px-2 py-1 rounded text-xs ${
                stateColor[
                  row.original.Lifecycle.State as keyof typeof stateColor
                ]
              }`}
            >
              {stateLabel}
            </span>
            {requestType !== undefined && (
              <span
                className={`ml-2 px-2 py-1 rounded text-xs ${
                  requestTypeColor[
                    requestType as keyof typeof requestTypeColor
                  ] ?? requestTypeColor.default
                }`}
              >
                {requestType === 'First' ? 'Initial' : requestType}
              </span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'info.core_information.website',
      header: 'Website',
      cell: ({ row }) => (
        <a
          href={row.original.Client.Website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500"
        >
          {shortenUrl(row.original.Client.Website, 18, 8)}
        </a>
      ),
    },
    {
      id: 'detail',
      cell: ({ row }) => (
        <Button asChild className="flex sm:w-4/5 lg:w-2/3 xl:w-3/5 mx-auto">
          <Link href={`/application/${owner}/${repo}/${row.original.ID}`}>
            Detail
          </Link>
        </Button>
      ),
    },
  ]

  return columns
}
