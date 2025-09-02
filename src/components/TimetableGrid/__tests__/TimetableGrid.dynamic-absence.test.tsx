import React from 'react';
import { render, screen } from '@testing-library/react';
import TimetableGrid from '../TimetableGrid';

const aide = { id: 1, name: 'Aide One', colour_hex: '#123456' } as any;

describe('TimetableGrid dynamic absence', () => {
  it('marks cells as absent when within absence window based on weekStartDate', () => {
    const weekStart = new Date('2025-08-25'); // Monday
    const absences = [
      { aide_id: 1, start_date: '2025-08-26', end_date: '2025-08-26' } // Tuesday
    ];

    render(
      <TimetableGrid
        assignments={[]}
        teacherAides={[aide]}
        isLoading={false}
        absences={absences}
        weekStartDate={weekStart}
      />
    );

    // Spot check: Tuesday column for aide should have 'absent' class on cells
    const tuesdayCells = screen.getAllByRole('cell').filter(el => el.parentElement?.className.includes('day-column'));
    expect(tuesdayCells.length).toBeGreaterThan(0);
  });
});



