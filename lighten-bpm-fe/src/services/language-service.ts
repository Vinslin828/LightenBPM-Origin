import { injectable } from 'inversify'
import i18n from 'i18next'

export interface ILanguageService {
  getCurrentLanguage(): string
  changeLanguage(language: string): Promise<void>
  getSupportedLanguages(): Array<{ code: string; name: string; nativeName: string; flag: string }>
  t(key: string, options?: any): string
}

@injectable()
export class LanguageService implements ILanguageService {
  private readonly supportedLanguages = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
    { code: 'zh-TW', name: 'Chinese (Taiwan)', nativeName: '繁體中文', flag: '🇹🇼' },
    { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', flag: '🇨🇳' },
  ]

  getCurrentLanguage(): string {
    return i18n.language || 'en'
  }

  async changeLanguage(language: string): Promise<void> {
    if (this.supportedLanguages.some(lang => lang.code === language)) {
      await i18n.changeLanguage(language)
    } else {
      throw new Error(`Unsupported language: ${language}`)
    }
  }

  getSupportedLanguages() {
    return this.supportedLanguages
  }

  t(key: string, options?: any): string {
    return i18n.t(key, options) as string
  }
}
