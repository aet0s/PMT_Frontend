// client/src/components/Notes/NoteColorPicker.jsx
import React from 'react';
import { Check } from 'lucide-react';
import { NOTE_COLOR_LIST } from './noteConstants';

export default function NoteColorPicker({ value = 'yellow', onChange, disabled = false }) {
  return (
    <div className="flex items-center gap-1.5 p-1.5" role="radiogroup" aria-label="Note color">
      {NOTE_COLOR_LIST.map((color) => {
        const selected = value === color.key;
        return (
          <button
            key={color.key}
            type="button"
            disabled={disabled}
            role="radio"
            aria-checked={selected}
            aria-label={color.label}
            title={color.label}
            onClick={(e) => {
              e.stopPropagation();
              onChange?.(color.key);
            }}
            style={{ backgroundColor: color.bgVar, borderColor: color.dotVar }}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-transform cursor-pointer focus-ring ${
              selected ? 'scale-110 ring-2 ring-primary ring-offset-1' : 'hover:scale-105'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {selected && <Check className="w-3.5 h-3.5 text-text-primary" />}
          </button>
        );
      })}
    </div>
  );
}
