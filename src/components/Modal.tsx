import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
  compact?: boolean
  stableHeight?: boolean
  closeLabel?: string
}

export function Modal({
  title,
  onClose,
  children,
  wide,
  compact,
  stableHeight,
  closeLabel = 'Close',
}: ModalProps) {
  const dialogRef = useRef<HTMLElement>(null)
  const titleId = useId()
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    const focusableSelector =
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
    dialog?.querySelector<HTMLElement>(focusableSelector)?.focus()

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !dialog) return

      const focusable = [...dialog.querySelectorAll<HTMLElement>(focusableSelector)]
      if (focusable.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('keydown', handleKey)
      previouslyFocused?.focus()
    }
  }, [])

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        ref={dialogRef}
        className={`modal ${wide ? 'modal-wide' : ''} ${compact ? 'modal-compact' : ''} ${stableHeight ? 'modal-stable-height' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header>
          <h2 id={titleId}>{title}</h2>
          <button
            className="icon-button"
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </header>
        <div className="modal-content">{children}</div>
      </section>
    </div>
  )
}
