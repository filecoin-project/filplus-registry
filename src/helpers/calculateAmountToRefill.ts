import { anyToBytes, bytesToiB } from '@/lib/utils'
import { type Application, type RequestAmount, RefillUnit } from '@/type'

export default function calculateAmountToRequest(
  application: Application,
): RequestAmount {
  const calculateAllocationToRequest = (
    requestNumber: number,
    totalDcGrantedForClientSoFar: number,
    totaldDcRequestedByClient: number,
    weeklyDcAllocationBytes: number,
  ): RequestAmount => {
    const config = {
      HALF_PIB: 2 ** 49, // 0.5PiB
      ONE_PIB: 2 ** 50, // 1PiB
      TWO_PIB: 2 ** 51, // 2PiB
    }

    let nextRequest = 0
    let condition = true
    switch (requestNumber) {
      case 0: // 1nd req (won't never happen here :) - 50%
        condition =
          weeklyDcAllocationBytes / 2 <= totaldDcRequestedByClient * 0.05
        nextRequest = condition
          ? weeklyDcAllocationBytes / 2
          : totaldDcRequestedByClient * 0.05

        break
      case 1: // lesser of 100% of weekly allocation rate or 0.5PiB
        condition = weeklyDcAllocationBytes <= config.HALF_PIB
        nextRequest = condition ? weeklyDcAllocationBytes : config.HALF_PIB

        break
      case 2: // lesser of 200% of weekly allocation rate or 1PiB
        condition = weeklyDcAllocationBytes * 2 <= config.ONE_PIB
        nextRequest = condition ? weeklyDcAllocationBytes * 2 : config.ONE_PIB

        break
      default: // lesser of 400% of weekly allocation rate or 2PiB
        condition = weeklyDcAllocationBytes * 4 <= config.TWO_PIB
        nextRequest = condition ? weeklyDcAllocationBytes * 4 : config.TWO_PIB

        break
    }

    const sumTotalAmountWithNextRequest = Math.floor(
      nextRequest + totalDcGrantedForClientSoFar,
    )

    let retObj: RequestAmount = {
      amount: '0',
      amountType: RefillUnit.GIB,
    }
    if (sumTotalAmountWithNextRequest > totaldDcRequestedByClient) {
      nextRequest = totaldDcRequestedByClient - totalDcGrantedForClientSoFar
      return retObj
    }
    if (nextRequest <= 0) {
      retObj = {
        amount: '0',
        amountType: RefillUnit.GIB,
      }
      return retObj
    }

    const [amount, amountType] = splitString(bytesToiB(Math.floor(nextRequest)))
    const matchedAvailableType = Object.values(RefillUnit).find(
      (type) => type === amountType,
    )
    if (matchedAvailableType) {
      retObj = {
        amount,
        amountType: matchedAvailableType,
      }
      return retObj
    }

    return retObj
  }

  const totalDCGranted = application['Allocation Requests'].reduce(
    (acc, cur) => acc + anyToBytes(cur['Allocation Amount'] ?? '0'),
    0,
  )

  const totaldDcRequestedByClient = anyToBytes(
    application.Datacap['Total Requested Amount'],
  )

  const weeklyDcAllocationBytes = anyToBytes(
    application.Datacap['Weekly Allocation'],
  )

  return calculateAllocationToRequest(
    application['Allocation Requests'].length,
    totalDCGranted,
    totaldDcRequestedByClient,
    weeklyDcAllocationBytes,
  )
}
const splitString = (input: string): [string, string] => {
  // Regex to match expressions like "100PiB" or "0.5TiB"
  const regex = /^(\d+(\.\d+)?)([A-Za-z]iB)$/

  const match = input.match(regex)
  if (match !== null) {
    return [match[1], match[3]] // [Number, Unit]
  }

  return ['0', 'B']
}

export const validateAmount = (amount: string): boolean => {
  const regex = /^(\d+(\.\d+)?)(\s?[A-Za-z]iB)$/
  return regex.test(amount)
}
