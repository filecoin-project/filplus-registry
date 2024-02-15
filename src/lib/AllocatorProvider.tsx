'use client'
import { type Allocator } from '@/type'
import React, { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { getAllocators } from './apiClient'
import { useQuery } from 'react-query'
import { useSession } from 'next-auth/react'

// Define the shape of your context data for TypeScript
interface AllocatorContextType {
  allocators: Allocator[] // Specify a more specific type instead of any if possible
  setAllocators: React.Dispatch<React.SetStateAction<any>> // Adjust the type as needed
}

// Provide a default value matching the structure
const defaultContextValue: AllocatorContextType = {
  allocators: [], // Initial data value
  setAllocators: () => {}, // No-op function for initialization
}

interface AllocatorProviderProps {
  children: ReactNode // This types 'children' to accept any valid React node
  // Other props here
}

const AllocatorContext =
  createContext<AllocatorContextType>(defaultContextValue)

export const AllocatorProvider: React.FunctionComponent<
  AllocatorProviderProps
> = ({ children }): React.ReactElement => {
  const [allocators, setAllocators] = useState<any>(null) // Adjust the type as needed
  const session = useSession()

  const { data: allocatorsData } = useQuery({
    queryKey: ['allocator'],
    queryFn: getAllocators,
  })

  useEffect(() => {
    if (!allocatorsData || !session?.data?.user?.githubUsername) return
    const githubUsername = session.data.user.githubUsername.toLowerCase()

    const allocatorsDataParsed = allocatorsData.filter((e) =>
      e.verifiers_gh_handles
        .split(',')
        .map((handle) => handle.trim().toLowerCase())
        .includes(githubUsername),
    )

    setAllocators(allocatorsDataParsed)
  }, [allocatorsData, session?.data?.user?.githubUsername])

  return (
    <AllocatorContext.Provider value={{ allocators, setAllocators }}>
      {children}
    </AllocatorContext.Provider>
  )
}

export const useAllocator = (): AllocatorContextType =>
  useContext(AllocatorContext)
