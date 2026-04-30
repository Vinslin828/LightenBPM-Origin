import { useState, useEffect } from 'react'
import { useService } from './useService'
import { TYPES } from '../types/symbols'
import { ISettingsService } from '../interfaces/services'
import { AppSettings, CounterSettings } from '../schemas/settings'

export function useAppSettings() {
  const settingsService = useService<ISettingsService>(TYPES.SettingsService)
  const [settings, setSettings] = useState<AppSettings>(() => settingsService.getAppSettings())

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    settingsService.updateAppSettings(newSettings)
    setSettings(settingsService.getAppSettings())
  }

  return { settings, updateSettings }
}

export function useCounterSettings() {
  const settingsService = useService<ISettingsService>(TYPES.SettingsService)
  const [settings, setSettings] = useState<CounterSettings>(() =>
    settingsService.getCounterSettings()
  )

  const updateSettings = (newSettings: Partial<CounterSettings>) => {
    settingsService.updateCounterSettings(newSettings)
    setSettings(settingsService.getCounterSettings())
  }

  return { settings, updateSettings }
}
