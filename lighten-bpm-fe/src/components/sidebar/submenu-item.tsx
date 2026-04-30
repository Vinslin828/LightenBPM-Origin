import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/utils/cn'
import { MenuItem } from '@/types/shared'

interface SubMenuItemProps {
  item: MenuItem
  isActive: boolean
}

export const SubMenuItem = ({ item, isActive }: SubMenuItemProps) => {
  const { t } = useTranslation()

  return (
    <Link
      to={item.path}
      className={cn(
        'flex items-center px-3 py-2 text-sm font-medium transition-colors group rounded-lg ml-6',
        isActive
          ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-500'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      )}
      title={t(item.labelKey)}
    >
      <div className='flex-shrink-0'>{item.icon({})}</div>
      <span className='ml-3 truncate'>{t(item.labelKey)}</span>
    </Link>
  )
}
