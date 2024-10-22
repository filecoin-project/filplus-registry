import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import useWallet from '@/hooks/useWallet'
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
  onSubmit: (
    client: string,
    clientContractAddress: string,
    added: string[],
    removed: string[],
    maxDeviation?: string,
  ) => Promise<void>
  initDeviation: string
  client: string
  clientContractAddress: string
}

export const AllowedSPs: React.FC<ComponentProps> = ({
  client,
  clientContractAddress,
  initDeviation,
  onSubmit,
}) => {
  const [isDirty, setIsDirty] = useState<boolean>(false)
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false)
  const [maxDeviation, setMaxDeviation] = useState<string>(initDeviation ?? '')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [data, setData] = useState<string[]>([''])
  const [initData, setInitData] = useState<string[]>([''])

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

  const handleInputChange = (index: number, value: string): void => {
    const newData = [...data]
    newData[index] = value

    setData(newData)
    checkIsDirty(newData)
  }

  const handleAddItem = (): void => {
    const newData = [...data, '']

    setData(newData)
    checkIsDirty(newData)
  }

  const handleRemoveItem = (index: number): void => {
    const newData = data.filter((_, i) => i !== index)
    setData(newData)
    checkIsDirty(newData)
  }

  const handleSubmit = async (): Promise<void> => {
    try {
      setIsLoading(true)

      const added = data.filter(
        (item) => !availableAllowedSPs?.includes(item),
      ) ?? ['']

      const removed: string[] = availableAllowedSPs?.filter(
        (item) => !data.includes(item),
      ) ?? ['']

      let maxDeviationResult: string | undefined

      if (clientConfig && clientConfig !== maxDeviation) {
        maxDeviationResult = maxDeviation
      }

      if (!clientConfig) {
        maxDeviationResult = maxDeviation
      }

      await onSubmit(
        client,
        clientContractAddress,
        added,
        removed,
        maxDeviationResult,
      )
    } catch (error) {
      console.log(error)
    } finally {
      setIsLoading(false)
      setIsDialogOpen(false)
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
          {isLoading && (
            <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
              <Spinner />
            </div>
          )}

          <FormControl fullWidth>
            <InputLabel>Max Deviation</InputLabel>
            <OutlinedInput
              id="outlined-controlled"
              endAdornment={<InputAdornment position="end">%</InputAdornment>}
              disabled={true} // make it dynamically in the future
              label="Max Deviation"
              value={maxDeviation ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setMaxDeviation(event.target.value)
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
            disabled={isLoading}
            onClick={() => {
              setIsDialogOpen(false)
              setData(initData)
            }}
          >
            Cancel
          </Button>

          <Button
            disabled={isLoading || !isDirty}
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
