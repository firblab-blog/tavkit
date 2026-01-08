interface FormFieldProps {
  label: string
  description?: string
  children: React.ReactNode
  required?: boolean
}

export const FormField = ({ label, description, children, required = false }: FormFieldProps) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-text">
      {label}
      {required && <span className="text-red-400 ml-1">*</span>}
    </label>
    {description && <p className="text-xs text-text-muted">{description}</p>}
    <div className="[&>select]:min-h-[44px] [&>input]:min-h-[44px] [&>textarea]:min-h-[88px] [&>select]:text-base [&>input]:text-base [&>textarea]:text-base">
      {children}
    </div>
  </div>
)
