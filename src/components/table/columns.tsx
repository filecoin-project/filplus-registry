'use client'

import { requestTypeColor, stateColor, stateMapping } from '@/lib/constants'
import { shortenUrl } from '@/lib/utils'
import { type Application } from '@/type'
import { type ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'
import { Button } from '../ui/button'

export const generateColumns = (repoConfig?: {
  owner: string
  repo: string
}): Array<ColumnDef<Application>> => {
  const repo = repoConfig?.repo
  const owner = repoConfig?.owner

  const columns: Array<ColumnDef<Application>> = [
    {
      accessorKey: 'Issue Number',
      enableHiding: false,
      header: 'Issue No',
      cell: ({ row }) => (
        <a
          href={`https://github.com/${owner ?? row.original.owner}/${repo ?? row.original.repo}/issues/${row.original['Issue Number']}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500"
        >
          #{row.original['Issue Number']}
        </a>
      ),
    },
    {
      id: 'Client Name',
      accessorKey: 'Client.Name',
      header: 'Data Owner Name',
    },
    {
      id: 'Issue Reporter Handle',
      accessorKey: 'Issue Reporter Handle',
      header: 'Issue Reporter',
      cell: ({ row }) => {
        const value = row.original['Issue Reporter Handle']
        return value ?? ''
      },
    },
    {
      id: 'Data Sample Set',
      accessorKey:
        'Project["Please share a sample of the data (a link to a file, an image, a table, etc., are good ways to do this.)"]',
      header: 'Data Sample Set',
      cell: ({ row }) => {
        const value =
          row.original.Project[
            'Please share a sample of the data (a link to a file, an image, a table, etc., are good ways to do this.)'
          ]
        return value ?? ''
      },
    },
    {
      id: 'Datacap requested amount',
      accessorKey: 'Datacap.Total Requested Amount',
      header: 'Requested amount',
    },
    {
      accessorKey: 'Lifecycle.State',
      header: 'Status',
      enableHiding: false,
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
      id: 'Website',
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
      enableHiding: false,
      cell: ({ row }) => (
        <Button asChild className="flex mx-auto">
          <Link
            href={`/application/${owner ?? row.original.owner}/${repo ?? row.original.repo}/${row.original.ID}`}
          >
            Detail
          </Link>
        </Button>
      ),
    },
  ]

  // if (!repo) {
  //   columns.splice(
  //     1,
  //     0,
  //     ...[
  //       {
  //         accessorKey: 'repo',
  //         header: 'Repository',
  //       },
  //       {
  //         accessorKey: 'owner',
  //         header: 'Owner',
  //       },
  //     ],
  //   )
  // }

  return columns
}
