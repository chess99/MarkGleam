import { Fragment } from 'react'
import { ArrowLeft, History } from 'lucide-react'
import { changelogEntries } from '../data/changelog'
import { t } from '../i18n'
import { useAppStore } from '../store'
import { BrandMark } from './BrandMark'
import { LanguageSelect } from './LanguageSelect'

export function ChangelogPage({ onBack }: { onBack: () => void }) {
  const locale = useAppStore((state) => state.locale)
  const appearance = useAppStore((state) => state.appearance)
  const setLocale = useAppStore((state) => state.setLocale)

  return (
    <div className="changelog-page" data-appearance={appearance}>
      <header className="changelog-topbar">
        <div className="brand">
          <BrandMark />
          <span className="brand-title">MarkGleam</span>
        </div>
        <div className="changelog-actions">
          <LanguageSelect locale={locale} onChange={setLocale} />
          <button className="changelog-back" type="button" onClick={onBack}>
            <ArrowLeft size={17} />
            {t(locale, 'backToEditor')}
          </button>
        </div>
      </header>

      <main className="changelog-main">
        <section className="changelog-hero">
          <span className="changelog-icon" aria-hidden="true">
            <History size={24} />
          </span>
          <div>
            <h1>{t(locale, 'changelogTitle')}</h1>
            <p>{t(locale, 'changelogIntro')}</p>
          </div>
        </section>

        <div className="changelog-timeline">
          {changelogEntries.map((entry) => (
            <article className="changelog-entry" key={entry.version}>
              <aside>
                <time dateTime={entry.date}>{entry.date}</time>
                <span>{entry.version}</span>
              </aside>
              <div>
                <h2>{entry.title[locale]}</h2>
                <ul>
                  {entry.items[locale].map((item) => (
                    <li key={item}>
                      {item.split(/(`[^`]+`)/).map((part, index) => (
                        <Fragment key={`${part}-${index}`}>
                          {part.startsWith('`') && part.endsWith('`') ? (
                            <code>{part.slice(1, -1)}</code>
                          ) : (
                            part
                          )}
                        </Fragment>
                      ))}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  )
}
