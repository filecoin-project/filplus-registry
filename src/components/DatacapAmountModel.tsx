import {
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material'
import { Spinner } from '@/components/ui/spinner'
import FormControl from '@mui/material/FormControl'
import FormLabel from '@mui/material/FormLabel'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormHelperText from '@mui/material/FormHelperText'
import Radio from '@mui/material/Radio'
import Box from '@mui/material/Box'
import InputLabel from '@mui/material/InputLabel'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import { Button } from '@/components/ui/button'
import { AllocationUnit, type Allocation, type Application } from '@/type'
import { type ReactNode, useState, useCallback } from 'react'
import { bytesToiB } from '@/lib/utils'

type AllocationType = 'directly' | 'contract'

interface AllocationConfig {
  isDialogOpen: boolean
  amount: string
  unit: AllocationUnit
  allocationType?: AllocationType
  earlyRefillComment?: string
  reasonForNotUsingClientSmartContract?: string
}

interface DatacapAmountModalProps {
  allocationConfig: AllocationConfig
  title: string
  isApiCalling: boolean
  isWalletConnecting: boolean
  allocation: Allocation | undefined
  application: Application
  clientContractAddress?: string | null
  remainingDatacap?: number | undefined
  usedDatatapInPercentage: number
  isOnRampContract?: boolean
  setAllocationConfig: (config: any) => void
  onClose: () => void
  onCancel: () => void
  onConfirm: () => void
}

const DatacapAmountModal = ({
  allocationConfig,
  setAllocationConfig,
  isApiCalling,
  isWalletConnecting,
  onClose,
  onCancel,
  onConfirm,
  allocation,
  application,
  title,
  clientContractAddress,
  remainingDatacap,
  usedDatatapInPercentage,
  isOnRampContract,
}: DatacapAmountModalProps): ReactNode => {
  const [isFillRemainingDatacapChecked, setIsFillRemainingDatacapChecked] =
    useState(false)

  const handleCheckboxChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const isChecked = e.target.checked
    setIsFillRemainingDatacapChecked(isChecked)
    setAllocationConfig((prev: AllocationConfig) => ({
      ...prev,
      amount: remainingDatacap?.toString() ?? '0',
      unit: 'B' as AllocationUnit,
      isFillRemainingDatacapChecked: isChecked,
    }))
  }

  const handleEarlyRefillCommentChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setAllocationConfig((prev: AllocationConfig) => ({
        ...prev,
        earlyRefillComment: e.target.value.trim(),
      }))
    },
    [setAllocationConfig],
  )

  const handleReasonForNotUsingClientSmartContract = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setAllocationConfig((prev: AllocationConfig) => ({
        ...prev,
        reasonForNotUsingClientSmartContract: e.target.value.trim(),
      }))
    },
    [setAllocationConfig],
  )

  const handleAllocationTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setAllocationConfig((prev: AllocationConfig) => ({
        ...prev,
        allocationType: e.target.value as AllocationType,
        reasonForNotUsingClientSmartContract:
          (e.target.value as AllocationType) === 'directly' ? '' : undefined,
      }))
    },
    [setAllocationConfig],
  )
  const isAllocationAmountInvalid =
    !allocationConfig.amount || allocationConfig.amount === '0'
  const isEarlyRefillCommentNeeded =
    usedDatatapInPercentage < 75 && application?.Lifecycle?.State === 'Granted'
  const isEarlyRefillCommentInvalid =
    allocationConfig.earlyRefillComment === undefined ||
    (allocationConfig.earlyRefillComment !== undefined &&
      allocationConfig?.earlyRefillComment?.length < 10 &&
      usedDatatapInPercentage < 75)

  const isReasonForNotUsingClientSmartContractNeeded =
    allocationConfig.allocationType &&
    allocationConfig.allocationType === 'directly'
  const isReasonForNotUsingClientSmartContractInvalid =
    allocationConfig.reasonForNotUsingClientSmartContract !== undefined &&
    allocationConfig?.reasonForNotUsingClientSmartContract?.length < 10
  const isSubmitDisabled =
    isApiCalling ||
    isAllocationAmountInvalid ||
    (isEarlyRefillCommentInvalid && isEarlyRefillCommentNeeded) ||
    (isReasonForNotUsingClientSmartContractInvalid &&
      isReasonForNotUsingClientSmartContractNeeded)
  return (
    <Dialog open={allocationConfig.isDialogOpen} onClose={onClose} fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {(isApiCalling || isWalletConnecting) && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <Spinner />
          </div>
        )}
        {remainingDatacap && remainingDatacap > 0 ? (
          <div>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isFillRemainingDatacapChecked}
                  onChange={handleCheckboxChange}
                />
              }
              label={`Allocate the remaining requested DataCap: ${bytesToiB(remainingDatacap)}`}
            />
          </div>
        ) : null}
        <div className="flex gap-3 items-center flex-col">
          {clientContractAddress &&
            clientContractAddress !== null &&
            [
              'KYCRequested',
              'Submitted',
              'AdditionalInfoRequired',
              'AdditionalInfoSubmitted',
            ].includes(application?.Lifecycle?.State) && (
              <>
                <div className="flex justify-items-center justify-between content-center items-center	w-full">
                  <FormControl>
                    <div className="flex justify-between items-center">
                      <FormLabel id="demo-controlled-radio-buttons-group">
                        Allocation type
                      </FormLabel>
                    </div>
                    <RadioGroup
                      aria-labelledby="demo-controlled-radio-buttons-group"
                      value={allocationConfig.allocationType}
                      onChange={handleAllocationTypeChange}
                    >
                      <div className="flex items-center justify-between">
                        <FormControlLabel
                          value={'contract'}
                          control={<Radio />}
                          label={'Contract'}
                        />
                        <div className="flex gap-4">
                          <a
                            href="https://www.fidl.tech/news/improvements-to-datacap-management"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            About
                          </a>
                          <a
                            href="https://github.com/fidlabs/contract-metaallocator/blob/main/HowToUseClientSmartContract.md"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            How To Use
                          </a>
                        </div>
                      </div>
                      {!isOnRampContract && (
                        <FormControlLabel
                          value="directly"
                          control={<Radio />}
                          label="Directly"
                        />
                      )}
                    </RadioGroup>
                  </FormControl>
                </div>

                {isReasonForNotUsingClientSmartContractNeeded ? (
                  <div className="w-full">
                    <div className="pb-2">
                      <FormLabel id="demo-controlled-radio-buttons-group">
                        Reason for not using Client.sol
                      </FormLabel>
                    </div>

                    <TextField
                      label="Please provide your explanation"
                      multiline
                      rows={4}
                      variant="outlined"
                      fullWidth
                      onChange={handleReasonForNotUsingClientSmartContract}
                    />
                    <FormHelperText id="my-helper-text">
                      Note: this will be shared on the GitHub application thread
                    </FormHelperText>
                  </div>
                ) : null}
              </>
            )}
          <div className="flex gap-3 items-center w-full">
            <div className="w-3/6">
              <Box>
                <FormControl className="w-full">
                  <TextField
                    label="Allocation Amount"
                    id="outlined-number"
                    type="number"
                    InputProps={{
                      inputProps: { min: 1 },
                    }}
                    value={allocationConfig.amount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setAllocationConfig((prev: AllocationConfig) => ({
                        ...prev,
                        amount: e.target.value,
                      }))
                    }}
                    variant="outlined"
                    required
                    disabled={isFillRemainingDatacapChecked}
                  />
                </FormControl>
              </Box>
            </div>
            <div className="w-3/6">
              <Box>
                <FormControl className="w-full">
                  <InputLabel>Unit</InputLabel>
                  <Select
                    value={allocationConfig.unit}
                    label="Unit"
                    onChange={(e: SelectChangeEvent) => {
                      setAllocationConfig((prev: AllocationConfig) => ({
                        ...prev,
                        unit: e.target.value as AllocationUnit,
                      }))
                    }}
                    disabled={isFillRemainingDatacapChecked}
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
          {usedDatatapInPercentage < 75 && remainingDatacap ? (
            <div className="w-full">
              <TextField
                label="Reason for triggering a new allocation despite 75% of the previous one not being utilized."
                multiline
                rows={4}
                variant="outlined"
                fullWidth
                onChange={handleEarlyRefillCommentChange}
              />
            </div>
          ) : null}
        </div>
      </DialogContent>
      <DialogActions
        style={{
          padding: '0 24px 20px 24px',
        }}
      >
        <Button disabled={isApiCalling} onClick={onCancel}>
          Cancel
        </Button>
        <Button disabled={isSubmitDisabled} onClick={onConfirm}>
          Submit
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DatacapAmountModal
