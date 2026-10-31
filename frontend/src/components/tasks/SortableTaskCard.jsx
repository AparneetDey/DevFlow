import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskCard } from './TaskCard.jsx';

/**
 * Sortable wrapper for TaskCard providing drag-and-drop integration via @dnd-kit/sortable.
 * Passes dragProps to TaskCard so the card itself can be dragged to reorder or move across columns.
 */
export function SortableTaskCard({
  task,
  columnKey,
  onDoubleClick,
  onEditClick,
  onClick,
  onToggleComplete,
  isToggling = false,
  className = '',
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task._id,
    data: {
      type: 'task',
      task,
      columnKey,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const dragProps = {
    ...attributes,
    ...listeners,
  };

  return (
    <div ref={setNodeRef} style={style} className="min-w-0">
      <TaskCard
        task={task}
        onDoubleClick={onDoubleClick}
        onEditClick={onEditClick}
        onClick={onClick}
        onToggleComplete={onToggleComplete}
        isToggling={isToggling}
        isDragging={isDragging}
        dragProps={dragProps}
        className={className}
      />
    </div>
  );
}

export default SortableTaskCard;
