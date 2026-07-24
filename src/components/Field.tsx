import type { ReactNode } from 'react'

interface FieldProps {
  label: string
  value?: string | number
  children: ReactNode
}

export function Field({ label, value, children }: FieldProps) {
  return (
    <label className="field">
      <span className="field-label">
        <span>{label}</span>
        {value !== undefined && <output>{value}</output>}
      </span>
      {children}
    </label>
  )
}
