import { cn } from '@/utils/cn'
import { ComponentProps } from 'react'

interface Props extends ComponentProps<'button'> {
  active?: boolean
}

export default function TabButton({ active, className, ...props }: Props) {
  return (
    <button
      className={cn(
        'h-15 text-md font-base border-b-2 transition-colors',
        active
          ? 'border-lighten-blue text-lighten-blue'
          : 'border-transparent text-gray-500 hover:text-lighten-blue',
        className
      )}
      {...props}
    />
  )
}
