// client/src/components/shared/CustomCheckbox.jsx
import React from 'react';
import { Checkbox } from '../ui/Checkbox';

export default function CustomCheckbox({
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
  indeterminate = false,
  className = '',
  name,
  id,
  ...props
}) {
  const handleChange = (e) => {
    if (disabled || !onChange) return;
    onChange(e.target.checked, e);
  };

  return (
    <Checkbox
      id={id}
      name={name}
      checked={Boolean(checked)}
      disabled={disabled}
      indeterminate={indeterminate}
      label={label}
      description={description}
      className={className}
      onChange={handleChange}
      {...props}
    />
  );
}

export { Checkbox };
