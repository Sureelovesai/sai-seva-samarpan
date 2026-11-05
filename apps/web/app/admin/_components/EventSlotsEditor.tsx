'use client'

import { useState } from 'react'

export interface EventSlot {
  id?: string
  slotName: string
  slotDate?: string // Date in YYYY-MM-DD format
  startTime: string // HH:mm format (e.g., "06:00")
  endTime: string   // HH:mm format (e.g., "09:00")
  capacity?: number
}

interface EventSlotsEditorProps {
  slots: EventSlot[]
  onSlotsChange: (slots: EventSlot[]) => void
  enabled: boolean
}

export function EventSlotsEditor({ slots, onSlotsChange, enabled }: EventSlotsEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const addSlot = () => {
    const newSlot: EventSlot = {
      slotName: `Slot ${slots.length + 1}`,
      startTime: '09:00',
      endTime: '12:00',
      capacity: undefined,
    }
    onSlotsChange([...slots, newSlot])
  }

  const updateSlot = (index: number, field: keyof EventSlot, value: string | number | undefined) => {
    const updatedSlots = [...slots]
    updatedSlots[index] = {
      ...updatedSlots[index],
      [field]: value === '' ? undefined : value,
    }
    onSlotsChange(updatedSlots)
  }

  const removeSlot = (index: number) => {
    const updatedSlots = slots.filter((_, i) => i !== index)
    onSlotsChange(updatedSlots)
  }

  if (!enabled) {
    return null
  }

  return (
    <div className="mt-6 rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-gray-900">⏰ Time Slots</h3>
          <span className="inline-block rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-600">
            {slots.length} slot{slots.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm font-semibold text-blue-600 hover:text-blue-800"
        >
          {isExpanded ? '▼ Hide' : '▶ Show'}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-3">
          {slots.map((slot, index) => (
            <div key={index} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-5 mb-3">
                {/* Slot Name */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">
                    Slot Name
                  </label>
                  <input
                    type="text"
                    value={slot.slotName}
                    onChange={(e) => updateSlot(index, 'slotName', e.target.value)}
                    placeholder="e.g., Morning"
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Slot Date */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">
                    Date
                  </label>
                  <input
                    type="date"
                    value={slot.slotDate || ''}
                    onChange={(e) => updateSlot(index, 'slotDate', e.target.value || undefined)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Start Time */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) => updateSlot(index, 'startTime', e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* End Time */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) => updateSlot(index, 'endTime', e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Capacity */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">
                    Capacity (Optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={slot.capacity || ''}
                    onChange={(e) => updateSlot(index, 'capacity', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="Leave blank"
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => removeSlot(index)}
                className="w-full rounded bg-red-100 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-200"
              >
                ✕ Remove Slot
              </button>
            </div>
          ))}

          {/* Add slot button */}
          <button
            type="button"
            onClick={addSlot}
            className="w-full rounded bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            + Add Another Slot
          </button>
        </div>
      )}

      {!isExpanded && slots.length > 0 && (
        <div className="text-sm text-gray-600">
          <div className="space-y-1">
            {slots.map((slot, index) => (
              <div key={index} className="flex justify-between py-1">
                <span className="font-medium text-gray-700">{slot.slotName}</span>
                <span className="text-gray-500">
                  {slot.slotDate && `${new Date(slot.slotDate).toLocaleDateString()} `}
                  {slot.startTime} - {slot.endTime}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isExpanded && slots.length === 0 && (
        <div className="py-4 text-center">
          <p className="mb-3 text-sm text-gray-500">No slots added yet</p>
          <button
            type="button"
            onClick={addSlot}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            + Add First Slot
          </button>
        </div>
      )}
    </div>
  )
}
