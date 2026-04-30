import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useService } from './useService'
import { TYPES } from '../types/symbols'
import type { ILanguageService } from '../interfaces/services'

export function useLanguage() {
  const { i18n } = useTranslation()
  const languageService = useService<ILanguageService>(TYPES.LanguageService)
  const [currentLanguage, setCurrentLanguage] = useState(() => languageService.getCurrentLanguage())

  const supportedLanguages = languageService.getSupportedLanguages()

  const changeLanguage = async (languageCode: string) => {
    try {
      await languageService.changeLanguage(languageCode)
      setCurrentLanguage(languageCode)
    } catch (error) {
      console.error('Failed to change language:', error)
    }
  }

  // Listen for language changes
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      setCurrentLanguage(lng)
    }

    i18n.on('languageChanged', handleLanguageChange)

    return () => {
      i18n.off('languageChanged', handleLanguageChange)
    }
  }, [i18n])

  return {
    currentLanguage,
    supportedLanguages,
    changeLanguage,
    t: languageService.t.bind(languageService),
  }
}
