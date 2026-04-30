# ReactFlow State Management with Jotai

This document explains how to use the Jotai-based state management system for ReactFlow following ReactFlow's recommended patterns.

## Overview

The ReactFlow state management system uses Jotai atoms to provide a clean, predictable way to manage nodes and edges state. This approach follows ReactFlow's recommended patterns for immutable state updates.

## Key Components

### 1. Atoms (`/src/store/atoms.ts`)

- `nodesAtom` - Main nodes state
- `edgesAtom` - Main edges state
- `updateNodeAtom` - Handles node data updates
- `selectedNodeAtom` - Tracks the currently selected node

### 2. Custom Hook (`/src/hooks/useReactFlowState.ts`)

The `useReactFlowState` hook provides a clean API for interacting with ReactFlow state:

```typescript
const {
  // State
  nodes,
  edges,
  selectedNode,
  
  // Event handlers for ReactFlow
  onNodesChange,
  onEdgesChange,
  onConnect,
  
  // Node operations
  updateNode,
  addNewNode,
  deleteNode,
  setSelectedNode,
  
  // Initialization
  initializeFlow,
} = useReactFlowState()
```

## Using the updateNode Function

### Basic Usage

The `updateNode` function follows ReactFlow's recommended immutable update pattern:

```typescript
// Update a single field
updateNode(nodeId, { 
  label: 'New Label' 
})

// Update multiple fields
updateNode(nodeId, { 
  label: 'New Label',
  mode: 'multiple',
  approvedBy: 'manager'
})
```

### In Panel Components

Here's how to use it in panel components (like ApprovalPanel):

```typescript
import { useReactFlowState } from '@/hooks/useReactFlowState'

export default function ApprovalPanel({ node }: { node: ApprovalNodeType }) {
  const { updateNode } = useReactFlowState()

  return (
    <Select
      value={node.data.mode ?? 'single'}
      onValueChange={(value: string) => {
        updateNode(node.id, {
          mode: value as ApprovalNodeType['data']['mode'],
        })
      }}
      options={[
        { label: 'Single', value: 'single' },
        { label: 'Multiple', value: 'multiple' },
      ]}
    />
  )
}
```

### Advanced Usage

```typescript
// Delete a node (also removes connected edges)
deleteNode(nodeId)

// Add a new node
const newNode = {
  id: 'new-node',
  type: 'approval',
  position: { x: 100, y: 100 },
  data: { mode: 'single' }
}
addNewNode(newNode)

// Initialize flow with data
initializeFlow(initialNodes, initialEdges)
```

## Benefits of This Approach

1. **Immutable Updates**: Follows ReactFlow's recommended patterns
2. **Type Safety**: Full TypeScript support with proper typing
3. **Predictable State**: Jotai atoms provide predictable state management
4. **Performance**: Efficient updates with minimal re-renders
5. **Clean API**: Simple, intuitive interface for common operations

## Migration from Old Code

If you have existing code using `useReactFlow()` and `setNodes()`, here's how to migrate:

### Before (Old Approach)
```typescript
const { setNodes } = useReactFlow()
const { updateNode } = useNodeControl()

// Complex manual state update
setNodes(nodes =>
  nodes.map(n =>
    n.id === nodeId
      ? {
          ...n,
          data: {
            ...n.data,
            mode: value,
          },
        }
      : n
  )
)
```

### After (New Approach)
```typescript
const { updateNode } = useReactFlowState()

// Simple, clean update
updateNode(nodeId, { mode: value })
```

## Example Implementation

See the updated ApprovalPanel component for a complete example of how to use the new state management system with form controls and proper TypeScript typing.