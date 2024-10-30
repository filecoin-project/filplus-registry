import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import AccountSelectionDialog from '@/components/ui/ledger-account-select'
import { Modal } from '@/components/ui/modal'
import ProgressBar from '@/components/ui/progress-bar'
import { Spinner } from '@/components/ui/spinner'
import calculateAmountToRequest, {
  validateAmount,
} from '@/helpers/calculateAmountToRefill'
import useApplicationActions from '@/hooks/useApplicationActions'
import useWallet from '@/hooks/useWallet'
import { useAllocator } from '@/lib/AllocatorProvider'
import { stateColor, stateMapping } from '@/lib/constants'
import { getAllowanceForClient } from '@/lib/glifApi'
import {
  anyToBytes,
  bytesToiB,
  calculateDatacap,
  getLastDatacapAllocation,
} from '@/lib/utils'
import {
  LDNActorType,
  RefillUnit,
  type Allocation,
  type Application,
} from '@/type'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material'
import Box from '@mui/material/Box'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormLabel from '@mui/material/FormLabel'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import axios from 'axios'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'react-toastify'
import AllocatorBalance from '../AllocatorBalance'
import AllowedSps from './dialogs/allowedSps'

interface ComponentProps {
  application: Application
  repo: string
  owner: string
  allocation?: Allocation
  allowance: any
}

type DeviationType = 'contract' | 'directly'

/**
 * Represents the information for a specific application.
 * Provides buttons to interact with the application.
 *
 * @component
 * @prop {Application} initialApplication - The initial data for the application.
 * @prop {string} repo - The repo containing the application.
 * @prop {string} owner - The owner of the repo containing the application.
 * @prop {UseSession} session - User session data.
 */
