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
import Radio from '@mui/material/Radio'
import Box from '@mui/material/Box'
import InputLabel from '@mui/material/InputLabel'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import { Button } from '@/components/ui/button'
import { AllocationUnit, type Allocation, type Application } from '@/type'
import { type ReactNode, useState } from 'react'
import { bytesToiB } from '@/lib/utils'
import Countdown from './Countdown'

type AllocationType = 'directly' | 'contract'

interface AllocationConfig {
  isDialogOpen: boolean
  amount: string
  unit: AllocationUnit
  allocationType?: AllocationType
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

  return (
    <Dialog open={allocationConfig.isDialogOpen} onClose={onClose} fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <Countdown />
      <DialogContent>
        {(isApiCalling || isWalletConnecting) && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <Spinner />
          </div>
        )}
        <div>
          {remainingDatacap && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={isFillRemainingDatacapChecked}
                  onChange={handleCheckboxChange}
                />
              }
              label={`Allocate the remaining requested DataCap: ${bytesToiB(remainingDatacap)}`}
            />
          )}
        </div>
        <div className="flex gap-3 items-center flex-col">
          {clientContractAddress &&
            clientContractAddress !== null &&
            [
              'KYCRequested',
              'Submitted',
              'AdditionalInfoRequired',
              'AdditionalInfoSubmitted',
            ].includes(application?.Lifecycle?.State) && (
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
                    onChange={(e) => {
                      setAllocationConfig({
                        ...allocationConfig,
                        allocationType: (e.target as HTMLInputElement)
                          .value as AllocationType,
                      })
                    }}
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
                    <FormControlLabel
                      value="directly"
                      control={<Radio />}
                      label="Directly"
                    />
                  </RadioGroup>
                </FormControl>
              </div>
            )}
          <div className="w-full">
            {clientContractAddress &&
              clientContractAddress !== null &&
              [
                'KYCRequested',
                'Submitted',
                'AdditionalInfoRequired',
                'AdditionalInfoSubmitted',
              ].includes(application?.Lifecycle?.State) && (
                <FormLabel>Allocation</FormLabel>
              )}
          </div>
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
        <Button
          disabled={isApiCalling || !allocationConfig.amount}
          onClick={onConfirm}
        >
          Submit
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DatacapAmountModal
