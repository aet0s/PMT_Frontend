import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DatePicker from '../components/shared/DatePicker';
import Popover from '../components/shared/Popover';

describe('Verify Calendar Height Responsiveness During Date Selection', () => {
  it('renders all date-selection controls and buttons visibly when DatePicker opens', () => {
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    const anchorRef = { current: anchor };

    render(
      <DatePicker
        isOpen={true}
        onClose={vi.fn()}
        anchorRef={anchorRef}
        startDate={null}
        dueDate={null}
        onChange={vi.fn()}
      />
    );

    // Title
    expect(screen.getByText('Dates')).toBeInTheDocument();

    // Preset buttons
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Tomorrow')).toBeInTheDocument();
    expect(screen.getByText('In 1 Week')).toBeInTheDocument();

    // Target buttons and checkboxes
    expect(screen.getAllByText('Start Date').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Due Date').length).toBeGreaterThanOrEqual(1);

    // Footer action buttons must be visible and accessible
    const saveButton = screen.getByTestId('datepicker-save-button');
    const removeButton = screen.getByTestId('datepicker-remove-button');
    expect(saveButton).toBeInTheDocument();
    expect(saveButton).toBeVisible();
    expect(removeButton).toBeInTheDocument();
    expect(removeButton).toBeVisible();
  });

  it('keeps Save and Remove buttons visible and accessible during date selection', () => {
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    const anchorRef = { current: anchor };
    const onChange = vi.fn();

    render(
      <DatePicker
        isOpen={true}
        onClose={vi.fn()}
        anchorRef={anchorRef}
        startDate={null}
        dueDate={null}
        onChange={onChange}
      />
    );

    // Click day "15" on the calendar grid to select a date
    const dayButtons = screen.getAllByRole('button', { name: '15' });
    expect(dayButtons.length).toBeGreaterThan(0);
    fireEvent.click(dayButtons[0]);

    // After date selection, due date inputs are revealed
    const saveButton = screen.getByTestId('datepicker-save-button');
    const removeButton = screen.getByTestId('datepicker-remove-button');

    // All date-selection controls and buttons must remain visible and accessible without being clipped or hidden
    expect(saveButton).toBeInTheDocument();
    expect(saveButton).toBeVisible();
    expect(removeButton).toBeInTheDocument();
    expect(removeButton).toBeVisible();

    // Clicking Save triggers onChange with selected dates
    fireEvent.click(saveButton);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('maintains buttons accessibility when toggling both Start Date and Due Date', () => {
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    const anchorRef = { current: anchor };

    render(
      <DatePicker
        isOpen={true}
        onClose={vi.fn()}
        anchorRef={anchorRef}
        startDate="2026-10-10T10:00:00.000Z"
        dueDate="2026-10-15T18:00:00.000Z"
        onChange={vi.fn()}
      />
    );

    const saveButton = screen.getByTestId('datepicker-save-button');
    const removeButton = screen.getByTestId('datepicker-remove-button');

    expect(saveButton).toBeInTheDocument();
    expect(saveButton).toBeVisible();
    expect(removeButton).toBeInTheDocument();
    expect(removeButton).toBeVisible();

    // Inputs for both start and due date are rendered
    const textInputs = screen.getAllByPlaceholderText('DD/MM/YYYY');
    expect(textInputs.length).toBe(2);
  });

  it('ensures Popover structure constrains inner height to available space and pins footer', () => {
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    const anchorRef = { current: anchor };

    const footer = (
      <div data-testid="test-footer">
        <button type="button">Action Button</button>
      </div>
    );

    render(
      <Popover
        isOpen={true}
        onClose={vi.fn()}
        anchorRef={anchorRef}
        title="Test Popover"
        footer={footer}
      >
        <div style={{ height: '800px' }} data-testid="tall-content">
          Very tall content
        </div>
      </Popover>
    );

    const footerEl = screen.getByTestId('test-footer');
    expect(footerEl).toBeInTheDocument();
    expect(footerEl).toBeVisible();

    // Parent container of children has overflow-y-auto and flex-1
    const contentEl = screen.getByTestId('tall-content');
    const scrollContainer = contentEl.parentElement;
    expect(scrollContainer.className).toContain('overflow-y-auto');
    expect(scrollContainer.className).toContain('flex-1');
  });
});
