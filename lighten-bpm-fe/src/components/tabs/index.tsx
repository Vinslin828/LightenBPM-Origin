import { useState } from 'react'
import { cn } from '@/utils/cn'

type TabItem = {
  label: string
  key: string
  children?: React.ReactNode
}

type Props = {
  items: TabItem[]
  defaultValue?: string
  onTabChange?: (value: string) => void
  className?: string
}

export function Tabs({ items, defaultValue, onTabChange, className }: Props) {
  const [activeTab, setActiveTab] = useState(defaultValue || items[0]?.key || '')

  const handleTabClick = (value: string) => {
    setActiveTab(value)
    onTabChange?.(value)
  }

  const activeItem = items.find(item => item.key === activeTab)

  if (!items.length) {
    return null
  }

  return (
    <div className={cn('w-full h-full flex flex-col', className)}>
      {/* Tab Headers */}
      <div className={'flex flex-row flex-shrink-0 h-15 bg-white px-5 py-3 gap-3 border-b-stroke'}>
        {items.map(item => (
          <button
            key={item.key}
            onClick={() => handleTabClick(item.key)}
            className={cn(
              'px-4 py-1 text-sm font-medium rounded-sm',
              activeTab === item.key
                ? 'text-white bg-lighten-blue'
                : 'text-primary-text bg-transparent hover:bg-gray-2'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeItem?.children && (
        <div className='tab-content flex-1 overflow-hidden'>
          <div className='h-full overflow-y-auto'>{activeItem.children}</div>
        </div>
      )}
    </div>
  )
}
