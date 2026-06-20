"use client";

import { useState } from "react";

export interface ParticipantFormData {
  type: "adult" | "kid";
  name?: string;
  email?: string;
  phone?: string;
  groupName?: string;
}

interface Props {
  participantCount: number;
  participantType: "adult" | "kid";
  startIndex?: number; // For labeling (e.g., Adult #2 starts at index 2)
  config: {
    collectName?: boolean;
    collectEmail?: boolean;
    collectPhone?: boolean;
    collectGroup?: boolean;
  };
  participants: ParticipantFormData[];
  onChange: (participants: ParticipantFormData[]) => void;
}

export function DynamicParticipantForm({ participantCount, participantType, startIndex = 1, config, participants, onChange }: Props) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  if (participantCount === 0) {
    return null;
  }

  const handleFieldChange = (index: number, field: keyof ParticipantFormData, value: string) => {
    const updated = [...participants];
    if (!updated[index]) {
      updated[index] = { type: participantType };
    }
    updated[index] = { ...updated[index], [field]: value || undefined };
    onChange(updated);
  };

  const handleFieldFocus = (index: number) => {
    setFocusedIndex(index);
  };

  const handleFieldBlur = () => {
    setFocusedIndex(null);
  };

  const typeLabel = participantType === "adult" ? "Adult" : "Child";

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50/30 p-4">
      <h3 className="mb-4 text-sm font-semibold text-emerald-800">
        {typeLabel} Details {participantCount > 1 && `(${participantCount} ${participantType}s)`}
      </h3>

      <div className="space-y-6">
        {Array.from({ length: participantCount }).map((_, index) => (
          <div key={index} className="rounded-lg border border-indigo-100 bg-white p-4">
            <p className="mb-3 text-xs font-semibold text-zinc-600">
              {typeLabel} #{startIndex + index}
            </p>

            <div className={`grid gap-3 ${config.collectGroup ? "grid-cols-2" : "grid-cols-1"}`}>
              {config.collectName && (
                <div>
                  <label className="block text-xs font-medium text-zinc-700">
                    Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={participants[index]?.name || ""}
                    onChange={(e) => handleFieldChange(index, "name", e.target.value)}
                    placeholder={`${typeLabel} name`}
                    className="mt-1 w-full rounded border border-indigo-200 bg-white px-2 py-1.5 text-sm text-zinc-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}

              {config.collectEmail && (
                <div>
                  <label className="block text-xs font-medium text-zinc-700">
                    Email <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="email"
                    value={participants[index]?.email || ""}
                    onChange={(e) => handleFieldChange(index, "email", e.target.value)}
                    placeholder="email@example.com"
                    className="mt-1 w-full rounded border border-indigo-200 bg-white px-2 py-1.5 text-sm text-zinc-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}

              {config.collectPhone && (
                <div>
                  <label className="block text-xs font-medium text-zinc-700">
                    Phone <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="tel"
                    value={participants[index]?.phone || ""}
                    onChange={(e) => handleFieldChange(index, "phone", e.target.value)}
                    placeholder="Phone number"
                    className="mt-1 w-full rounded border border-indigo-200 bg-white px-2 py-1.5 text-sm text-zinc-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}

              {config.collectGroup && (
                <div>
                  <label className="block text-xs font-medium text-zinc-700">
                    Group <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={participants[index]?.groupName || ""}
                    onChange={(e) => handleFieldChange(index, "groupName", e.target.value)}
                    className="mt-1 w-full rounded border border-indigo-200 bg-white px-2 py-1.5 text-sm text-zinc-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">Select Group</option>
                    <option value="Group1">Group 1</option>
                    <option value="Group2">Group 2</option>
                    <option value="Group3">Group 3</option>
                    <option value="Group4">Group 4</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
