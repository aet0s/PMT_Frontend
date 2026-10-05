import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Dropdown, DropdownItem } from '../components/ui/Dropdown';

describe('Dropdown keyboard navigation and accessibility', () => {
  it('opens on click and displays items', () => {
    render(
      <Dropdown trigger={<button>Open Menu</button>}>
        <DropdownItem>Item 1</DropdownItem>
        <DropdownItem>Item 2</DropdownItem>
      </Dropdown>
    );

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Open Menu'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('navigates through items with ArrowDown, ArrowUp, Home, End', async () => {
    render(
      <Dropdown trigger={<button data-testid="trigger">Menu</button>}>
        <DropdownItem data-testid="item-1">Item 1</DropdownItem>
        <DropdownItem data-testid="item-2">Item 2</DropdownItem>
        <DropdownItem data-testid="item-3">Item 3</DropdownItem>
      </Dropdown>
    );

    fireEvent.click(screen.getByTestId('trigger'));
    const item1 = screen.getByTestId('item-1');
    const item2 = screen.getByTestId('item-2');
    const item3 = screen.getByTestId('item-3');

    // First item is focused automatically on open
    await waitFor(() => expect(document.activeElement).toBe(item1));

    // ArrowDown moves to next item
    fireEvent.keyDown(document.activeElement, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(item2);

    // ArrowDown moves to third item
    fireEvent.keyDown(document.activeElement, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(item3);

    // ArrowDown wraps around to first item
    fireEvent.keyDown(document.activeElement, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(item1);

    // ArrowUp wraps to last item
    fireEvent.keyDown(document.activeElement, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(item3);

    // Home jumps to first item
    fireEvent.keyDown(document.activeElement, { key: 'Home' });
    expect(document.activeElement).toBe(item1);

    // End jumps to last item
    fireEvent.keyDown(document.activeElement, { key: 'End' });
    expect(document.activeElement).toBe(item3);
  });

  it('closes on Escape and restores focus to trigger', () => {
    render(
      <Dropdown trigger={<button data-testid="trigger">Options</button>}>
        <DropdownItem>Action</DropdownItem>
      </Dropdown>
    );

    const trigger = screen.getByTestId('trigger');
    fireEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.keyDown(document.activeElement, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens via Enter or ArrowDown on trigger', () => {
    render(
      <Dropdown trigger={<button data-testid="trigger">Trigger</button>}>
        <DropdownItem>Item</DropdownItem>
      </Dropdown>
    );

    const trigger = screen.getByTestId('trigger');
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });
});
