Cypress.Commands.add('dragAndDropDnd', (subjectSelector, targetSelector) => {
  // Get the subject (draggable) and ensure it exists
  cy.get(subjectSelector, { timeout: 10000 }).should('exist');
  
  // Get the target (droppable) and ensure it exists
  cy.get(targetSelector, { timeout: 10000 }).should('exist');

  // Perform the drag and drop sequence
  cy.get(subjectSelector)
    .trigger('mousedown', { which: 1, force: true })
    .trigger('dragstart', { force: true });

  cy.get(targetSelector)
    .trigger('dragenter', { force: true })
    .trigger('dragover', { force: true })
    .trigger('drop', { force: true });

  // Release the mouse
  cy.get(subjectSelector).trigger('mouseup', { force: true });
  
  // Wait a moment for the drag end event to process
  cy.wait(100);
}); 