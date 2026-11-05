import React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva('btn', {
  variants: {
    variant: {
      dark: 'btn-dark',
      lime: 'btn-lime',
      outline: 'btn-outline',
    },
  },
  defaultVariants: { variant: 'dark' },
})

export const Button = React.forwardRef(({ className, variant, href, children, ...props }, ref) => {
  const classes = cn(buttonVariants({ variant }), className)
  return href
    ? <a className={classes} href={href} ref={ref}>{children}</a>
    : <button className={classes} ref={ref} {...props}>{children}</button>
})
Button.displayName = 'Button'
