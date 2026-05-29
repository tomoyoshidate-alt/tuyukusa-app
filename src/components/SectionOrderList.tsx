"use client";

import { useState, type CSSProperties } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { HOME_SECTION_LABELS, type HomeSectionId } from "@/src/lib/homeDisplay";

type Props = {
  sectionOrder: HomeSectionId[];
  onReorder: (nextOrder: HomeSectionId[]) => void;
};

export default function SectionOrderList({ sectionOrder, onReorder }: Props) {
  const [activeId, setActiveId] = useState<HomeSectionId | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as HomeSectionId);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const oldIndex = sectionOrder.indexOf(active.id as HomeSectionId);
    const newIndex = sectionOrder.indexOf(over.id as HomeSectionId);
    if (oldIndex === -1 || newIndex === -1) return;

    onReorder(arrayMove(sectionOrder, oldIndex, newIndex));
  };

  const handleDragCancel = () => setActiveId(null);

  const activeIndex = activeId ? sectionOrder.indexOf(activeId) : -1;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
        <div style={{ touchAction: "none" }}>
          {sectionOrder.map((sectionId, index) => (
            <SortableSectionRow
              key={sectionId}
              sectionId={sectionId}
              index={index}
              isActive={activeId === sectionId}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
        {activeId ? (
          <SectionRowContent
            sectionId={activeId}
            index={activeIndex}
            isDragging
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function SortableSectionRow({
  sectionId,
  index,
  isActive,
}: {
  sectionId: HomeSectionId;
  index: number;
  isActive: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sectionId,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 0 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <SectionRowContent
        sectionId={sectionId}
        index={index}
        isDragging={isActive}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

function SectionRowContent({
  sectionId,
  index,
  isDragging,
  isOverlay = false,
  dragHandleProps,
}: {
  sectionId: HomeSectionId;
  index: number;
  isDragging: boolean;
  isOverlay?: boolean;
  dragHandleProps?: Record<string, unknown>;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 8px",
        marginBottom: 4,
        borderRadius: 8,
        background: isDragging ? "#fdf0e4" : "#f5f0e8",
        border: isDragging ? "2px solid #c17f4a" : "1px solid rgba(60,40,20,0.08)",
        boxShadow: isOverlay ? "0 8px 24px rgba(60,40,20,0.18)" : isDragging ? "0 2px 8px rgba(193,127,74,0.25)" : "none",
        cursor: isOverlay ? "grabbing" : "default",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <span
        {...dragHandleProps}
        style={{
          fontSize: 16,
          opacity: isDragging ? 1 : 0.5,
          color: isDragging ? "#c17f4a" : "inherit",
          cursor: "grab",
          touchAction: "none",
          padding: "4px 2px",
          flexShrink: 0,
        }}
        aria-label={`${HOME_SECTION_LABELS[sectionId]}を並び替え`}
      >
        ⠿
      </span>
      <span style={{ fontSize: 13, color: "#3d3228", flex: 1 }}>{HOME_SECTION_LABELS[sectionId]}</span>
      <span
        style={{
          fontSize: 10,
          color: isDragging ? "#c17f4a" : "#9a8b7a",
          fontWeight: isDragging ? "bold" : "normal",
        }}
      >
        {index + 1}
      </span>
    </div>
  );
}
