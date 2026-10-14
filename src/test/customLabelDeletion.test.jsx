import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LabelsPopover from '../components/Card/LabelsPopover';

describe('Custom Label Deletion Permissions & UI', () => {
  const sampleBoardLabels = [
    { id: 1, name: 'Feature', color: 'blue', is_custom: 0, created_by_user_id: null },
    { id: 10, name: 'Label 1 (by Member 1)', color: 'teal', is_custom: 1, created_by_user_id: 101 },
    { id: 20, name: 'Label 2 (by Member 2)', color: 'rose', is_custom: 1, created_by_user_id: 202 }
  ];

  it('allows Member 1 to only delete Label 1 and not Label 2 or preset labels', () => {
    const handleDelete = vi.fn();
    const handleToggle = vi.fn();

    render(
      <LabelsPopover
        isOpen={true}
        onClose={vi.fn()}
        anchorRef={{ current: document.createElement('div') }}
        boardLabels={sampleBoardLabels}
        cardLabels={[]}
        onToggleLabel={handleToggle}
        onCreateBoardLabel={vi.fn()}
        onDeleteBoardLabel={handleDelete}
        currentUser={{ id: 101, name: 'Member 1' }}
        userRole={{ name: 'Team Member', rank: 40 }}
      />
    );

    // Dustbin for Member 1's label should exist
    const deleteBtnMember1 = screen.getByLabelText('Delete custom label Label 1 (by Member 1)');
    expect(deleteBtnMember1).toBeDefined();

    // Dustbin for Member 2's label should NOT exist
    const deleteBtnMember2 = screen.queryByLabelText('Delete custom label Label 2 (by Member 2)');
    expect(deleteBtnMember2).toBeNull();

    // Dustbin for preset label 'Feature' should NOT exist
    const deleteBtnPreset = screen.queryByLabelText('Delete custom label Feature');
    expect(deleteBtnPreset).toBeNull();

    // Clicking dustbin deletes Member 1's label and does not trigger toggle
    fireEvent.click(deleteBtnMember1);
    expect(handleDelete).toHaveBeenCalledWith(10);
    expect(handleToggle).not.toHaveBeenCalled();
  });

  it('allows Member 2 to only delete Label 2 and not Label 1 or preset labels', () => {
    const handleDelete = vi.fn();

    render(
      <LabelsPopover
        isOpen={true}
        onClose={vi.fn()}
        anchorRef={{ current: document.createElement('div') }}
        boardLabels={sampleBoardLabels}
        cardLabels={[]}
        onToggleLabel={vi.fn()}
        onCreateBoardLabel={vi.fn()}
        onDeleteBoardLabel={handleDelete}
        currentUser={{ id: 202, name: 'Member 2' }}
        userRole={{ name: 'Team Member', rank: 40 }}
      />
    );

    // Dustbin for Member 2's label should exist
    const deleteBtnMember2 = screen.getByLabelText('Delete custom label Label 2 (by Member 2)');
    expect(deleteBtnMember2).toBeDefined();

    // Dustbin for Member 1's label should NOT exist
    const deleteBtnMember1 = screen.queryByLabelText('Delete custom label Label 1 (by Member 1)');
    expect(deleteBtnMember1).toBeNull();

    // Dustbin for preset label 'Feature' should NOT exist
    const deleteBtnPreset = screen.queryByLabelText('Delete custom label Feature');
    expect(deleteBtnPreset).toBeNull();

    // Clicking dustbin deletes Member 2's label
    fireEvent.click(deleteBtnMember2);
    expect(handleDelete).toHaveBeenCalledWith(20);
  });

  it('allows Project Manager to delete all custom created labels', async () => {
    const handleDelete = vi.fn();

    render(
      <LabelsPopover
        isOpen={true}
        onClose={vi.fn()}
        anchorRef={{ current: document.createElement('div') }}
        boardLabels={sampleBoardLabels}
        cardLabels={[]}
        onToggleLabel={vi.fn()}
        onCreateBoardLabel={vi.fn()}
        onDeleteBoardLabel={handleDelete}
        currentUser={{ id: 50, name: 'PM Dan' }}
        userRole={{ name: 'Project Manager', rank: 60 }}
      />
    );

    // PM can delete Member 1's custom label
    const deleteBtn1 = screen.getByLabelText('Delete custom label Label 1 (by Member 1)');
    expect(deleteBtn1).toBeDefined();

    // PM can delete Member 2's custom label
    const deleteBtn2 = screen.getByLabelText('Delete custom label Label 2 (by Member 2)');
    expect(deleteBtn2).toBeDefined();

    fireEvent.click(deleteBtn1);
    expect(handleDelete).toHaveBeenCalledWith(10);

    // Wait for delete state to reset
    await waitFor(() => {
      expect(deleteBtn2).not.toBeDisabled();
    });

    fireEvent.click(deleteBtn2);
    expect(handleDelete).toHaveBeenCalledWith(20);
  });

  it('allows Admin and Owner to delete all custom created labels', () => {
    const handleDelete = vi.fn();

    const { rerender } = render(
      <LabelsPopover
        isOpen={true}
        onClose={vi.fn()}
        anchorRef={{ current: document.createElement('div') }}
        boardLabels={sampleBoardLabels}
        cardLabels={[]}
        onToggleLabel={vi.fn()}
        onCreateBoardLabel={vi.fn()}
        onDeleteBoardLabel={handleDelete}
        currentUser={{ id: 2, name: 'Admin Adam' }}
        userRole={{ name: 'Admin', rank: 80 }}
      />
    );

    expect(screen.getByLabelText('Delete custom label Label 1 (by Member 1)')).toBeDefined();
    expect(screen.getByLabelText('Delete custom label Label 2 (by Member 2)')).toBeDefined();

    // Rerender as Owner
    rerender(
      <LabelsPopover
        isOpen={true}
        onClose={vi.fn()}
        anchorRef={{ current: document.createElement('div') }}
        boardLabels={sampleBoardLabels}
        cardLabels={[]}
        onToggleLabel={vi.fn()}
        onCreateBoardLabel={vi.fn()}
        onDeleteBoardLabel={handleDelete}
        currentUser={{ id: 1, name: 'Owner Olivia' }}
        userRole={{ name: 'Owner', rank: 100 }}
      />
    );

    expect(screen.getByLabelText('Delete custom label Label 1 (by Member 1)')).toBeDefined();
    expect(screen.getByLabelText('Delete custom label Label 2 (by Member 2)')).toBeDefined();
  });
});
