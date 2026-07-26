'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, ToasterProps } from 'sonner'
import React, { useEffect, useState } from 'react'

const Toaster = ({ position: defaultPosition, ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()
  const [position, setPosition] = useState<ToasterProps['position']>(defaultPosition || 'bottom-right')

  useEffect(() => {
    if (defaultPosition) return;
    const mql = window.matchMedia('(max-width: 768px)')
    const onChange = () => setPosition(mql.matches ? 'top-center' : 'bottom-right')
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [defaultPosition])

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      position={position}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
