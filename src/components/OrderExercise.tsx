import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useRef, useState, type ReactNode } from 'react'
import type { OrderExercise as OrderExerciseData, Tile } from '../lib/exercises'

const ANSWER_ZONE = 'answer-zone'
const BANK_ZONE = 'bank-zone'
const answerKey = (id: string) => `a:${id}`
const bankKey = (id: string) => `b:${id}`
const tileIdOf = (key: string) => key.slice(2)

// Inside the answer line, snap to the closest word; inside the bank, drop on the bank itself.
const collisionDetection: CollisionDetection = (args) => {
  const within = pointerWithin(args)
  if (within.some((c) => c.id === ANSWER_ZONE)) {
    const words = args.droppableContainers.filter((c) => String(c.id).startsWith('a:'))
    const closest = words.length ? closestCenter({ ...args, droppableContainers: words }) : []
    return closest.length ? closest : within.filter((c) => c.id === ANSWER_ZONE)
  }
  if (within.some((c) => c.id === BANK_ZONE)) return within.filter((c) => c.id === BANK_ZONE)
  return args.pointerCoordinates ? [] : closestCenter(args)
}

interface Props {
  exercise: OrderExerciseData
  /** Tile ids currently placed in the answer, in order */
  value: string[]
  onChange: (value: string[]) => void
  disabled: boolean
}

export function OrderExercise({ exercise, value, onChange, disabled }: Props) {
  const tilesById = new Map(exercise.tiles.map((t) => [t.id, t]))
  const [activeTile, setActiveTile] = useState<Tile | null>(null)
  const justDragged = useRef(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const addTile = (id: string) => {
    if (!disabled && !justDragged.current && !value.includes(id)) onChange([...value, id])
  }
  const removeTile = (id: string) => {
    if (!disabled && !justDragged.current) onChange(value.filter((v) => v !== id))
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveTile(tilesById.get(tileIdOf(String(event.active.id))) ?? null)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveTile(null)
    // A click event can follow the drop; ignore it.
    justDragged.current = true
    setTimeout(() => (justDragged.current = false), 0)

    const activeKey = String(active.id)
    const tileId = tileIdOf(activeKey)
    const overKey = over ? String(over.id) : null

    if (activeKey.startsWith('b:')) {
      if (overKey === ANSWER_ZONE) {
        onChange([...value, tileId])
      } else if (over && overKey?.startsWith('a:')) {
        let index = value.indexOf(tileIdOf(overKey))
        const dragged = active.rect.current.translated
        if (dragged && dragged.left + dragged.width / 2 > over.rect.left + over.rect.width / 2) index += 1
        onChange([...value.slice(0, index), tileId, ...value.slice(index)])
      }
      return
    }

    if (overKey === null || overKey === BANK_ZONE) {
      onChange(value.filter((id) => id !== tileId))
    } else if (overKey === ANSWER_ZONE) {
      onChange([...value.filter((id) => id !== tileId), tileId])
    } else if (overKey.startsWith('a:')) {
      const from = value.indexOf(tileId)
      const to = value.indexOf(tileIdOf(overKey))
      if (from !== to) onChange(arrayMove(value, from, to))
    }
  }

  return (
    <div className="order">
      <h2 className="exercise__title">Remets les mots dans le bon ordre</h2>
      <div className="prompt-bubble">
        <span className="prompt-bubble__flag" aria-hidden>
          🇫🇷
        </span>
        <p className="prompt-bubble__text" lang="fr">
          {exercise.prompt}
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveTile(null)}
      >
        <DropZone id={ANSWER_ZONE} className="answer-line" label="Ta réponse">
          <SortableContext items={value.map(answerKey)} strategy={rectSortingStrategy}>
            {value.map((id) => {
              const tile = tilesById.get(id)
              return tile ? (
                <AnswerTile key={id} tile={tile} disabled={disabled} onClick={() => removeTile(id)} />
              ) : null
            })}
          </SortableContext>
        </DropZone>

        <DropZone id={BANK_ZONE} className="word-bank" label="Mots disponibles">
          {exercise.tiles.map((tile) => (
            <BankTile
              key={tile.id}
              tile={tile}
              used={value.includes(tile.id)}
              disabled={disabled}
              onClick={() => addTile(tile.id)}
            />
          ))}
        </DropZone>

        <DragOverlay dropAnimation={null}>
          {activeTile ? <span className="tile tile--overlay">{activeTile.text}</span> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

function DropZone({ id, className, label, children }: { id: string; className: string; label: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={`${className}${isOver ? ` ${className}--over` : ''}`} aria-label={label} role="group" lang="lb">
      {children}
    </div>
  )
}

function AnswerTile({ tile, disabled, onClick }: { tile: Tile; disabled: boolean; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: answerKey(tile.id),
    disabled,
  })
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`tile${isDragging ? ' tile--ghost' : ''}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      aria-disabled={disabled}
      onClick={onClick}
    >
      {tile.text}
    </button>
  )
}

function BankTile({ tile, used, disabled, onClick }: { tile: Tile; used: boolean; disabled: boolean; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: bankKey(tile.id),
    disabled: disabled || used,
  })
  if (used) {
    return (
      <span className="tile tile--placeholder" aria-hidden>
        {tile.text}
      </span>
    )
  }
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={`tile${isDragging ? ' tile--ghost' : ''}`}
      {...attributes}
      {...listeners}
      aria-disabled={disabled}
      onClick={onClick}
    >
      {tile.text}
    </button>
  )
}
