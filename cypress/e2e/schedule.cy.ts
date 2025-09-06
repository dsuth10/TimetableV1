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
    cy.intercept('GET', '**/api/assignments**', {
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

    cy.intercept('GET', '**/api/teacher-aides**', {
      statusCode: 200,
      body: [
        {
          id: 1,
          name: 'Sarah Johnson'
        }
      ]
    }).as('getTeacherAides');

    cy.intercept('GET', '**/api/absences**', { statusCode: 200, body: [] }).as('getAbsences');

    // Additional stubs to fully isolate frontend
    cy.intercept('GET', '**/api/tasks**', {
      statusCode: 200,
      body: { tasks: [] },
    }).as('getTasks');

    cy.intercept('GET', '**/api/classrooms**', { statusCode: 200, body: [] }).as('getClassrooms');
    cy.intercept('GET', '**/api/school-classes**', { statusCode: 200, body: [] }).as('getSchoolClasses');

    // Stub creation as well, in case a Task -> Assignment path is exercised
    cy.intercept('POST', '**/api/assignments', (req) => {
      const body = req.body || {};
      req.reply({
        statusCode: 201,
        body: {
          id: 2,
          task_title: 'Created from Task',
          task_category: 'GENERAL',
          start_time: body.start_time || '08:00',
          end_time: body.end_time || '08:30',
          status: 'ASSIGNED',
          aide_id: body.aide_id || 1,
        },
      });
    }).as('createAssignment');

    // Use wildcard for assignment id updates
    cy.intercept('PUT', '**/api/assignments/*', (req) => {
      const body = req.body || {};
      req.reply({
        statusCode: 200,
        body: {
          id: Number((req.url.split('/').pop() || '1').split('?')[0]) || 1,
          task_title: 'Morning Playground Supervision',
          task_category: 'SUPERVISION',
          start_time: body.start_time || '08:00',
          end_time: body.end_time || '08:30',
          status: body.status || 'ASSIGNED',
          aide_id: body.aide_id ?? 1,
          date: body.date || new Date().toISOString().split('T')[0],
        },
      });
    }).as('updateAssignment');

    cy.visit('/schedule?e2e=1');
    cy.wait(['@getAssignments', '@getTeacherAides', '@getAbsences', '@getTasks']);
  });

  it('should allow dragging an unassigned task to a time slot', () => {
    // Ensure the test harness in the app is ready before invoking helpers
    cy.window({ timeout: 20000 }).should((win: any) => {
      expect(!!win.__harnessReady, 'harness ready flag').to.eq(true);
    });
    // Ensure assignments have been set in the app before triggering the move
    cy.window({ timeout: 20000 })
      .its('__assignments')
      .should((assignments: any[]) => {
        expect(Array.isArray(assignments), 'assignments array ready').to.eq(true);
        const exists = assignments.some((x: any) => x?.id === 1);
        expect(exists, 'assignment id 1 present').to.eq(true);
      });
    // Dispatch the custom event harness to invoke onDragEnd path
    cy.window({ timeout: 20000 }).then((win: any) => {
      const helper = win.__assignToSlot || win.__triggerDrop;
      if (typeof helper === 'function') {
        return helper(1, '1-Monday-08:00');
      }
      const detail = {
        draggableId: 'assignment-1',
        source: { droppableId: 'unassigned', index: 0 },
        destination: { droppableId: '1-Monday-08:00', index: 0 },
        reason: 'DROP',
        type: 'DEFAULT',
      };
      win.dispatchEvent(new CustomEvent('test-drop', { detail }));
    });
    // Wait for the PUT update to complete so state propagates
    cy.wait('@updateAssignment');
    // Assert via exposed window assignments (optimistic update)
    cy.window({ timeout: 15000 })
      .its('__assignments')
      .should((assignments: any[]) => {
        const a = Array.isArray(assignments) ? assignments.find(x => x?.id === 1) : null;
        expect(!!a, 'assignment id 1 exists').to.eq(true);
        expect(a?.status, 'assignment status').to.eq('ASSIGNED');
        expect(a?.aide_id, 'assignment aide').to.eq(1);
        expect(typeof a?.date, 'assignment date').to.eq('string');
      });
  });
});
