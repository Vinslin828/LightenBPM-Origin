import { JSX } from 'react'

export interface MenuItem {
  key: string
  labelKey: string
  path: string
  icon: ({ className }: { className?: string }) => JSX.Element
  items?: MenuItem[]
}
