import { createContext, useContext, useState } from 'react'
import type { Translations } from '@/i18n/types'
import { en } from '@/i18n/en'
import { zh } from '@/i18n/zh'
import { ms } from '@/i18n/ms'
import { ta } from '@/i18n/ta'
import { de } from '@/i18n/de'
import { ja } from '@/i18n/ja'
import { ko } from '@/i18n/ko'
import { id } from '@/i18n/id'

export type Locale = 'en' | 'zh' | 'ms' | 'ta' | 'de' | 'ja' | 'ko' | 'id'

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  zh: '中文',
  ms: 'Bahasa Melayu',
  ta: 'தமிழ்',
  de: 'Deutsch',
  ja: '日本語',
  ko: '한국어',
  id: 'Bahasa Indonesia',
}

const locales: Record<Locale, Translations> = { en, zh, ms, ta, de, ja, ko, id }

interface LocaleCtx {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: keyof Translations, vars?: Record<string, string | number>) => string
}

const LocaleContext = createContext<LocaleCtx>({} as LocaleCtx)

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem('lorewalk_locale') as Locale | null
    return saved && saved in locales ? saved : 'en'
  })

  function setLocale(l: Locale) {
    setLocaleState(l)
    localStorage.setItem('lorewalk_locale', l)
  }

  function t(key: keyof Translations, vars?: Record<string, string | number>): string {
    let str = locales[locale][key] ?? locales.en[key] ?? key
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replaceAll(`{${k}}`, String(v))
      }
    }
    return str
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}
