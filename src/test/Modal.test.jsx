import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '../components/ui/Modal';

describe('Modal accessibility, Esc, and Focus Trap', () => {
  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Test Modal">
        <p>Modal body content</p>
      </Modal>
    );

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Hidden Modal">
        <p>Hidden content</p>
      </Modal>
    );

    expect(screen.queryByText('Hidden Modal')).not.toBeInTheDocument();
  });

  it('traps focus inside the modal when pressing Tab and Shift+Tab', async () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Focus Trap Modal" showCloseButton={false}>
        <div>
          <button data-testid="btn-first">First Button</button>
          <input data-testid="input-middle" placeholder="Middle input" />
          <button data-testid="btn-last">Last Button</button>
        </div>
      </Modal>
    );

    const firstBtn = screen.getByTestId('btn-first');
    const lastBtn = screen.getByTestId('btn-last');

    // Focus last button and press Tab -> should wrap around to first element
    lastBtn.focus();
    expect(document.activeElement).toBe(lastBtn);

    fireEvent.keyDown(window, { key: 'Tab' });
    // Tab from last element wraps to first
    expect(document.activeElement).toBe(firstBtn);

    // Shift+Tab from first element wraps to last
    firstBtn.focus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(lastBtn);
  });

  it('restores focus to previous active element on close', async () => {
    function TestWrapper() {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <div>
          <button data-testid="open-btn" onClick={() => setIsOpen(true)}>
            Open
          </button>
          <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Restore Modal">
            <button data-testid="inside-btn">Inside</button>
          </Modal>
        </div>
      );
    }

    render(<TestWrapper />);
    const openBtn = screen.getByTestId('open-btn');
    openBtn.focus();
    expect(document.activeElement).toBe(openBtn);

    fireEvent.click(openBtn);
    expect(screen.getByText('Restore Modal')).toBeInTheDocument();

    // Close via Esc
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByText('Restore Modal')).not.toBeInTheDocument();
    });
    expect(document.activeElement).toBe(openBtn);
  });
});
