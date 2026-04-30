import { BuilderStore } from '@coltorapps/builder'

const MAX_ELEMENTS_PER_ROW = 4

export interface RowLayout {
  rowId: string
  elementIds: string[]
  columnSpans: number[]
}

// Global store for row layouts
let rowLayouts: Record<string, RowLayout> = {}

// Helper to generate unique IDs
const generateId = () => `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Get optimal column spans for different element counts
export const getOptimalColumnSpans = (elementCount: number): number[] => {
  switch (elementCount) {
    case 1:
      return [12] // Full width
    case 2:
      return [6, 6] // 50/50
    case 3:
      return [4, 4, 4] // 33/33/33
    case 4:
      return [3, 3, 3, 3] // 25/25/25/25
    default:
      // Fallback - shouldn't happen with max rule
      const span = Math.floor(12 / elementCount)
      return Array(elementCount).fill(span)
  }
}

// Row management functions
export const rowManager = {
  // Get all row layouts
  getRowLayouts: () => rowLayouts,

  // Get specific row layout
  getRow: (rowId: string) => rowLayouts[rowId],

  // Check if row can accept more elements
  canAddToRow: (rowId: string): boolean => {
    const row = rowLayouts[rowId]
    return row && row.elementIds.length < MAX_ELEMENTS_PER_ROW
  },

  // Create new row with elements
  createRow: (elementIds: string[]): string => {
    const rowId = generateId()
    const columnSpans = getOptimalColumnSpans(elementIds.length)

    rowLayouts[rowId] = {
      rowId,
      elementIds: [...elementIds],
      columnSpans,
    }

    return rowId
  },

  // Add element to existing row
  addToRow: (rowId: string, elementId: string): boolean => {
    const row = rowLayouts[rowId]

    if (!row || row.elementIds.length >= MAX_ELEMENTS_PER_ROW) {
      return false
    }

    row.elementIds.push(elementId)
    row.columnSpans = getOptimalColumnSpans(row.elementIds.length)

    return true
  },

  // Remove element from row
  removeFromRow: (rowId: string, elementId: string): boolean => {
    const row = rowLayouts[rowId]

    if (!row) return false

    const index = row.elementIds.indexOf(elementId)
    if (index === -1) return false

    row.elementIds.splice(index, 1)

    if (row.elementIds.length === 0) {
      // Remove empty row
      delete rowLayouts[rowId]
    } else {
      // Recalculate column spans
      row.columnSpans = getOptimalColumnSpans(row.elementIds.length)
    }

    return true
  },

  // Delete entire row
  deleteRow: (rowId: string): void => {
    delete rowLayouts[rowId]
  },

  // Get element's row info
  getElementRowInfo: (
    elementId: string
  ): { rowId: string; position: number; columnSpan: number } | null => {
    for (const row of Object.values(rowLayouts)) {
      const position = row.elementIds.indexOf(elementId)
      if (position !== -1) {
        return {
          rowId: row.rowId,
          position,
          columnSpan: row.columnSpans[position],
        }
      }
    }
    return null
  },

  // Check if dropping on top vs between elements
  isDropOnTop: (collision: any): boolean => {
    if (!collision) return false

    // More sophisticated collision detection
    // Check if the collision has good overlap (> 40% intersection)
    // and if the collision data indicates a direct overlap
    const hasGoodOverlap = collision.intersectionRatio > 0.4
    const rect = collision.rect

    if (!rect) return hasGoodOverlap

    // Check if the collision is more centered than edge-based
    const isMoreCentered = rect.intersectionRatio > 0.3

    return hasGoodOverlap && isMoreCentered
  },

  // Handle row creation logic
  handleRowCreation: (builderStore: BuilderStore, draggedId: string, targetId: string): void => {
    const targetRowInfo = rowManager.getElementRowInfo(targetId)

    if (!targetRowInfo) {
      // Target is standalone - create new row
      const rowId = rowManager.createRow([targetId, draggedId])
      console.log(`Created new row ${rowId} with elements:`, [targetId, draggedId])
    } else {
      // Target is in a row - try to add to existing row
      const success = rowManager.addToRow(targetRowInfo.rowId, draggedId)

      if (!success) {
        // Row is full - handle overflow by creating standalone element
        console.log(`Row ${targetRowInfo.rowId} is full, creating standalone element`)
        // Element remains standalone (default behavior)
      } else {
        console.log(`Added element ${draggedId} to row ${targetRowInfo.rowId}`)
      }
    }
  },

  // Group elements by rows for rendering
  groupElementsByRows: (rootEntities: string[]) => {
    const standaloneElements: string[] = []
    const rowGroups: Record<string, string[]> = {}

    rootEntities.forEach(id => {
      const rowInfo = rowManager.getElementRowInfo(id)
      if (rowInfo) {
        if (!rowGroups[rowInfo.rowId]) {
          rowGroups[rowInfo.rowId] = []
        }
        rowGroups[rowInfo.rowId].push(id)
      } else {
        standaloneElements.push(id)
      }
    })

    return { standaloneElements, rowGroups }
  },

  // Clear all row data (useful for testing)
  clearAll: (): void => {
    rowLayouts = {}
  },
}