const AppInfoCard: React.FC<ComponentProps> = ({
  application: initialApplication,
  repo,
  owner,
  allocation,
  allowance,
}) => {
  const session = useSession()
  const { allocators, setSelectedAllocator, selectedAllocator } = useAllocator()
  const {
    application,
    isApiCalling,
    setApiCalling,
    mutationDecline,
    mutationRequestInfo,
    mutationTrigger,
    mutationTriggerSSA,
    mutationApproveChanges,
    mutationProposal,
    mutationApproval,
    walletError,
    initializeWallet,
    setActiveAccountIndex,
    accounts,
    message,
    loadMoreAccounts,
    mutationRequestKyc,
    mutationRemovePendingAllocation,
    mutationChangeAllowedSPs,
    mutationChangeAllowedSPsApproval,
  } = useApplicationActions(initialApplication, repo, owner)

  const { getClientAllowance } = useWallet()
  const [buttonText, setButtonText] = useState('')
  const [modalMessage, setModalMessage] = useState<ReactNode | null>(null)
  const [error, setError] = useState<boolean>(false)
  const [walletConnected, setWalletConnected] = useState(false)
  const [isWalletConnecting, setIsWalletConnecting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [allocationProgressDesc, setAllocationProgressDesc] = useState('-')
  const [currentActorType, setCurrentActorType] = useState<LDNActorType | ''>(
    '',
  )

  const [isProgressBarVisible, setIsProgressBarVisible] = useState(false)
  const [isSelectAccountModalOpen, setIsSelectAccountModalOpen] =
    useState(false)

  const [refillInfoParams, setRefillInfoParams] = useState<{
    amount: string
    unit: RefillUnit
    isDialogOpen: boolean
  }>({
    amount: '0',
    unit: RefillUnit.GIB,
    isDialogOpen: false,
  })

  const [additionalInfoConfig, setAdditionalInfoConfig] = useState<{
    message: string
    isDialogOpen: boolean
  }>({
    message: '',
    isDialogOpen: false,
  })

  const [allocationAmountConfig, setAllocationAmountConfig] = useState<{
    amount: string
    allocationType: string
    deviationType: DeviationType
    isDialogOpen: boolean
  }>({
    amount: '',
    allocationType: 'fixed',
    deviationType: 'directly',
    isDialogOpen: false,
  })

  const router = useRouter()

  // const allocationRequests = application?.['Allocation Requests'] ?? []

  // const lastAllocationAmount =
  //   allocationRequests?.[allocationRequests.length - 1]?.[
  //     'Allocation Amount'
  //   ] ?? 0

  const isApplicationUpdatedLessThanOneMinuteAgo = useCallback((): boolean => {
    const currentTime = new Date(Date.now()).getTime()
    const updateDatePlusOneMinute =
      new Date(application.Lifecycle['Updated At']).getTime() + 60 * 1000
    return updateDatePlusOneMinute > currentTime
  }, [application.Lifecycle])

  useEffect(() => {
    setModalMessage(message)
  }, [message])

  /**
   * Fetches the datacap allowance for the application in order to calculate the progress bar.
   */
  useEffect(() => {
    void (async (): Promise<void> => {
      const { amount, amountType } = calculateAmountToRequest(application)

      setRefillInfoParams({
        amount: amount.toString(),
        unit: amountType,
        isDialogOpen: false,
      })

      const address = application.Lifecycle['On Chain Address']

      let clientAllowance

      const contractAddress = application['Client Contract Address'] ?? address

      const response = await getAllowanceForClient(contractAddress)

      if (application['Client Contract Address']) {
        clientAllowance = await getClientAllowance(
          address,
          application['Client Contract Address'],
        )
      }

      if (response.success) {
        const allowanceResult = clientAllowance
          ? Number(clientAllowance) > parseFloat(response.data)
            ? response.data
            : clientAllowance.toString()
          : response.data

        const allowance = parseFloat(
          allowanceResult.length ? allowanceResult : '0',
        )
        const lastAllocation = getLastDatacapAllocation(application)
        if (lastAllocation === undefined) return

        const lastAllocationUnit = lastAllocation['Allocation Amount'] ?? '0'

        const allocationAmount = anyToBytes(lastAllocationUnit)

        if (isApplicationUpdatedLessThanOneMinuteAgo()) {
          setIsProgressBarVisible(false)
          return
        }

        if (allocationAmount === 0) {
          setIsProgressBarVisible(true)
          setProgress(100)
          setAllocationProgressDesc(
            `${bytesToiB(0, true)} / ${lastAllocationUnit}`,
          )
          return
        }

        if (allocationAmount < allowance) {
          setIsProgressBarVisible(true)
          setProgress(0)
          setAllocationProgressDesc(
            `${bytesToiB(0, true)} / ${lastAllocationUnit}`,
          )
          return
        }

        const usedDatacap = allocationAmount - allowance
        const usedDatacapUnit = bytesToiB(usedDatacap, true)

        const progressPercentage = (usedDatacap / allocationAmount) * 100
        setIsProgressBarVisible(true)
        setProgress(progressPercentage)
        setAllocationProgressDesc(`${usedDatacapUnit} / ${lastAllocationUnit}`)
      } else {
        if (response.error === 'Address not found') {
          setIsProgressBarVisible(application.Lifecycle.State === 'Granted')
          if (application.Lifecycle.State === 'Granted') {
            setProgress(100)
            setAllocationProgressDesc('Recent allocation fully used')
          }
        } else {
          console.error(response.error)
        }
      }
    })()
  }, [application, isApplicationUpdatedLessThanOneMinuteAgo])

  useEffect(() => {
    if (
      !allocators ||
      session.data?.user?.githubUsername === null ||
      session.data?.user?.githubUsername === undefined ||
      session.data?.user?.githubUsername === ''
    ) {
      setCurrentActorType('')
      return
    }

    const ghUserName = session.data.user.githubUsername
    const currentAllocator = allocators.find((e) => e.repo === repo)
    setSelectedAllocator(currentAllocator)
    if (
      currentAllocator?.verifiers_gh_handles.includes(ghUserName.toLowerCase())
    ) {
      setCurrentActorType(LDNActorType.Verifier)
    }
  }, [
    session.data?.user?.githubUsername,
    allocators,
    repo,
    setSelectedAllocator,
  ])

  /**
   * Handles the mutation error event.
   *
   * @param {Error} error - The error object.
   */
  const handleMutationError = (error: Error): void => {
    let message = error.message
    if (error.message.includes('Locked device')) {
      message = 'Please unlock your ledger device.'
    }
    if (error.message.includes('already approved')) {
      message = 'You have already approved this request.'
    }
    setModalMessage(message)
    setError(true)
    if (
      error.message.includes('DisconnectedDeviceDuringOperation') ||
      error.message.includes('Locked device')
    ) {
      setWalletConnected(false)
    }
  }

  const handleSSAError = (error: unknown): void => {
    let message = 'An unknown error occurred'
    if (axios.isAxiosError(error) && error.response?.data) {
      message = error.response.data
    } else if (error instanceof Error) {
      message = error.message
    }
    setModalMessage(message)
    setError(true)
  }

  /**
   * Handles the connect ledger button click event.
   *
   * @returns {Promise<void>} - Returns a promise that resolves when the wallet is connected.
   */
  const handleConnectLedger = async (): Promise<void> => {
    try {
      const currentAllocator = allocators.find((e) => e.repo === repo)
      if (!currentAllocator) return
      setIsWalletConnecting(true)

      if (accounts.length) {
        setIsSelectAccountModalOpen(true)
        setIsWalletConnecting(false)
        return
      }

      const { multisig_address: multisigAddress } = currentAllocator
      const newAccounts = multisigAddress
        ? await initializeWallet(multisigAddress)
        : await initializeWallet()
      if (newAccounts.length) setIsSelectAccountModalOpen(true)
      setIsWalletConnecting(false)
      return
    } catch (error) {
      console.error('Error initializing ledger:', error)
    }
    setIsWalletConnecting(false)
    setWalletConnected(false)
  }

  /**
   * Handles Load more accounts event. This function is called when the user clicks the Load more button.
   */
  const handleLoadMore = async (): Promise<void> => {
    await loadMoreAccounts(5)
  }

  /**
   * Handles the application status change event.
   */
  useEffect(() => {
    if (currentActorType !== LDNActorType.Verifier) {
      setButtonText('')
      return
    }

    if (isApiCalling) {
      setButtonText('Processing...')
      return
    }

    switch (application.Lifecycle.State) {
      case 'KYCRequested':
      case 'Submitted':
      case 'AdditionalInfoRequired':
      case 'AdditionalInfoSubmitted':
        setButtonText('Complete verifier review')
        break

      case 'ChangesRequested':
        setButtonText('Approve changes')
        break

      case 'ReadyToSign':
        setButtonText('Propose')
        break

      case 'StartSignDatacap':
        setButtonText('Approve')
        break

      case 'Granted':
        setButtonText('')
        break

      default:
        setButtonText('')
    }
  }, [application.Lifecycle.State, isApiCalling, session, currentActorType])

  /**
   * Handles the wallet error event.
   */
  useEffect(() => {
    if (walletError != null) {
      setError(true)
      setModalMessage(walletError.message)
    }
  }, [walletError])

  /**
   * Handles the modal close event.
   */
  const handleCloseModal = (): void => {
    setError(false)
    setModalMessage(null)
  }

  /**
   * Handles the button click event.
   * Depending on the application status, it triggers a respective API action.
   */
  const handleButtonClick = async (): Promise<void> => {
    setApiCalling(true)
    const requestId = application['Allocation Requests'].find(
      (alloc) => alloc.Active,
    )?.ID

    const userName = session.data?.user?.githubUsername

    try {
      switch (application.Lifecycle.State) {
        case 'Submitted':
        case 'AdditionalInfoRequired':
        case 'AdditionalInfoSubmitted':
        case 'KYCRequested':
          if (userName != null) {
            setAllocationAmountConfig((prev) => {
              return {
                ...prev,
                amount: '',
                isDialogOpen: true,
              }
            })
          }
          break

        case 'ChangesRequested':
          if (userName != null) {
            await mutationApproveChanges.mutateAsync({
              userName,
            })
          }
          break

        case 'ReadyToSign':
          if (requestId != null && userName != null) {
            if (application['Allocation Requests'].length > 1) {
              setAllocationAmountConfig((prev) => {
                return {
                  ...prev,
                  isDialogOpen: true,
                }
              })
            } else {
              // check the balance here

              // if (
              //   lastAllocationAmount &&
              //   anyToBytes(lastAllocationAmount) > allowance
              // ) {
              //   toast.error('Amount is bigger than the allowance')
              //   return
              // }

              await mutationProposal.mutateAsync({
                requestId,
                userName,
              })
            }
          }
          break
        case 'StartSignDatacap':
          if (requestId != null && userName != null) {
            // check the balance here

            // if (
            //   lastAllocationAmount &&
            //   anyToBytes(lastAllocationAmount) > allowance
            // ) {
            //   toast.error('Amount is bigger than the allowance')
            //   return
            // }

            const res = await mutationApproval.mutateAsync({
              requestId,
              userName,
            })
            if (res?.Lifecycle.State === 'Granted') {
              const lastDatacapAllocation = getLastDatacapAllocation(res)
              if (lastDatacapAllocation === undefined) {
                throw new Error('No datacap allocation found')
              }
              const queryParams = [
                `client=${encodeURIComponent(res?.Client.Name)}`,
                `messageCID=${encodeURIComponent(
                  lastDatacapAllocation.Signers[1]['Message CID'],
                )}`,
                `amount=${encodeURIComponent(
                  lastDatacapAllocation['Allocation Amount'],
                )}`,
                `notification=true`,
              ].join('&')

              router.push(`/?${queryParams}`)
            }
          }
          break
        default:
          throw new Error(
            `Invalid application state ${application.Lifecycle.State}`,
          )
      }
    } catch (error) {
      handleMutationError(error as Error)
    }
    setApiCalling(false)
  }

  const declineApplication = async (): Promise<void> => {
    setApiCalling(true)
    const userName = session.data?.user?.githubUsername
    if (!userName) return
    try {
      await mutationDecline.mutateAsync({
        userName,
      })
    } catch (error) {
      handleMutationError(error as Error)
    }
    router.push(`/`)
  }

  const handleAdditionalInfoClose = async (
    shouldSubmit: boolean,
  ): Promise<void> => {
    if (!shouldSubmit) {
      setAdditionalInfoConfig({
        isDialogOpen: false,
        message: '',
      })
      return
    }

    if (!additionalInfoConfig.message) {
      toast.error('Please provide a message')
      return
    }
    setApiCalling(true)
    const userName = session.data?.user?.githubUsername
    if (!userName) return
    try {
      await mutationRequestInfo.mutateAsync({
        userName,
        additionalInfoMessage: additionalInfoConfig.message,
      })
    } catch (error) {
      handleMutationError(error as Error)
    }
    setApiCalling(false)
    setAdditionalInfoConfig({
      isDialogOpen: false,
      message: '',
    })
  }

  let totalAllocation = 0

  application['Allocation Requests']
    .filter((item) => !item.Active)
    .forEach((item) => {
      const allocationAmount = anyToBytes(item['Allocation Amount'])

      totalAllocation += allocationAmount
    })

  const remaining =
    anyToBytes(application.Datacap['Total Requested Amount']) - totalAllocation

  const handleAllocationAmountClose = async (
    shouldSubmit: boolean,
  ): Promise<void> => {
    if (!shouldSubmit) {
      setAllocationAmountConfig((prev) => ({
        ...prev,
        isDialogOpen: false,
        amount: '',
        deviationType: 'directly',
      }))
      return
    }

    // if (anyToBytes(allocationAmountConfig.amount) > allowance) {
    //   toast.error('Amount is bigger than the allowance')
    //   return
    // }

    // if (anyToBytes(allocationAmountConfig.amount) > remaining) {
    //   toast.error('Amount is bigger than remaning')
    //   return
    // }

    setApiCalling(true)
    const userName = session.data?.user?.githubUsername
    if (!userName) return
    const validatedAllocationAmount = validateAndReturnDatacap(
      allocationAmountConfig.amount,
      application.Datacap['Total Requested Amount'],
    )

    if (!validatedAllocationAmount) {
      setApiCalling(false)
      return
    }

    try {
      if (application.Lifecycle.State === 'ReadyToSign') {
        const requestId = application['Allocation Requests'].find(
          (alloc) => alloc.Active,
        )?.ID

        if (!requestId) return

        setAllocationAmountConfig((prev) => ({
          ...prev,
          isDialogOpen: false,
        }))

        await mutationProposal.mutateAsync({
          requestId,
          userName,
          allocationAmount: validatedAllocationAmount,
        })
      } else {
        const clientContractAddress =
          typeof selectedAllocator === 'object'
            ? selectedAllocator?.client_contract_address
            : undefined

        await mutationTrigger.mutateAsync({
          userName,
          allocationAmount: validatedAllocationAmount,
          clientContractAddress:
            allocationAmountConfig.deviationType === 'contract' &&
            clientContractAddress
              ? clientContractAddress
              : undefined,
        })
      }
    } catch (error) {
      setAllocationAmountConfig((prev) => ({
        ...prev,
        isDialogOpen: false,
      }))
      handleSSAError(error)
    }

    setApiCalling(false)
  }
  const handleSSASubmit = async (): Promise<void> => {
    setApiCalling(true)
    const userName = session.data?.user?.githubUsername
    if (!userName) return

    try {
      await mutationTriggerSSA.mutateAsync({
        userName,
        amount: refillInfoParams.amount,
        unit: refillInfoParams.unit,
      })
    } catch (err) {
      handleSSAError(err)
    } finally {
      setApiCalling(false)
    }
    setRefillInfoParams((prev) => ({
      ...prev,
      isDialogOpen: false,
    }))
  }

  const totalAmountIsValid = useMemo(
    () => validateAmount(application.Datacap['Total Requested Amount']),
    [application.Datacap],
  )
  const weeklyAllocationRequestIsValid = useMemo(
    () => validateAmount(application.Datacap['Weekly Allocation']),
    [application.Datacap],
  )

  const createInvalidFieldsModalContent = (
    totalAmountIsValid: boolean,
    weeklyAllocationRequestIsValid: boolean,
  ): string => {
    let modalMessage = ''
    if (!totalAmountIsValid) modalMessage = '"Total Requested Amount"'
    if (!weeklyAllocationRequestIsValid) {
      if (!totalAmountIsValid) modalMessage += ' and '
      modalMessage += '"Weekly Allocation"'
    }
    modalMessage +=
      ' field has invalid value. Usually this means a missing unit. Please navigate to the application below and update the field. (examples of correct formats: 100TiB, 600.46GiB, 1.5PiB)'
    return modalMessage
  }

  useEffect(() => {
    // if not the first allocation, prefill the amount with ssa bot suggested value
    if (
      application.Lifecycle.State === 'ReadyToSign' &&
      application['Allocation Requests'].length > 1
    ) {
      setAllocationAmountConfig((prev) => ({
        deviationType: 'directly',
        allocationType: 'manual',
        amount:
          application['Allocation Requests'].find((e) => e.Active)?.[
            'Allocation Amount'
          ] ?? '',
        isDialogOpen: false,
      }))
    }

    if (!totalAmountIsValid || !weeklyAllocationRequestIsValid) {
      const modalMessage = createInvalidFieldsModalContent(
        totalAmountIsValid,
        weeklyAllocationRequestIsValid,
      )

      const link = (
        <a
          target="_blank noopener noreferrer"
          href={`https://github.com/${owner}/${repo}/issues/${application['Issue Number']}`}
        >
          https://github.com/{owner}/{repo}/issues/
          {application['Issue Number']}
        </a>
      )
      setModalMessage(
        <>
          {modalMessage}
          <br />
          {link}
        </>,
      )
      setError(true)
    }
  }, [
    application,
    totalAmountIsValid,
    weeklyAllocationRequestIsValid,
    owner,
    repo,
  ])

  const stateLabel =
    stateMapping[application.Lifecycle.State as keyof typeof stateMapping] ??
    application.Lifecycle.State
  const stateClass =
    stateColor[application.Lifecycle.State as keyof typeof stateColor] ??
    application.Lifecycle.State

  const getRowStyles = (index: number): string => {
    return index % 2 === 0
      ? 'bg-white' // Fondo blanco para filas pares
      : 'bg-gray-100' // Fondo gris claro para filas impares
  }

  const validateAndReturnDatacap = (
    datacap: string,
    totalDatacap: string,
  ): string | undefined => {
    console.log(datacap, 'datacap')

    // check if data ends with "s" or "S"
    let datacapWithoutS =
      datacap.endsWith('s') || datacap.endsWith('S')
        ? datacap.slice(0, -1)
        : datacap

    // check if its like "TB OR PB and add "i" between them"
    const letters = datacapWithoutS.match(/[a-zA-Z]/g)

    if (letters && letters.length === 2) {
      const lastChar = datacapWithoutS.charAt(datacapWithoutS.length - 1)
      datacapWithoutS = datacapWithoutS.slice(0, -1) + 'i' + lastChar
    }

    const bytes = anyToBytes(datacapWithoutS)
    const totalBytes = anyToBytes(totalDatacap)

    if (bytes > totalBytes) {
      toast.error('Datacap exceeds the total requested amount')
      return
    }

    const isBinary = datacapWithoutS.toLowerCase().includes('ib')
    const againToText = bytesToiB(bytes, isBinary)

    return againToText
  }

  const handleRequestKyc = async (): Promise<void> => {
    setApiCalling(true)
    const userName = session.data?.user?.githubUsername
    if (!userName) return
    try {
      await mutationRequestKyc.mutateAsync({
        userName,
      })
    } catch (error) {
      handleMutationError(error as Error)
    }
    setApiCalling(false)
  }

  const handleRemovePendingAllocation = async (): Promise<void> => {
    setApiCalling(true)
    const userName = session.data?.user?.githubUsername
    if (!userName) return
    try {
      await mutationRemovePendingAllocation.mutateAsync({
        userName,
      })
    } catch (error) {
      handleMutationError(error as Error)
    }
    setApiCalling(false)
  }

  const handleAllowedSPsSubmit = async (
    client: string,
    clientContractAddress: string,
    addedSPs: string[],
    removedSPs: string[],
    newAvailableResult: string[],
    maxDeviation?: string,
  ): Promise<void> => {
    try {
      setApiCalling(true)
      const requestId = application['Allocation Requests'].find(
        (alloc) => alloc.Active,
      )?.ID

      const userName = session.data?.user?.githubUsername

      if (
        application.Lifecycle.State === 'ReadyToSign' &&
        requestId &&
        userName
      ) {
        await mutationChangeAllowedSPs.mutateAsync({
          userName,
          clientAddress: client,
          contractAddress: clientContractAddress,
          allowedSps: addedSPs,
          disallowedSPs: removedSPs,
          newAvailableResult,
          maxDeviation,
        })
      }
    } catch (error) {
      console.log(error)
      handleMutationError(error as Error)
    } finally {
      setApiCalling(false)
    }
  }

  const handleApproveAllowedSPs = async (): Promise<void> => {
    try {
      setApiCalling(true)

      const activeRequest = application[
        'Storage Providers Change Requests'
      ].find((requests) => requests.Active)

      const userName = session.data?.user?.githubUsername

      if (activeRequest?.ID != null && userName != null) {
        const res = await mutationChangeAllowedSPsApproval.mutateAsync({
          activeRequest,
          userName,
        })

        if (res) {
          const lastDatacapAllocation = getLastDatacapAllocation(res)
          if (lastDatacapAllocation === undefined) {
            throw new Error('No datacap allocation found')
          }
          const queryParams = [
            `client=${encodeURIComponent(res?.Client.Name)}`,
            `messageCID=${encodeURIComponent(
              lastDatacapAllocation.Signers[1]['Message CID'],
            )}`,
            `amount=${encodeURIComponent(
              lastDatacapAllocation['Allocation Amount'],
            )}`,
            `notification=true`,
          ].join('&')

          router.push(`/?${queryParams}`)
        }
      }
    } catch (error) {
      handleMutationError(error as Error)
    } finally {
      setApiCalling(false)
    }
  }

  return (
    <>
      <AccountSelectionDialog
        open={isSelectAccountModalOpen}
        accounts={accounts}
        onLoadMore={async () => {
          await handleLoadMore()
        }}
        onClose={() => {
          setIsSelectAccountModalOpen(false)
        }}
        onSelect={(value) => {
          setActiveAccountIndex(value)
          setWalletConnected(true)
        }}
      />
      <div className="flex items-center flex-col mb-6">
        <h2 className="text-3xl font-bold">Application Detail</h2>
        <a
          href={`https://github.com/${owner}/${repo}/issues/${application['Issue Number']}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="text-muted-foreground">
            #{application['Issue Number']}
          </span>
        </a>
      </div>
      {modalMessage != null && (
        <Modal
          message={modalMessage}
          onClose={handleCloseModal}
          error={error}
        />
      )}
      {(isApiCalling || isWalletConnecting) && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <Spinner />
        </div>
      )}
      <Card className="bg-gray-50 p-4 rounded-lg shadow-lg">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <CardHeader className="border-b pb-2 mb-4">
              <h2 className="text-xl font-bold">Client Info</h2>
            </CardHeader>

            <CardContent className="grid text-sm mb-4">
              {[
                ['Name', application.Client.Name],
                ['Region', application.Client.Region],
                ['Industry', application.Client.Industry],
                ['Website', application.Client.Website],
                ['Social', application.Client['Social Media']],
                ['Social Media Type', application.Client['Social Media Type']],
                ['Address', application.Lifecycle['On Chain Address']],
              ].map(([label, value], idx) => {
                const rowStyles = getRowStyles(idx)
                return (
                  <div
                    key={label}
                    className={`flex items-center p-2 justify-between ${rowStyles}`}
                  >
                    <p className="text-gray-600">{label}</p>
                    {label === 'Address' ? (
                      <a
                        href={`https://filfox.info/en/address/${value}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-gray-800"
                      >
                        {value}
                      </a>
                    ) : (
                      <p className="font-medium text-gray-800">{value}</p>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </div>
          <div className="flex-1">
            <CardHeader className="border-b pb-2 mb-4">
              <h2 className="text-xl font-bold">Datacap Info</h2>
            </CardHeader>

            <CardContent className="grid text-sm">
              {[
                ['Status', stateLabel],
                [
                  'Total Requested Amount',
                  application.Datacap['Total Requested Amount'],
                ],
                [
                  'Single Size Dataset',
                  application.Datacap['Single Size Dataset'],
                ],
                ['Replicas', application.Datacap.Replicas.toString()],
                ['Weekly Allocation', application.Datacap['Weekly Allocation']],
              ].map(([label, value], idx) => {
                const rowStyles = getRowStyles(idx)
                return (
                  <div
                    key={idx}
                    className={`flex items-center p-2 justify-between ${rowStyles}`}
                  >
                    <p className="text-gray-600">{label}</p>
                    {label === 'Status' ? (
                      <span
                        className={`ml-2 px-2 py-1 rounded text-xs ${stateClass}`}
                      >
                        {value}
                      </span>
                    ) : (
                      <p className="font-medium text-gray-800">{value}</p>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </div>
        </div>

        <CardContent>
          {isProgressBarVisible && (
            <ProgressBar
              progress={progress}
              label="Datacap used from most recent allocation"
              usedDesc={allocationProgressDesc}
            />
          )}
        </CardContent>
        <div>
          <CardFooter className="flex flex-row items-center border-t pt-4 pb-2 mt-4 justify-between gap-3">
            <div className="flex gap-2 pb-4">
              <AllocatorBalance owner={owner} repo={repo} />
            </div>
            <div className="flex justify-end gap-2 pb-4">
              {LDNActorType.Verifier === currentActorType &&
                walletConnected &&
                session?.data?.user?.name !== undefined &&
                application?.Lifecycle?.['On Chain Address'] &&
                application?.['Client Contract Address'] &&
                ['ReadyToSign', 'Granted'].includes(
                  application?.Lifecycle?.State,
                ) && (
                  <div className="flex gap-2">
                    <AllowedSps
                      onSubmit={handleAllowedSPsSubmit}
                      client={application.Lifecycle['On Chain Address']}
                      clientContractAddress={
                        application['Client Contract Address']
                      }
                      initDeviation="10"
                      isApiCalling={isApiCalling}
                      setApiCalling={setApiCalling}
                    />
                  </div>
                )}

              {LDNActorType.Verifier === currentActorType &&
                walletConnected &&
                session?.data?.user?.name !== undefined &&
                application?.Lifecycle?.['On Chain Address'] &&
                application?.['Client Contract Address'] &&
                ['ChangingSP'].includes(application?.Lifecycle?.State) && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        void handleApproveAllowedSPs()
                      }}
                      disabled={isApiCalling}
                      style={{
                        width: '250px',
                      }}
                      className="bg-green-400 text-black rounded-lg px-4 py-2 hover:bg-green-500"
                    >
                      Approve SP Propose
                    </Button>
                  </div>
                )}

              {LDNActorType.Verifier === currentActorType ? (
                session?.data?.user?.name !== undefined &&
                application?.Lifecycle?.State !== 'Granted' ? (
                  <>
                    {application?.Lifecycle?.State === 'Submitted' && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            void handleRequestKyc()
                          }}
                          disabled={isApiCalling}
                          style={{
                            width: '200px',
                          }}
                          className="bg-green-400 text-black rounded-lg px-4 py-2 hover:bg-green-500"
                        >
                          Request KYC
                        </Button>
                      </div>
                    )}
                    {application?.Lifecycle?.State === 'ReadyToSign' && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            void handleRemovePendingAllocation()
                          }}
                          disabled={isApiCalling}
                          style={{
                            width: '250px',
                          }}
                          className="bg-red-400 text-black rounded-lg px-4 py-2 hover:bg-red-500"
                        >
                          Revert Pending Allocation
                        </Button>
                      </div>
                    )}
                    {buttonText &&
                      (walletConnected ||
                        [
                          'KYCRequested',
                          'Submitted',
                          'AdditionalInfoRequired',
                          'AdditionalInfoSubmitted',
                          'ChangesRequested',
                        ].includes(application?.Lifecycle?.State)) && (
                        <>
                          {[
                            'KYCRequested',
                            'Submitted',
                            'AdditionalInfoRequired',
                            'AdditionalInfoSubmitted',
                          ].includes(application?.Lifecycle?.State) && (
                            <div className="flex gap-2">
                              <Button
                                onClick={() => {
                                  setAdditionalInfoConfig({
                                    isDialogOpen: true,
                                    message: '',
                                  })
                                }}
                                disabled={isApiCalling}
                                style={{
                                  width: '200px',
                                }}
                                className="bg-yellow-400 text-black rounded-lg px-4 py-2 hover:bg-yellow-500"
                              >
                                Request Additional Info
                              </Button>
                              <Button
                                onClick={() => {
                                  void declineApplication()
                                }}
                                disabled={isApiCalling}
                                style={{
                                  width: '200px',
                                }}
                                className="bg-red-400 text-white rounded-lg px-4 py-2 hover:bg-red-600"
                              >
                                Decline Application
                              </Button>
                            </div>
                          )}
                          <Button
                            onClick={() => void handleButtonClick()}
                            disabled={isApiCalling}
                            style={{
                              width: '200px',
                            }}
                            className="bg-blue-400 text-white rounded-lg px-4 py-2 hover:bg-blue-500"
                          >
                            {buttonText}
                          </Button>
                        </>
                      )}

                    {!walletConnected &&
                      currentActorType === LDNActorType.Verifier &&
                      ![
                        'KYCRequested',
                        'Submitted',
                        'ChangesRequested',
                        'AdditionalInfoRequired',
                        'AdditionalInfoSubmitted',
                      ].includes(application?.Lifecycle?.State) && (
                        <Button
                          onClick={() => void handleConnectLedger()}
                          disabled={
                            isWalletConnecting ||
                            isApiCalling ||
                            ['Submitted'].includes(application.Lifecycle.State)
                          }
                          className="bg-blue-500 text-white rounded-lg px-4 py-2 hover:bg-blue-600"
                        >
                          Connect Ledger
                        </Button>
                      )}
                  </>
                ) : (
                  progress > 75 &&
                  remaining > 0 && (
                    <Button
                      disabled={isApiCalling}
                      onClick={() => {
                        setRefillInfoParams((prev) => ({
                          amount: prev.amount || '1',
                          unit: prev.unit || RefillUnit.GIB,
                          isDialogOpen: true,
                        }))
                      }}
                    >
                      Trigger Refill
                    </Button>
                  )
                )
              ) : (
                <CardFooter className="px-6 flex justify-end items-center w-full font-semibold text-xl italic">
                  You must be a verifier in order to perform actions on the
                  application.
                </CardFooter>
              )}
            </div>
          </CardFooter>
        </div>
      </Card>
      <Dialog
        open={refillInfoParams.isDialogOpen}
        onClose={() => {
          setRefillInfoParams((prev) => ({
            ...prev,
            isDialogOpen: false,
          }))
        }}
        fullWidth
      >
        <DialogTitle>Datacap Refill Request</DialogTitle>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void handleSSASubmit()
          }}
        >
          <DialogContent
            style={{
              paddingTop: '8px',
            }}
          >
            {(isApiCalling || isWalletConnecting) && (
              <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
                <Spinner />
              </div>
            )}
            <div className="flex gap-3 items-center">
              <div>
                <Box sx={{ width: 230 }}>
                  <FormControl fullWidth>
                    <TextField
                      label="Amount"
                      id="outlined-number"
                      type="number"
                      InputProps={{
                        inputProps: { min: 1 },
                      }}
                      value={refillInfoParams.amount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setRefillInfoParams((prev) => ({
                          ...prev,
                          amount: e.target.value,
                        }))
                      }}
                      variant="outlined"
                      required
                    />
                  </FormControl>
                </Box>
              </div>
              <div>
                <Box sx={{ width: 230 }}>
                  <FormControl fullWidth>
                    <InputLabel>Unit</InputLabel>
                    <Select
                      value={refillInfoParams.unit}
                      label="Unit"
                      onChange={(e: SelectChangeEvent) => {
                        setRefillInfoParams((prev) => ({
                          ...prev,
                          unit: e.target.value as RefillUnit,
                        }))
                      }}
                    >
                      {Object.values(RefillUnit).map((e) => (
                        <MenuItem key={e} value={e}>
                          {e}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </div>
            </div>
          </DialogContent>
          <DialogActions
            style={{
              padding: '0 24px 20px 24px',
            }}
          >
            <Button
              type="button"
              disabled={isApiCalling}
              onClick={() => {
                setRefillInfoParams((prev) => ({
                  ...prev,
                  isDialogOpen: false,
                }))
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isApiCalling}>
              Submit
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      <Dialog
        open={additionalInfoConfig.isDialogOpen}
        onClose={() => {
          void handleAdditionalInfoClose(false)
        }}
        fullWidth
      >
        <DialogTitle>This message will be posted in the issue</DialogTitle>
        <DialogContent
          style={{
            paddingTop: '8px',
          }}
        >
          {(isApiCalling || isWalletConnecting) && (
            <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
              <Spinner />
            </div>
          )}
          <TextField
            fullWidth
            multiline
            minRows={6}
            id="outlined-controlled"
            label="Request additional information using this message..."
            value={additionalInfoConfig.message}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setAdditionalInfoConfig((prev) => {
                return {
                  ...prev,
                  message: event.target.value,
                }
              })
            }}
          />
        </DialogContent>
        <DialogActions
          style={{
            padding: '0 24px 20px 24px',
          }}
        >
          <Button
            disabled={isApiCalling}
            onClick={() => {
              void handleAdditionalInfoClose(false)
            }}
          >
            Cancel
          </Button>
          <Button
            disabled={isApiCalling}
            onClick={() => {
              void handleAdditionalInfoClose(true)
            }}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={allocationAmountConfig.isDialogOpen}
        onClose={() => {
          void handleAllocationAmountClose(false)
        }}
        fullWidth
      >
        <DialogTitle
        // className='flex justify-center'
        >
          Fill DataCap Amount for current allocation
        </DialogTitle>
        <DialogContent
          style={{
            paddingTop: '8px',
          }}
        >
          {(isApiCalling || isWalletConnecting) && (
            <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
              <Spinner />
            </div>
          )}
          <div className="flex gap-3 items-center flex-col">
            {typeof selectedAllocator === 'object' &&
              selectedAllocator?.client_contract_address &&
              selectedAllocator?.client_contract_address !== null && (
                <div className="flex justify-items-center justify-between content-center items-center	w-full">
                  <FormControl>
                    <FormLabel id="demo-controlled-radio-buttons-group">
                      Deviation type
                    </FormLabel>
                    <RadioGroup
                      aria-labelledby="demo-controlled-radio-buttons-group"
                      value={allocationAmountConfig.deviationType}
                      onChange={(e) => {
                        setAllocationAmountConfig((prev) => ({
                          ...prev,
                          deviationType: (e.target as HTMLInputElement)
                            .value as DeviationType,
                        }))
                      }}
                    >
                      <FormControlLabel
                        value="directly"
                        control={<Radio />}
                        label="Directly"
                      />
                      <FormControlLabel
                        value={'contract'}
                        control={<Radio />}
                        label={'Contract'}
                      />
                    </RadioGroup>
                  </FormControl>
                </div>
              )}
            <div className="flex justify-items-center justify-between content-center items-center	w-full">
              <FormControl>
                <FormLabel id="demo-controlled-radio-buttons-group">
                  Allocation Amount Type
                </FormLabel>
                <RadioGroup
                  aria-labelledby="demo-controlled-radio-buttons-group"
                  value={allocationAmountConfig.allocationType}
                  onChange={(e) => {
                    if (e.target.value !== 'manual') {
                      setAllocationAmountConfig({
                        ...allocationAmountConfig,
                        amount: '',
                      })
                    }
                    setAllocationAmountConfig((prev) => ({
                      ...prev,
                      allocationType: (e.target as HTMLInputElement).value,
                    }))
                  }}
                >
                  <FormControlLabel
                    value={
                      allocation?.allocation_amount_type
                        ? allocation.allocation_amount_type
                        : 'fixed'
                    }
                    control={<Radio />}
                    label={
                      allocation?.allocation_amount_type
                        ? allocation.allocation_amount_type
                            .charAt(0)
                            .toUpperCase() +
                          allocation.allocation_amount_type.slice(1)
                        : 'Fixed'
                    }
                  />
                  <FormControlLabel
                    value="manual"
                    control={<Radio />}
                    label="Manual"
                  />
                </RadioGroup>
              </FormControl>
              <div>
                {!allocationAmountConfig.allocationType ||
                allocationAmountConfig.allocationType === 'percentage' ||
                allocationAmountConfig.allocationType === 'fixed' ? (
                  <Box sx={{ width: 230 }}>
                    <FormControl fullWidth>
                      <InputLabel>Amount</InputLabel>
                      <Select
                        disabled={!allocationAmountConfig.allocationType}
                        value={allocationAmountConfig.amount}
                        label="Allocation Amount"
                        onChange={(e: SelectChangeEvent) => {
                          setAllocationAmountConfig((prev) => ({
                            ...prev,
                            amount: e.target.value,
                          }))
                        }}
                      >
                        {(allocation?.allocation_amount_type
                          ? allocation.allocation_amount_quantity_options
                          : ['1TiB', '5TiB', '50TiB', '100TiB', '1PiB']
                        ).map((e) => {
                          return (
                            <MenuItem
                              key={e}
                              value={
                                allocationAmountConfig.allocationType ===
                                'percentage'
                                  ? calculateDatacap(
                                      e,
                                      application.Datacap[
                                        'Total Requested Amount'
                                      ],
                                    )
                                  : e
                              }
                            >
                              {e}
                              {allocationAmountConfig.allocationType ===
                              'percentage'
                                ? `% - ${calculateDatacap(
                                    e,
                                    application.Datacap[
                                      'Total Requested Amount'
                                    ],
                                  )}`
                                : ''}
                            </MenuItem>
                          )
                        })}
                      </Select>
                    </FormControl>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      width: 230,
                    }}
                  >
                    <TextField
                      id="outlined-controlled"
                      label="Amount"
                      disabled={!allocationAmountConfig.allocationType}
                      value={allocationAmountConfig.amount}
                      onChange={(
                        event: React.ChangeEvent<HTMLInputElement>,
                      ) => {
                        setAllocationAmountConfig((prev) => ({
                          ...prev,
                          amount: event.target.value,
                        }))
                      }}
                    />
                  </Box>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
        <DialogActions
          style={{
            padding: '0 24px 20px 24px',
          }}
        >
          <Button
            disabled={isApiCalling}
            onClick={() => void handleAllocationAmountClose(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={isApiCalling || !allocationAmountConfig.amount}
            onClick={() => void handleAllocationAmountClose(true)}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default AppInfoCard
