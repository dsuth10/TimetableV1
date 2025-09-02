import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ConflictResolutionModal from './ConflictResolutionModal';

const baseConflict = {
  conflictingAssignment: {
    id: 1,
    task_id: 1,
    task_title: 'Reading Group',
    task_category: 'ACADEMIC',
    aide_id: 2,
    date: '2025-08-25',
    start_time: '09:00',
    end_time: '09:30',
    status: 'ASSIGNED',
  } as any,
  newAssignmentData: {
    task_id: 2,
    task_title: 'Library Support',
    task_category: 'ADMINISTRATIVE',
    aide_id: 2,
    date: '2025-08-25',
    start_time: '09:00',
    end_time: '09:30',
    status: 'ASSIGNED',
  } as any,
  originalAssignment: {
    id: 99,
    task_id: 2,
    task_title: 'Library Support',
    task_category: 'ADMINISTRATIVE',
    aide_id: null,
    date: '2025-08-25',
    start_time: '09:00',
    end_time: '09:30',
    status: 'UNASSIGNED',
  } as any,
};

describe('ConflictResolutionModal', () => {
  it('renders conflict details and calls onResolve on Replace', () => {
    const onResolve = vi.fn();
    const onClose = vi.fn();

    render(
      <ConflictResolutionModal
        open
        onClose={onClose}
        onResolve={onResolve}
        conflictDetails={baseConflict}
      />
    );

    expect(screen.getByText(/Scheduling Conflict Detected/i)).toBeInTheDocument();
    expect(screen.getByText(/Reading Group/i)).toBeInTheDocument();
    expect(screen.getByText(/Library Support/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Replace Current Assignment/i }));
    expect(onResolve).toHaveBeenCalledWith('replace');
  });

  it('disables actions when isResolving is true', () => {
    const onResolve = vi.fn();
    const onClose = vi.fn();

    render(
      <ConflictResolutionModal
        open
        onClose={onClose}
        onResolve={onResolve}
        conflictDetails={baseConflict}
        isResolving
      />
    );

    const replaceBtn = screen.getByRole('button', { name: /Resolving/i });
    expect(replaceBtn).toBeDisabled();
  });
});



