'use client'
import { Database, Github } from 'lucide-react'
import { signIn, useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'
import UserNav from './UserNav'
import { Button } from './ui/button'

const Navbar: React.FC = () => {
  const session = useSession()

  return (
    <div className="h-16 shadow-md flex items-center px-12 justify-between">
      <Link href="/">
        <Image
          src="/filplus-logo.png"
          width="150"
          height="50"
          alt="filecoin plus logo"
        />
      </Link>

      <div className="flex space-x-4">
        <Button
          onClick={() =>
            window.open(
              'https://form-interface-d85407.zapier.app/form',
              '_blank',
            )
          }
        >
          <Database className="mr-2 h-4 w-4" /> Find a Storage Provider
        </Button>
        {session.status !== 'authenticated' ? (
          <Button onClick={() => void signIn('github')}>
            <Github className="mr-2 h-4 w-4" /> Login with Github
          </Button>
        ) : (
          <UserNav />
        )}
      </div>
    </div>
  )
}

export default Navbar
