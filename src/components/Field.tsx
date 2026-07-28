import {
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from 'react'

interface FieldProps {
  label: string
  value?: string | number
  children: ReactNode
}

export function Field({ label, value, children }: FieldProps) {
  const controlId = useId()
  const labelId = useId()
  const child = isValidElement(children)
    ? (children as ReactElement<{
        id?: string
        role?: string
        'aria-labelledby'?: string
      }>)
    : undefined
  const nativeControl =
    child &&
    typeof child.type === 'string' &&
    ['input', 'select', 'textarea'].includes(child.type)
  const control = child
    ? cloneElement(child, {
        ...(nativeControl ? { id: child.props.id ?? controlId } : {}),
        'aria-labelledby': child.props['aria-labelledby'] ?? labelId,
        ...(!nativeControl ? { role: child.props.role ?? 'group' } : {}),
      })
    : children

  return (
    <div className="field">
      <span className="field-label">
        {nativeControl ? (
          <label id={labelId} htmlFor={child?.props.id ?? controlId}>
            {label}
          </label>
        ) : (
          <span id={labelId}>{label}</span>
        )}
        {value !== undefined && (
          <span className="field-value" aria-hidden="true">
            {value}
          </span>
        )}
      </span>
      {control}
    </div>
  )
}
