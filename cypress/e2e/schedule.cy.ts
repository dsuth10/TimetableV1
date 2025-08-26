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

    cy.intercept('GET', '/api/teacher-aides**', {
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

    // Optional: absences/classes/tasks if page loads them
    cy.intercept('GET', '/api/absences**', { statusCode: 200, body: [] }).as('getAbsences');
    cy.intercept('GET', '/api/classrooms**', { statusCode: 200, body: [] }).as('getClassrooms');
    cy.intercept('GET', '/api/tasks**', { statusCode: 200, body: [] }).as('getTasks');
    cy.intercept('GET', '/api/school-classes**', { statusCode: 200, body: [] }).as('getSchoolClasses');

    // Use wildcard for assignment id updates
    cy.intercept('PUT', '/api/assignments/*', {
      statusCode: 200,
      body: {
        id: 1, // will be ignored by UI assertion that follows
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

    cy.visit('/');
    // Wait for initial data to load (some endpoints may fire multiple times)
    cy.wait(['@getAssignments', '@getTeacherAides', '@getAbsences']);
  });

  it('should allow dragging an unassigned task to a time slot', () => {
    // Wait for the Schedule heading to render
    cy.contains('Schedule', { matchCase: false, timeout: 10000 }).should('exist');
    
    // Verify the unassigned assignment item exists by test id
    cy.get('[data-testid="unassigned-assignment-1"]', { timeout: 10000 }).should('exist');

    // Drag the unassigned task to the Monday 08:00 slot for aide id 1
    cy.dragAndDropDnd('[data-testid="unassigned-assignment-1"]', '[data-testid="time-slot-1-Monday-08:00"]');

    // Wait for the API call to complete
    cy.wait('@updateAssignment', { timeout: 10000 }).its('response.statusCode').should('be.oneOf', [200, 201]);

    // Add a small wait for the UI to update
    cy.wait(500);

    // Verify the unassigned item is no longer in the list
    cy.get('[data-testid="unassigned-assignment-1"]').should('not.exist');
    
    // Verify the task now exists in the time slot
    cy.get('[data-testid="time-slot-1-Monday-08:00"]')
      .find('[data-testid="assignment-1"]').should('exist');
  });
});
