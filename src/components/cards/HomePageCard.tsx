import { type Application } from '@/type'
import Link from 'next/link'
import React from 'react'
import { Button } from '../ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card'
import { shortenUrl } from '@/lib/utils'
import { requestTypeColor, stateColor } from '@/lib/constants'

interface Props {
  application: Application
  repo: string
  owner: string
}

const HomePageCard: React.FC<Props> = ({ application, repo, owner }) => {
  const requestType = application['Allocation Requests'].find(
    (alloc) => alloc.Active,
  )?.['Request Type']

  return (
    <Card>
      <CardHeader></CardHeader>
      <CardContent className="grid gap-4 text-sm">
        <div className="flex items-center justify-between border-b border-gray-300 pb-2">
          <p className="text-gray-500">ID</p>
          <p className="font-medium leading-none">
            {application.ID.length < 13
              ? application.ID
              : application.ID.substring(0, 6) +
                '...' +
                application.ID.substring(application.ID.length - 6)}
          </p>
        </div>
        <div className="flex items-center justify-between border-b border-gray-300 pb-2">
          <p className="text-gray-500">Data Owner Name</p>
          <p className="font-medium leading-none">{application.Client.Name}</p>
        </div>
        <div className="flex items-center justify-between border-b border-gray-300 pb-2">
          <p className="text-gray-500">Data Owner Region</p>
          <p className="font-medium leading-none">
            {application.Client.Region}
          </p>
        </div>
        <div className="flex items-center justify-between border-b border-gray-300 pb-2">
          <p className="text-gray-500">Data Owner Industry</p>
          <p className="font-medium leading-none">
            {application.Client.Industry}
          </p>
        </div>
        <div className="flex items-center justify-between border-b border-gray-300 pb-2">
          <p className="text-gray-500">Status</p>
          <p className="font-medium leading-none">
            <span
              className={`px-2 py-1 rounded text-xs ${
                stateColor[
                  application.Lifecycle.State as keyof typeof stateColor
                ]
              }`}
            >
              {application.Lifecycle.State}
            </span>
            {requestType !== undefined && (
              <span
                className={`ml-2 px-2 py-1 rounded text-xs ${
                  requestTypeColor[
                    requestType as keyof typeof requestTypeColor
                  ] ?? requestTypeColor.default
                }`}
              >
                {requestType}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-gray-500">Website</p>
          <p className="font-medium leading-none">
            <a
              href={application.Client.Website}
              target="_blank"
              rel="noopener noreferrer"
            >
              {shortenUrl(application.Client.Website, 18, 8)}
            </a>
          </p>
        </div>
      </CardContent>

      <CardFooter className="flex">
        <Button asChild className="w-full">
          <Link href={`/application/${owner}/${repo}/${application.ID}`}>
            Detail
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

export default HomePageCard
