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
import { calculateDatacap } from '@/lib/utils'
import TextField from '@mui/material/TextField'
import { Button } from '@/components/ui/button'
import { type Allocation, type Application } from '@/type'
import { type ReactNode } from 'react'

interface DatacapAmountModalProps {
  allocationConfig: {
    isDialogOpen: boolean
    allocationType: string
    amount: string
  }
  title: string
  isApiCalling: boolean
  isWalletConnecting: boolean
  allocation: Allocation | undefined
  application: Application
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
}: DatacapAmountModalProps): ReactNode => {
  return (
    <Dialog open={allocationConfig.isDialogOpen} onClose={onClose} fullWidth>
      <DialogTitle
      // className='flex justify-center'
      >
        {title}
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
        <div className="flex gap-3 items-center">
          <FormControl>
            <FormLabel id="demo-controlled-radio-buttons-group">
              Allocation Amount Type
            </FormLabel>
            <RadioGroup
              aria-labelledby="demo-controlled-radio-buttons-group"
              value={allocationConfig.allocationType}
              onChange={(e) => {
                if (e.target.value !== 'manual') {
                  setAllocationConfig({
                    ...allocationConfig,
                    amount: '',
                  })
                }
                setAllocationConfig(
                  (prev: {
                    amount: string
                    allocationType: string
                    isDialogOpen: boolean
                  }) => ({
                    ...prev,
                    allocationType: (e.target as HTMLInputElement).value,
                  }),
                )
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
            {!allocationConfig.allocationType ||
            allocationConfig.allocationType === 'percentage' ||
            allocationConfig.allocationType === 'fixed' ? (
              <Box sx={{ width: 230 }}>
                <FormControl fullWidth>
                  <InputLabel>Amount</InputLabel>
                  <Select
                    disabled={!allocationConfig.allocationType}
                    value={allocationConfig.amount}
                    label="Allocation Amount"
                    onChange={(e: SelectChangeEvent) => {
                      setAllocationConfig(
                        (prev: {
                          amount: string
                          allocationType: string
                          isDialogOpen: boolean
                        }) => ({
                          ...prev,
                          amount: e.target.value,
                        }),
                      )
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
                            allocationConfig.allocationType === 'percentage'
                              ? calculateDatacap(
                                  e,
                                  application.Datacap['Total Requested Amount'],
                                )
                              : e
                          }
                        >
                          {e}
                          {allocationConfig.allocationType === 'percentage'
                            ? `% - ${calculateDatacap(
                                e,
                                application.Datacap['Total Requested Amount'],
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
                  disabled={!allocationConfig.allocationType}
                  value={allocationConfig.amount}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    setAllocationConfig(
                      (prev: {
                        amount: string
                        allocationType: string
                        isDialogOpen: boolean
                      }) => ({
                        ...prev,
                        amount: event.target.value,
                      }),
                    )
                  }}
                />
              </Box>
            )}
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
