import {
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
import { type ReactNode } from 'react'

type DeviationType = 'contract' | 'directly'

interface AllocationConfig {
  isDialogOpen: boolean
  amount: string
  unit: AllocationUnit
  deviationType?: DeviationType
}

interface DatacapAmountModalProps {
  allocationConfig: AllocationConfig
  title: string
  isApiCalling: boolean
  isWalletConnecting: boolean
  allocation: Allocation | undefined
  application: Application
  clientContractAddress?: string | null
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
}: DatacapAmountModalProps): ReactNode => {
  return (
    <Dialog open={allocationConfig.isDialogOpen} onClose={onClose} fullWidth>
      <DialogTitle>{title}</DialogTitle>
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
                  <FormLabel id="demo-controlled-radio-buttons-group">
                    Deviation type
                  </FormLabel>
                  <RadioGroup
                    aria-labelledby="demo-controlled-radio-buttons-group"
                    value={allocationConfig.deviationType}
                    onChange={(e) => {
                      setAllocationConfig({
                        ...allocationConfig,
                        deviationType: (e.target as HTMLInputElement)
                          .value as DeviationType,
                      })
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