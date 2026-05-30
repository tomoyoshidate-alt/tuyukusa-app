"use client";

import { useState, type CSSProperties, type HTMLAttributes } from "react";
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

const TOUCH_ACTIVATION = { delay: 150, tolerance: 8 } as const;

export default function SectionOrderList({ sectionOrder, onReorder }: Props) {
  const [activeId, setActiveId] = useState<HomeSectionId | null>(null);

  const sensors = useSensors(
    useSensor(TouchSensor, {
      activationConstraint: TOUCH_ACTIVATION,
    }),
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
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
        <div role="list" aria-label="ホーム表示順">
          {sectionOrder.map((sectionId, index) => (
            <SortableSectionRow
              key={sectionId}
              sectionId={sectionId}
              index={index}
              isOverlayActive={activeId === sectionId}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay dropAnimation={{ duration: 180, easing: "ease-out" }}>
        {activeId ? (
          <SectionRowContent sectionId={activeId} index={activeIndex} isDragging isOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function SortableSectionRow({
  sectionId,
  index,
  isOverlayActive,
}: {
  sectionId: HomeSectionId;
  index: number;
  isOverlayActive: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sectionId });

  const dragging = isDragging || isOverlayActive;

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    position: "relative",
    zIndex: dragging ? 2 : 0,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <SectionRowContent
        sectionId={sectionId}
        index={index}
        isDragging={dragging}
        handleRef={setActivatorNodeRef}
        handleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

function SectionRowContent({
  sectionId,
  index,
  isDragging,
  isOverlay = false,
  handleRef,
  handleProps,
}: {
  sectionId: HomeSectionId;
  index: number;
  isDragging: boolean;
  isOverlay?: boolean;
  handleRef?: (element: HTMLElement | null) => void;
  handleProps?: HTMLAttributes<HTMLButtonElement>;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 10px",
        marginBottom: 6,
        borderRadius: 10,
        background: isDragging ? "#fdf0e4" : "#f5f0e8",
        border: isDragging ? "2px solid #c17f4a" : "1px solid rgba(60,40,20,0.08)",
        boxShadow: isOverlay
          ? "0 10px 28px rgba(193,127,74,0.35)"
          : isDragging
            ? "0 4px 14px rgba(193,127,74,0.28)"
            : "none",
        transform: isOverlay ? "scale(1.02)" : isDragging ? "scale(1.01)" : "none",
        transition: isOverlay ? "none" : "box-shadow 0.15s ease, background 0.15s ease, border-color 0.15s ease",
      }}
    >
      <button
        type="button"
        ref={handleRef}
        {...handleProps}
        aria-label={`${HOME_SECTION_LABELS[sectionId]}の順序を変更`}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          margin: 0,
          padding: 0,
          border: isDragging ? "2px solid #c17f4a" : "1px solid rgba(60,40,20,0.12)",
          borderRadius: 8,
          background: isDragging ? "#fff8f0" : "white",
          color: isDragging ? "#c17f4a" : "#9a8b7a",
          fontSize: 18,
          lineHeight: 1,
          cursor: isOverlay ? "grabbing" : "grab",
          touchAction: "none",
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          userSelect: "none",
          flexShrink: 0,
        }}
      >
        ⠿
      </button>
      <span style={{ fontSize: 13, color: isDragging ? "#8b5a2b" : "#3d3228", flex: 1, fontWeight: isDragging ? "bold" : "normal" }}>
        {HOME_SECTION_LABELS[sectionId]}
      </span>
      <span
        style={{
          fontSize: 10,
          color: isDragging ? "#c17f4a" : "#9a8b7a",
          fontWeight: isDragging ? "bold" : "normal",
          background: isDragging ? "#fff8f0" : "transparent",
          borderRadius: 10,
          padding: isDragging ? "2px 8px" : 0,
        }}
      >
        {index + 1}
      </span>
    </div>
  );
}
