import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Select from '../components/ui/Select';

describe('Select Keyboard Navigation', () => {
  const options = [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' },
    { value: 'cherry', label: 'Cherry' }
  ];

  it('renders with placeholder and correct ARIA attributes', () => {
    render(<Select label="Fruit" options={options} placeholder="Choose fruit" />);
    const trigger = screen.getByRole('combobox', { name: /fruit/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens on click and displays options in listbox', async () => {
    const user = userEvent.setup();
    render(<Select label="Fruit" options={options} />);
    const trigger = screen.getByRole('combobox', { name: /fruit/i });

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const listbox = screen.getByRole('listbox');
    expect(listbox).toBeInTheDocument();
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Banana')).toBeInTheDocument();
  });

  it('selects option on click and invokes onChange', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<Select label="Fruit" options={options} onChange={handleChange} />);

    const trigger = screen.getByRole('combobox', { name: /fruit/i });
    await user.click(trigger);

    const appleOption = screen.getByText('Apple');
    await user.click(appleOption);

    expect(handleChange).toHaveBeenCalledWith('apple');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on Escape key press', async () => {
    const user = userEvent.setup();
    render(<Select label="Fruit" options={options} />);
    const trigger = screen.getByRole('combobox', { name: /fruit/i });

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
  });
});
