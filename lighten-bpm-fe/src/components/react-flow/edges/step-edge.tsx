import { BaseEdge } from '@xyflow/react'

type Props = {
  id: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
}

export default function StepEdge({ id, sourceX, sourceY, targetX, targetY }: Props) {
  const centerY = (targetY - sourceY) / 2 + sourceY

  const edgePath = `M ${sourceX} ${sourceY} L ${sourceX} ${centerY} L ${targetX} ${centerY} L ${targetX} ${targetY}`

  return <BaseEdge id={id} path={edgePath} />
}
