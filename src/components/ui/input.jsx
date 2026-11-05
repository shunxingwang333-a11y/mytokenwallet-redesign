import React from 'react'
import { cn } from '../../lib/utils'

export const Input = React.forwardRef(({ className, type = 'text', ...props }, ref) => (
  <input type={type} className={cn('ui-input', className)} ref={ref} {...props} />
))
Input.displayName = 'Input'
