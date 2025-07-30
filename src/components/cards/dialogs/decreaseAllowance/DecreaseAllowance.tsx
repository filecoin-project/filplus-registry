import {
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material'
import { Spinner } from '@/components/ui/spinner'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormHelperText from '@mui/material/FormHelperText'
import Box from '@mui/material/Box'
import InputLabel from '@mui/material/InputLabel'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import { Button } from '@/components/ui/button'
import { AllocationUnit } from '@/type'
import { useState, useCallback } from 'react'
import { anyToBytes, bytesToiB } from '@/lib/utils'
import { type DecreaseAllowanceConfig } from '@/type'
import { Modal } from '@/components/ui/modal'

interface ComponentProps {
  isApiCalling: boolean
  currentClientDatacap: number
  onSubmit: (decreaseAllowanceConfig: DecreaseAllowanceConfig) => Promise<void>
  setApiCalling: (isApiCalling: boolean) => void
}

const initialDecreaseAllowanceConfig: DecreaseAllowanceConfig = {
  amount: '0',
  unit: 'B' as AllocationUnit,
  reasonForDecreasing: '',
}
export const DecreaseAllowance: React.FC<ComponentProps> = ({
  isApiCalling,
  currentClientDatacap,
  onSubmit,
  setApiCalling,
}) => {
  const [decreaseAllowanceConfig, setDecreaseAllowanceConfig] =
    useState<DecreaseAllowanceConfig>(initialDecreaseAllowanceConfig)
  const [
    isDecreaseRemainingDatacapChecked,
    setIsDecreaseRemainingDatacapChecked,
  ] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false)
  const [modalMessage, setModalMessage] = useState<string | null>(null)
  const [error, setError] = useState<boolean>(false)

  const handleCheckboxChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const isChecked = e.target.checked
    setIsDecreaseRemainingDatacapChecked(isChecked)
    setDecreaseAllowanceConfig((prev: DecreaseAllowanceConfig) => ({
      ...prev,
      amount: currentClientDatacap?.toString(),
      unit: 'B' as AllocationUnit,
      isDecreaseRemainingDatacapChecked: isChecked,
    }))
  }

  const handleReasonForDecreasingChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDecreaseAllowanceConfig((prev: DecreaseAllowanceConfig) => ({
        ...prev,
        reasonForDecreasing: e.target.value.trim(),
      }))
    },
    [setDecreaseAllowanceConfig],
  )

  const handleSubmit = async (): Promise<void> => {
    setApiCalling(true)
    try {
      if (decreaseAllowanceConfig.amount === '0')
        throw new Error(
          'Cannot decrease DataCap by 0. Please enter a valid amount.',
        )

      if (decreaseAllowanceConfig.reasonForDecreasing.length < 10)
        throw new Error(
          'Reason for decreasing DataCap must be at least 10 characters long.',
        )

      const decreaseAmountInBytes = anyToBytes(
        `${decreaseAllowanceConfig.amount}${decreaseAllowanceConfig.unit}`,
      )
      if (decreaseAmountInBytes > currentClientDatacap)
        throw new Error(
          `Cannot decrease DataCap by ${decreaseAllowanceConfig.amount} ${decreaseAllowanceConfig.unit}. Current client DataCap is ${bytesToiB(currentClientDatacap)}.`,
        )

      if (decreaseAllowanceConfig.reasonForDecreasing.length < 10)
        throw new Error(
          'Reason for decreasing DataCap must be at least 10 characters long.',
        )

      setIsDialogOpen(false)
      await onSubmit(decreaseAllowanceConfig)
    } catch (error: unknown) {
      setIsDialogOpen(false)
      console.error('Failed to submit decrease allowance request:', error)
      if (error instanceof Error) {
        setModalMessage(error.message)
      } else {
        setModalMessage(
          'Failed to submit decrease allowance request: ' + String(error),
        )
      }
    } finally {
      setApiCalling(false)
      setDecreaseAllowanceConfig(initialDecreaseAllowanceConfig)
    }
  }

  const handleCloseErrorModal = (): void => {
    setError(false)
    setModalMessage(null)
  }

  const isDecreaseAmountInvalid =
    !decreaseAllowanceConfig.amount || decreaseAllowanceConfig.amount === '0'
  const isReasonForDecreasingInvalid =
    decreaseAllowanceConfig?.reasonForDecreasing?.length < 10

  const isSubmitDisabled =
    isApiCalling || isDecreaseAmountInvalid || isReasonForDecreasingInvalid
  return (
    <>
      {modalMessage != null && (
        <Modal
          message={modalMessage}
          onClose={handleCloseErrorModal}
          error={error}
        />
      )}
      <Button
        onClick={() => {
          setIsDialogOpen(true)
        }}
        disabled={false}
        style={{
          width: '250px',
        }}
        className="bg-gray-400 text-black rounded-lg px-4 py-2 hover:bg-gray-500"
      >
        Decrease Client DataCap
      </Button>
      <Dialog
        open={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false)
          setDecreaseAllowanceConfig(initialDecreaseAllowanceConfig)
        }}
        fullWidth
      >
        <DialogTitle>Decrease Client DataCap</DialogTitle>
        <DialogContent>
          {isApiCalling && (
            <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
              <Spinner />
            </div>
          )}
          <div>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isDecreaseRemainingDatacapChecked}
                  onChange={handleCheckboxChange}
                />
              }
              label={`Decrease DataCap to 0GiB. Current client DatCap: ${bytesToiB(currentClientDatacap)}`}
            />
          </div>
          <div className="flex gap-3 items-center flex-col">
            <div className="flex gap-3 items-center w-full">
              <div className="w-3/6">
                <Box>
                  <FormControl className="w-full">
                    <TextField
                      label="Amount To Decrease"
                      id="outlined-number"
                      type="number"
                      InputProps={{
                        inputProps: { min: 1 },
                      }}
                      value={decreaseAllowanceConfig.amount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setDecreaseAllowanceConfig(
                          (prev: DecreaseAllowanceConfig) => ({
                            ...prev,
                            amount: e.target.value,
                          }),
                        )
                      }}
                      variant="outlined"
                      required
                      disabled={isDecreaseRemainingDatacapChecked}
                    />
                  </FormControl>
                </Box>
              </div>
              <div className="w-3/6">
                <Box>
                  <FormControl className="w-full">
                    <InputLabel>Unit</InputLabel>
                    <Select
                      value={decreaseAllowanceConfig.unit}
                      label="Unit"
                      onChange={(e: SelectChangeEvent) => {
                        setDecreaseAllowanceConfig(
                          (prev: DecreaseAllowanceConfig) => ({
                            ...prev,
                            unit: e.target.value as AllocationUnit,
                          }),
                        )
                      }}
                      disabled={isDecreaseRemainingDatacapChecked}
                    >
                      {Object.values(AllocationUnit).map((e) => (
                        <MenuItem key={e} value={e}>
                          {e}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </div>
            </div>
            <div className="w-full">
              <TextField
                label="Reason for decreasing client DataCap"
                multiline
                rows={4}
                variant="outlined"
                fullWidth
                onChange={handleReasonForDecreasingChange}
              />
              <FormHelperText id="my-helper-text">
                Note: this will be shared on the GitHub application thread
              </FormHelperText>
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
              setDecreaseAllowanceConfig(initialDecreaseAllowanceConfig)
            }}
          >
            Cancel
          </Button>
          <Button
            disabled={isSubmitDisabled}
            onClick={() => {
              void handleSubmit()
            }}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
