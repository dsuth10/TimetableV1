/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    intercept(method: string, url: string, response: any): Chainable;
  }
}

import { Assignment } from '../../src/types';

describe('Schedule', () => {
  beforeEach(() => {
    // Mock API responses
    cy.intercept('GET', '/api/assignments', {
      statusCode: 200,
      body: [
        {
          id: 1,
          task_title: 'Morning Playground Supervision',
          task_category: 'SUPERVISION',
          start_time: '08:00:00',
          end_time: '08:30:00',
          day: null,
          time_slot: null,
          status: 'UNASSIGNED',
          teacher_aide_id: null,
          classroom_name: 'Playground'
        }
      ]
    }).as('getAssignments');

    cy.intercept('GET', '/api/teacher-aides', {
      statusCode: 200,
      body: [
        {
          id: 1,
          name: 'Sarah Johnson',
          email: 'sarah.johnson@school.edu',
          status: 'ACTIVE'
        }
      ]
    }).as('getTeacherAides');

    cy.intercept('PUT', '/api/assignments/1', {
      statusCode: 200,
      body: {
        id: 1,
        task_title: 'Morning Playground Supervision',
        task_category: 'SUPERVISION',
        start_time: '08:00:00',
        end_time: '08:30:00',
        day: 'Monday',
        time_slot: '8:00',
        status: 'ASSIGNED',
        teacher_aide_id: 1,
        classroom_name: 'Playground'
      }
    }).as('updateAssignment');

    cy.visit('/schedule');
    cy.wait(['@getAssignments', '@getTeacherAides']);
  });

  it('should allow dragging an unassigned task to a time slot', () => {
    // Wait for the schedule to load
    cy.get('[data-testid="schedule-container"]').should('exist');
    
    // Verify the unassigned task exists in the unassigned list
    cy.get('[data-cy=unassigned-tasks-list]').contains('Morning Playground Supervision').should('exist');

    // Drag the unassigned task to the time slot
    cy.get('[data-cy=unassigned-tasks-list]').contains('Morning Playground Supervision').drag('[data-testid="time-slot-Monday-8:00"]');

    // Wait for the API call to complete
    cy.wait('@updateAssignment').its('response.statusCode').should('eq', 200);

    // Add a small wait for the UI to update
    cy.wait(500);

    // Verify the task is no longer in the unassigned list
    cy.get('[data-cy=unassigned-tasks-list]').contains('Morning Playground Supervision').should('not.exist');
    
    // Verify the task now exists in the time slot
    cy.get('[data-testid="time-slot-Monday-8:00"]')
      .contains('Morning Playground Supervision')
      .should('exist');
  });
});
