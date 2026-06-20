"use client";

import { useState, useEffect } from "react";

export interface ParticipantConfig {
  participantTypes: string; // "adults" | "kids" | "adults,kids"
  collectAdultName: boolean;
  collectAdultEmail: boolean;
  collectAdultPhone: boolean;
  collectKidName: boolean;
  collectKidGroup: boolean;
  collectKidEmail: boolean;
  collectKidPhone: boolean;
  collectGuardianName: boolean;
  collectGuardianEmail: boolean;
}

interface Props {
  config: ParticipantConfig;
  onChange: (config: ParticipantConfig) => void;
  disabled?: boolean;
}

export function ParticipantConfigEditor({ config, onChange, disabled = false }: Props) {
  const isAdultsOnly = config.participantTypes === "adults";
  const isKidsOnly = config.participantTypes === "kids";
  const isBoth = config.participantTypes === "adults,kids";

  const handleParticipantTypeChange = (type: string) => {
    onChange({ ...config, participantTypes: type });
  };

  const handleConfigChange = (field: keyof ParticipantConfig, value: boolean) => {
    onChange({ ...config, [field]: value });
  };

  return (
    <div className="space-y-6 rounded-lg bg-indigo-50/50 border border-indigo-200/80 p-6">
      <div>
        <h3 className="text-sm font-semibold text-zinc-800 mb-3">
          Who can sign up? <span className="text-red-600">*</span>
        </h3>
        <div className="space-y-2">
          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="participantType"
              value="adults"
              checked={isAdultsOnly}
              onChange={(e) => handleParticipantTypeChange(e.target.value)}
              disabled={disabled}
              className="h-4 w-4 accent-indigo-600"
            />
            <span className="text-sm text-zinc-700">Adults only (no kids)</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="participantType"
              value="kids"
              checked={isKidsOnly}
              onChange={(e) => handleParticipantTypeChange(e.target.value)}
              disabled={disabled}
              className="h-4 w-4 accent-indigo-600"
            />
            <span className="text-sm text-zinc-700">Kids only (no adults)</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="radio"
              name="participantType"
              value="adults,kids"
              checked={isBoth}
              onChange={(e) => handleParticipantTypeChange(e.target.value)}
              disabled={disabled}
              className="h-4 w-4 accent-indigo-600"
            />
            <span className="text-sm text-zinc-700">Both adults and kids</span>
          </label>
        </div>
      </div>

      {/* Adult Fields Configuration */}
      {(isAdultsOnly || isBoth) && (
        <div className="border-t border-indigo-200 pt-4">
          <h4 className="text-sm font-semibold text-zinc-800 mb-3">Collect from adults:</h4>
          <div className="space-y-2 ml-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.collectAdultName}
                onChange={(e) => handleConfigChange("collectAdultName", e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 accent-indigo-600"
              />
              <span className="text-sm text-zinc-700">
                Name <span className="text-red-600">*required</span>
              </span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.collectAdultEmail}
                onChange={(e) => handleConfigChange("collectAdultEmail", e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 accent-indigo-600"
              />
              <span className="text-sm text-zinc-700">
                Email <span className="text-red-600">*required</span>
              </span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.collectAdultPhone}
                onChange={(e) => handleConfigChange("collectAdultPhone", e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 accent-indigo-600"
              />
              <span className="text-sm text-zinc-700">
                Phone No <span className="text-red-600">*required</span>
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Kid Fields Configuration */}
      {(isKidsOnly || isBoth) && (
        <div className="border-t border-indigo-200 pt-4">
          <h4 className="text-sm font-semibold text-zinc-800 mb-3">Collect from kids:</h4>
          <div className="space-y-2 ml-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.collectKidName}
                onChange={(e) => handleConfigChange("collectKidName", e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 accent-indigo-600"
              />
              <span className="text-sm text-zinc-700">
                Name <span className="text-red-600">*required</span>
              </span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.collectKidGroup}
                onChange={(e) => handleConfigChange("collectKidGroup", e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 accent-indigo-600"
              />
              <span className="text-sm text-zinc-700">
                Group <span className="text-red-600">*required</span> (Group1, Group2, Group3, Group4)
              </span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.collectKidEmail}
                onChange={(e) => handleConfigChange("collectKidEmail", e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 accent-indigo-600"
              />
              <span className="text-sm text-zinc-700">
                Email <span className="text-red-600">*required</span>
              </span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.collectKidPhone}
                onChange={(e) => handleConfigChange("collectKidPhone", e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 accent-indigo-600"
              />
              <span className="text-sm text-zinc-700">
                Phone No <span className="text-amber-600">(optional)</span>
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Primary Guardian Info for Kids */}
      {(isKidsOnly || isBoth) && (
        <div className="border-t border-indigo-200 pt-4">
          <h4 className="text-sm font-semibold text-zinc-800 mb-3">Primary adult/guardian info (for kids):</h4>
          <div className="space-y-2 ml-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.collectGuardianName}
                onChange={(e) => handleConfigChange("collectGuardianName", e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 accent-indigo-600"
              />
              <span className="text-sm text-zinc-700">
                Guardian Name <span className="text-red-600">*required</span>
              </span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.collectGuardianEmail}
                onChange={(e) => handleConfigChange("collectGuardianEmail", e.target.checked)}
                disabled={disabled}
                className="h-4 w-4 accent-indigo-600"
              />
              <span className="text-sm text-zinc-700">
                Guardian Email <span className="text-red-600">*required</span>
              </span>
            </label>
          </div>
        </div>
      )}

      <p className="text-xs text-indigo-600 italic">
        Note: Fields marked with * are always collected. Unchecked items will not be shown to users on the sign-up form.
      </p>
    </div>
  );
}
