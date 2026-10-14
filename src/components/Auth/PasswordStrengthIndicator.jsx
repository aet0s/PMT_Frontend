import React from 'react';

export function checkPasswordCriteria(password = '') {
  return [
    { id: 'length', label: '8+ chars', met: password.length >= 8 },
    { id: 'upper', label: 'Uppercase', met: /[A-Z]/.test(password) },
    { id: 'lower', label: 'Lowercase', met: /[a-z]/.test(password) },
    { id: 'number', label: 'Number', met: /[0-9]/.test(password) },
    { id: 'special', label: 'Symbol', met: /[^A-Za-z0-9]/.test(password) }
  ];
}

export function isPasswordValid(password = '') {
  const criteria = checkPasswordCriteria(password);
  return criteria.every((c) => c.met);
}

export default function PasswordStrengthIndicator({ password = '' }) {
  const criteria = checkPasswordCriteria(password);
  const metCount = criteria.filter((c) => c.met).length;

  let strengthLabel = '';
  let strengthColor = 'bg-border/60';
  let strengthTextColor = 'text-text-muted';

  if (password.length > 0) {
    if (metCount >= 5) {
      strengthLabel = 'Strong';
      strengthColor = 'bg-success';
      strengthTextColor = 'text-success-text';
    } else if (metCount >= 3) {
      strengthLabel = 'Moderate';
      strengthColor = 'bg-amber-500';
      strengthTextColor = 'text-amber-500';
    } else {
      strengthLabel = 'Weak';
      strengthColor = 'bg-danger';
      strengthTextColor = 'text-danger-text';
    }
  }

  return (
    <div className="mt-1 space-y-1">
      {/* 5-segment micro-bar */}
      <div className="grid grid-cols-5 gap-1.5 h-1 w-full bg-border/40 rounded-full overflow-hidden">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={`h-full rounded-full transition-all duration-300 ${
              metCount >= level && password.length > 0 ? strengthColor : 'bg-transparent'
            }`}
          />
        ))}
      </div>

      {/* Micro Status Line */}
      <div className="flex items-center justify-between text-[11px] leading-tight select-none">
        <span className="text-text-muted truncate">
          8+ chars, mixed case, number & symbol
        </span>
        {password.length > 0 && (
          <span className={`font-semibold shrink-0 ml-2 ${strengthTextColor}`}>
            {strengthLabel}
          </span>
        )}
      </div>
    </div>
  );
}
