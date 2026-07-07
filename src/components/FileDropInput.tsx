import React, { useState, useRef, type DragEvent } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useGooglePicker } from '../lib/useGooglePicker';
import type { MediaAttachment } from '../types/sequence';

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function SortableImage({
  item,
  index,
  onChange,
  onRemove,
}: {
  item: MediaAttachment;
  index: number;
  onChange: (updated: MediaAttachment) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.url + index });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 border border-gray-200 rounded-lg p-2 bg-white">
      <button {...attributes} {...listeners} title="drag to reorder" className="cursor-grab text-gray-400 hover:text-gray-600 text-sm leading-none tracking-widest select-none">⠿</button>
      <img src={item.url} alt="" className="w-12 h-12 rounded object-cover shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-gray-400 truncate">{item.url.length > 60 ? item.url.slice(0, 60) + '…' : item.url}</div>
        <div className="flex items-center gap-1 mt-1">
          <span className="text-[10px] text-gray-500">{item.scale}%</span>
          <input
            type="range" min={10} max={200} value={item.scale}
            onChange={(e) => onChange({ ...item, scale: Number(e.target.value) })}
            className="w-16"
          />
        </div>
      </div>
      <button onClick={onRemove} className="text-gray-400 hover:text-red-500 text-lg leading-none shrink-0">&times;</button>
    </div>
  );
}

export default function FileDropInput({
  value,
  onChange,
}: {
  value: MediaAttachment[];
  onChange: (v: MediaAttachment[]) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const dragCount = useRef(0);
  const { openPicker } = useGooglePicker();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = value.findIndex((_, i) => (value[i].url + i) === active.id);
    const newIdx = value.findIndex((_, i) => (value[i].url + i) === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    onChange(arrayMove(value, oldIdx, newIdx));
  }

  function addImage(url: string) {
    onChange([...value, { url, scale: 100 }]);
  }

  function handleDragEnter(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCount.current++;
    if (e.dataTransfer.types.includes('Files')) setDragging(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCount.current--;
    if (dragCount.current <= 0) { dragCount.current = 0; setDragging(false); }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    dragCount.current = 0;
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    addImage(await readFileAsDataURL(file));
  }

  async function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    addImage(await readFileAsDataURL(file));
  }

  function handleUrlPaste(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const url = (e.target as HTMLInputElement).value.trim();
      if (url) { addImage(url); (e.target as HTMLInputElement).value = ''; }
    }
  }

  function updateItem(index: number, updated: MediaAttachment) {
    const next = [...value];
    next[index] = updated;
    onChange(next);
  }

  function removeItem(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function handleDrivePicker() {
    openPicker('drive_photos', (url) => addImage(url));
  }

  function handlePhotosPicker() {
    openPicker('photos', (url) => addImage(url));
  }

  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">Images</label>
      <div className="space-y-1 mb-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={value.map((_, i) => value[i].url + i)} strategy={verticalListSortingStrategy}>
            {value.map((item, i) => (
              <SortableImage key={item.url + i} item={item} index={i} onChange={(u) => updateItem(i, u)} onRemove={() => removeItem(i)} />
            ))}
          </SortableContext>
        </DndContext>
      </div>
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-3 text-center text-xs transition-colors ${
          dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
        }`}
      >
        <div className="text-gray-400 py-2">
          <p>Drop an image here</p>
        </div>
        <input type="file" accept="image/*" onChange={handleFilePick} className="hidden" id="file-input" />
        <button
          type="button"
          onClick={() => document.getElementById('file-input')?.click()}
          className="text-blue-500 hover:text-blue-700 text-sm mt-1"
        >
          Browse files
        </button>
        <span className="text-gray-300 mx-2">|</span>
        <button type="button" onClick={handleDrivePicker} className="text-blue-500 hover:text-blue-700 text-sm">
          Drive
        </button>
        <span className="text-gray-300 mx-2">|</span>
        <button type="button" onClick={handlePhotosPicker} className="text-blue-500 hover:text-blue-700 text-sm">
          Photos
        </button>
        <input
          onKeyDown={handleUrlPaste}
          placeholder="Paste URL + Enter"
          className="border border-gray-200 rounded px-2 py-1 text-xs w-full mt-2"
        />
      </div>
    </div>
  );
}
