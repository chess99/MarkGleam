import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Check, ChevronDown, Languages } from 'lucide-react'
import type { Locale } from '../types'

interface LanguageSelectProps {
  locale: Locale
  onChange: (locale: Locale) => void
}

const localeLabels: Record<Locale, string> = {
  'zh-CN': '简体中文',
  en: 'English',
  ja: '日本語',
}

const locales = Object.keys(localeLabels) as Locale[]

export function LanguageSelect({ locale, onChange }: LanguageSelectProps) {
  const label =
    locale === 'zh-CN'
      ? '界面语言'
      : locale === 'ja'
        ? '表示言語'
        : 'Interface language'
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<Record<Locale, HTMLButtonElement | null>>({
    'zh-CN': null,
    en: null,
    ja: null,
  })

  useEffect(() => {
    if (!open) return

    const frame = requestAnimationFrame(() => optionRefs.current[locale]?.focus())
    const dismiss = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    }

    document.addEventListener('pointerdown', dismiss)
    window.addEventListener('keydown', handleEscape)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('pointerdown', dismiss)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [locale, open])

  const selectLocale = (nextLocale: Locale) => {
    onChange(nextLocale)
    setOpen(false)
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  const moveOptionFocus = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    currentLocale: Locale,
  ) => {
    const currentIndex = locales.indexOf(currentLocale)
    let nextIndex = currentIndex

    if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % locales.length
    else if (event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + locales.length) % locales.length
    } else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = locales.length - 1
    else if (event.key === 'Tab') {
      setOpen(false)
      return
    } else return

    event.preventDefault()
    optionRefs.current[locales[nextIndex]]?.focus()
  }

  return (
    <div className="language-menu-anchor" ref={rootRef}>
      <button
        ref={triggerRef}
        className="language-select"
        type="button"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="language-options"
        data-state={open ? 'open' : 'closed'}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
          event.preventDefault()
          setOpen(true)
        }}
      >
        <Languages className="language-select-leading" size={17} aria-hidden="true" />
        <span className="language-select-value">
          {localeLabels[locale]}
        </span>
        <span className="language-select-chevron">
          <ChevronDown size={15} aria-hidden="true" />
        </span>
      </button>

      {open && (
        <div
          id="language-options"
          className="language-menu-content"
          role="listbox"
          aria-label={label}
        >
          <div className="language-menu-viewport">
            {locales.map((value) => (
              <button
                ref={(node) => {
                  optionRefs.current[value] = node
                }}
                className="language-menu-item"
                type="button"
                role="option"
                aria-selected={locale === value}
                tabIndex={locale === value ? 0 : -1}
                key={value}
                onClick={() => selectLocale(value)}
                onKeyDown={(event) => moveOptionFocus(event, value)}
              >
                <span>{localeLabels[value]}</span>
                {locale === value && (
                  <span className="language-menu-indicator">
                    <Check size={15} strokeWidth={2.6} aria-hidden="true" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
