import { BuilderStore } from '@coltorapps/builder'
import { Preview } from './preview'

import { BuilderEntities, BuilderEntity, useBuilderStoreData } from '@coltorapps/builder-react'
import { basicFormBuilder } from './definition'
import { InfoIcon, XIcon } from 'lucide-react'
import { DndContainer, DndItem } from '@/components/dnd'
import { cn } from '@/utils/cn'
import { ReactNode } from 'react'
import { entitiesComponents } from '@/const/form-builder'

type Props = {
  builderStore: BuilderStore<typeof basicFormBuilder>
  activeEntityId: string | null
  setActiveEntityId: (entityId: string) => void
}

export default function Canvas({ builderStore, activeEntityId, setActiveEntityId }: Props) {
  const {
    schema: { root },
  } = useBuilderStoreData(builderStore, events =>
    events.some(event => event.name === 'RootUpdated' || event.name === 'DataSet')
  )

  return (
    <div className='flex-1 flex flex-col h-full bg-gray-100 overflow-y-auto'>
      {root.length ? (
        <div className='flex justify-end p-4 flex-shrink-0'>
          <Preview
            builderStore={builderStore}
            activeEntityId={activeEntityId}
            onEntityError={entityId => {
              if (builderStore.getSchema().entities[entityId]) {
                setActiveEntityId(entityId)
              }
            }}
          />
        </div>
      ) : null}
      <div className='flex-1 p-12'>
        {!root.length ? (
          <div className='h-full flex flex-col items-center justify-center'>
            <InfoIcon className='h-8 w-8 text-neutral-600 mb-2' />
            <span>No elements yet.</span>
          </div>
        ) : (
          <div className='min-h-full'>
            <DndContainer
              builderStore={builderStore}
              dragOverlay={({ draggingId }) =>
                draggingId ? (
                  <BuilderEntity
                    entityId={draggingId}
                    builderStore={builderStore}
                    components={entitiesComponents}
                  >
                    {props => (
                      <Entity
                        isActive
                        isDragging
                        builderStore={builderStore}
                        entityId={props.entity.id}
                      >
                        {props.children}
                      </Entity>
                    )}
                  </BuilderEntity>
                ) : null
              }
            >
              {({ draggingId }) => (
                <div className='space-y-8 grid grid-cols-12'>
                  <BuilderEntities builderStore={builderStore} components={entitiesComponents}>
                    {props => (
                      <div className='col-span-12 flex flex-row flex-wrap gap-1'>
                        <DndItem id={props.entity.id} className="flex-1 flex flex-col">
                          <Entity
                            builderStore={builderStore}
                            entityId={props.entity.id}
                            isActive={
                              activeEntityId === props.entity.id && draggingId !== props.entity.id
                            }
                            isDragging={draggingId === props.entity.id}
                            onFocus={() => setActiveEntityId(props.entity.id)}
                            onDelete={() => builderStore.deleteEntity(props.entity.id)}
                            className='flex-1'
                          >
                            {props.children}
                          </Entity>
                        </DndItem>
                      </div>
                    )}
                  </BuilderEntities>
                </div>
              )}
            </DndContainer>
          </div>
        )}
      </div>
    </div>
  )
}

function Entity(props: {
  entityId: string
  children: ReactNode
  isActive: boolean
  isDragging: boolean
  onFocus?: () => void
  onDelete?: () => void
  builderStore: BuilderStore
  className?: string
}) {
  const { entitiesAttributesErrors } = useBuilderStoreData(props.builderStore, events =>
    events.some(
      event =>
        (event.name === 'EntityAttributeErrorUpdated' &&
          event.payload.entity.id === props.entityId) ||
        event.name === 'DataSet'
    )
  )

  return (
    <div className={cn('relative', props.className)}>
      <div className='absolute inset-0 -mx-2 -mb-4 -mt-2 rounded-xl sm:-mx-4' />
      <div
        className='pointer-events-none relative'
        tabIndex={-1}
        onFocusCapture={e => {
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        {props.children}
      </div>
      <button
        type='button'
        className={cn(
          'absolute inset-0 -mx-2 -mb-4 -mt-2 rounded-xl border-2 transition-all sm:-mx-4 color-black bg-w',
          props.isActive
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-1 border-gray-300 hover:border-blue-300 hover:border-2',
          {
            'border-destructive':
              !props.isActive && entitiesAttributesErrors[props.entityId] && !props.isDragging,
          }
        )}
        onPointerDown={props.onFocus}
      />
      {props.isActive ? (
        <button
          type='button'
          className='absolute -right-3 -top-4 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 sm:-right-6'
          onClick={props.onDelete}
        >
          <XIcon className='w-3 text-white' />
        </button>
      ) : null}
    </div>
  )
}
