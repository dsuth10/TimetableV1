/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    intercept(method: string, url: string, response: any): Chainable;
  }
}

import { Assignment } from '../../src/types';

describe('Schedule', () => {
  beforeEach(() => {
    // Mock API responses (use globs to match optional query strings)
    cy.intercept('GET', '/api/assignments**', {
      statusCode: 200,
      body: [
        {
          id: 1,
          task_title: 'Morning Playground Supervision',
          task_category: 'SUPERVISION',
          start_time: '08:00',
          end_time: '08:30',
          status: 'UNASSIGNED',
          aide_id: null
        }
      ]
    }).as('getAssignments');

    cy.intercept('GET', '/api/teacher-aides**', {
      statusCode: 200,
      body: [
        {
          id: 1,
          name: 'Sarah Johnson'
        }
      ]
    }).as('getTeacherAides');

    cy.intercept('GET', '/api/absences**', { statusCode: 200, body: [] }).as('getAbsences');

    // Use wildcard for assignment id updates
    cy.intercept('PUT', '/api/assignments/*', {
      statusCode: 200,
      body: {
        id: 1,
        task_title: 'Morning Playground Supervision',
        task_category: 'SUPERVISION',
        start_time: '08:00',
        end_time: '08:30',
        status: 'ASSIGNED',
        aide_id: 1
      }
    }).as('updateAssignment');

    cy.visit('/');
    cy.wait(['@getAssignments', '@getTeacherAides', '@getAbsences']);
  });

  it('should allow dragging an unassigned task to a time slot', () => {
    cy.contains('Schedule', { matchCase: false, timeout: 10000 }).should('exist');
    // Ensure week header renders before interacting
    cy.contains('Week of', { matchCase: false, timeout: 10000 }).should('exist');

    // Verify the unassigned assignment item exists by test id
    // Support either task or assignment kind in right panel
    cy.get('[data-testid="unassigned-assignment-1"], [data-testid="unassigned-task-1"]', { timeout: 10000 }).should('exist');

    // Drag the unassigned task to the Monday 08:00 slot for aide id 1
    cy.dragAndDropDnd('[data-testid="unassigned-assignment-1"], [data-testid="unassigned-task-1"]', '[data-testid="time-slot-1-Monday-08:00"]');

    // Allow UI to update optimistically
    cy.wait(300);

    // Verify the task now exists in the time slot
    cy.get('[data-testid="time-slot-1-Monday-08:00"]').find('[data-testid="assignment-1"]').should('exist');
  });
});
