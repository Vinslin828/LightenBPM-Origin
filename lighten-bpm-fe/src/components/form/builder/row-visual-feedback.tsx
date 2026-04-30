import { cn } from '@/utils/cn'
import { rowManager } from './row-manager'

interface RowCapacityIndicatorProps {
  rowId: string
  isDragOver: boolean
  className?: string
}

export function RowCapacityIndicator({ rowId, isDragOver, className }: RowCapacityIndicatorProps) {
  const row = rowManager.getRow(rowId)
  if (!row) return null

  const capacity = `${row.elementIds.length}/4`
  const isFull = row.elementIds.length >= 4

  return (
    <div
      className={cn(
        'absolute -top-6 left-0 text-xs px-2 py-1 rounded shadow-sm transition-all',
        isDragOver
          ? isFull
            ? 'bg-red-500 text-white'
            : 'bg-blue-500 text-white'
          : 'bg-white text-gray-500 border',
        className
      )}
    >
      {capacity} {isFull && isDragOver ? '(Full)' : ''}
    </div>
  )
}

interface RowDropZoneProps {
  rowId: string
  isDragOver: boolean
  isFull: boolean
  children: React.ReactNode
}

export function RowDropZone({ rowId, isDragOver, isFull, children }: RowDropZoneProps) {
  return (
    <div
      className={cn('relative grid grid-cols-12 gap-4 transition-all duration-200', {
        'ring-2 ring-blue-500 ring-opacity-50 bg-blue-50': isDragOver && !isFull,
        'ring-2 ring-red-500 ring-opacity-50 bg-red-50': isDragOver && isFull,
        'hover:bg-gray-50': !isDragOver,
      })}
      data-row-id={rowId}
    >
      <RowCapacityIndicator rowId={rowId} isDragOver={isDragOver} className='z-10' />
      {children}
      {isDragOver && isFull && (
        <div className='absolute inset-0 flex items-center justify-center bg-red-500 bg-opacity-20 rounded-lg pointer-events-none'>
          <div className='bg-red-500 text-white text-sm px-3 py-1 rounded-full font-medium'>
            Row Full - Max 4 elements
          </div>
        </div>
      )}
    </div>
  )
}

interface StandaloneDropZoneProps {
  isDragOver: boolean
  isDropOnTop: boolean
  children: React.ReactNode
}

export function StandaloneDropZone({ isDragOver, isDropOnTop, children }: StandaloneDropZoneProps) {
  return (
    <div
      className={cn('relative w-full transition-all duration-200', {
        'ring-2 ring-blue-500 ring-opacity-50': isDragOver && isDropOnTop,
        'bg-blue-50': isDragOver && isDropOnTop,
      })}
    >
      {children}
      {isDragOver && isDropOnTop && (
        <div className='absolute -top-8 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap'>
          Drop to create row
        </div>
      )}
    </div>
  )
}

export function EmptyCanvasDropZone({ children }: { children: React.ReactNode }) {
  return (
    <div className='relative min-h-[200px] border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-blue-400 transition-colors'>
      {children}
    </div>
  )
}
