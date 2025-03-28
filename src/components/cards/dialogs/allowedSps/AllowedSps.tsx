import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import useWallet from '@/hooks/useWallet'
import { type Application } from '@/type'
import { Add, Delete } from '@mui/icons-material'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  TextField,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { useQuery } from 'react-query'

interface ComponentProps {
  application: Application
  onSubmit: (
    application: Application,
    client: string,
    clientContractAddress: string,
    added: string[],
    removed: string[],
    newAvailableResult: string[],
    maxDeviation?: number,
  ) => Promise<void>
  initDeviationInPercentage: string
  client: string
  clientContractAddress: string
  isApiCalling: boolean
  setApiCalling: (isApiCalling: boolean) => void
}

export const AllowedSPs: React.FC<ComponentProps> = ({
  application,
  client,
  clientContractAddress,
  initDeviationInPercentage,
  onSubmit,
  isApiCalling,
  setApiCalling,
}) => {
  const [isDirty, setIsDirty] = useState<boolean>(false)
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false)
  const [maxDeviationInPercentage, setMaxDeviationInPercentage] =
    useState<string>(initDeviationInPercentage ?? '')
  const [data, setData] = useState<string[]>([''])
  const [initData, setInitData] = useState<string[]>([''])
  const [errors, setErrors] = useState([''])
  const [debounceTimer, setDebounceTimer] = useState<number>(0)

  const { getClientSPs, getClientConfig } = useWallet()

  const { data: availableAllowedSPs } = useQuery({
    queryKey: ['allowedSps', client],
    queryFn: async () => await getClientSPs(client, clientContractAddress),
    enabled: !!(client && clientContractAddress),
  })

  const { data: clientConfig } = useQuery({
    queryKey: ['clientConfig', client],
    queryFn: async () => await getClientConfig(client, clientContractAddress),
    enabled: !!(client && clientContractAddress),
  })

  const checkIsDirty = (currentData: string[]): void => {
    setIsDirty(false)

    const set1 = new Set(availableAllowedSPs ?? [''])
    const set2 = new Set(currentData)

    if (set1.size !== set2.size) {
      setIsDirty(true)
      return
    }

    set1.forEach((item) => {
      if (!set2.has(item)) {
        setIsDirty(true)
      }
    })
  }

  const isValidInput = (input: string): boolean => {
    const regex = /^(f0)?\d+$/
    return regex.test(input)
  }

  const handleInputChange = (index: number, value: string): void => {
    const newData = [...data]
    const updatedErrors = [...errors]
    newData[index] = value
    value = value.trim()
    clearTimeout(debounceTimer)
    const timer = window.setTimeout(() => {
      value = value.trim()
      if (!value) {
        updatedErrors[index] = 'Value cannot be empty'
        setErrors([...updatedErrors])
        return
      } else if (!isValidInput(value)) {
        updatedErrors[index] = 'Invalid storage provider id'
        setErrors([...updatedErrors])
        return
      }
      updatedErrors[index] = ''
      setErrors(updatedErrors)
    }, 200)

    setData(newData)
    checkIsDirty(newData)
    setDebounceTimer(timer)
  }

  const hasErrors = errors.some((error) => error)

  const handleAddItem = (): void => {
    const newData = [...data, '']

    setData(newData)
    checkIsDirty(newData)
  }

  const handleRemoveItem = (index: number): void => {
    const updatedErrors = [...errors]
    const newData = data.filter((_, i) => i !== index)
    updatedErrors.splice(index, 1)
    setErrors(updatedErrors)
    setData(newData)
    checkIsDirty(newData)
  }

  const handleSubmit = async (): Promise<void> => {
    try {
      setApiCalling(true)
      const cleanedData = data.map((item) => item.replace('f0', ''))
      const added = cleanedData.filter(
        (item) => !availableAllowedSPs?.includes(item) && item.length,
      ) ?? ['']

      const removed: string[] = availableAllowedSPs?.filter(
        (item) => !cleanedData.includes(item),
      ) ?? ['']

      const afterAdd = [...(availableAllowedSPs ?? ['']), ...added]
      const newAvailableResult = afterAdd.filter(
        (item) => !removed.includes(item),
      )
      let maxDeviationResult: number | undefined
      const maxDeviation = Number(maxDeviationInPercentage) * 100 // Contract calculations use a denominator of 10000 (where 10% is represented as 1000).
      if (clientConfig && clientConfig !== maxDeviation) {
        maxDeviationResult = maxDeviation
      }

      if (!clientConfig) {
        maxDeviationResult = maxDeviation
      }

      setIsDialogOpen(false)

      await onSubmit(
        application,
        client,
        clientContractAddress,
        added,
        removed,
        newAvailableResult,
        maxDeviationResult,
      )
    } catch (error) {
      console.log(error)
    } finally {
      setData(availableAllowedSPs ?? [''])
      setInitData(availableAllowedSPs ?? [''])
      setApiCalling(false)
    }
  }

  useEffect(() => {
    if (availableAllowedSPs?.length) {
      setData(availableAllowedSPs)
      setInitData(availableAllowedSPs)
    }
  }, [availableAllowedSPs])

  return (
    <>
      <Button
        onClick={() => {
          setIsDialogOpen(true)
        }}
        disabled={false}
        style={{
          width: '250px',
        }}
        className="bg-amber-400 text-black rounded-lg px-4 py-2 hover:bg-amber-500"
      >
        Change allowed SPs
      </Button>

      <Dialog
        open={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false)
          setData(initData)
        }}
        fullWidth
      >
        <DialogTitle>Change allowed SPs</DialogTitle>
        <DialogContent
          style={{
            paddingTop: '8px',
          }}
        >
          {isApiCalling ? (
            <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
              <Spinner />
            </div>
          ) : null}
          <FormControl fullWidth>
            <InputLabel>Max Deviation</InputLabel>
            <OutlinedInput
              id="outlined-controlled"
              endAdornment={<InputAdornment position="end">%</InputAdornment>}
              disabled={true} // make it dynamically in the future
              label="Max Deviation"
              value={maxDeviationInPercentage ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setMaxDeviationInPercentage(event.target.value)
              }}
            />
          </FormControl>
          <div className="flex flex-col space-y-4 my-8">
            <div>SP count: {data.length}</div>
            {data.map((item, index) => (
              <div key={`${index}`} className="flex items-center space-x-4">
                <TextField
                  label={`SP ${index + 1}`}
                  variant="outlined"
                  value={item}
                  onChange={(e) => {
                    handleInputChange(index, e.target.value)
                  }}
                  className="flex-1"
                  error={!!errors[index]}
                  helperText={errors[index]}
                />
                <IconButton
                  onClick={() => {
                    handleRemoveItem(index)
                  }}
                  color="secondary"
                >
                  <Delete className="text-red-500" />
                </IconButton>
              </div>
            ))}
            <div className="flex justify-end">
              <IconButton onClick={handleAddItem} color="primary">
                <Add className="text-green-500" />
              </IconButton>
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
            onClick={() => {
              setIsDialogOpen(false)
              setData(initData)
            }}
          >
            Cancel
          </Button>

          <Button
            disabled={isApiCalling || !isDirty || hasErrors}
            onClick={() => {
              void handleSubmit()
            }}
          >
            Submit allowed SPs
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
