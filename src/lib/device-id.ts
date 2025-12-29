'use client'

import { v4 as uuidv4 } from 'uuid'

const DEVICE_ID_KEY = 'endpnt_device_id'

export function getDeviceId(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  let deviceId = localStorage.getItem(DEVICE_ID_KEY)

  if (!deviceId) {
    deviceId = `device_${uuidv4()}`
    localStorage.setItem(DEVICE_ID_KEY, deviceId)
  }

  return deviceId
}
