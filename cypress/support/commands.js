Cypress.Commands.add('dragAndDropDnd', (subjectSelector, targetSelector) => {
  // Get the subject (draggable)
  cy.get(subjectSelector)
    .trigger('mousedown', { which: 1, force: true })
    .trigger('dragstart', { force: true });

  // Get the target (droppable)
  cy.get(targetSelector)
    .trigger('dragenter', { force: true })
    .trigger('dragover', { force: true })
    .trigger('drop', { force: true });

  // Release the mouse
  cy.get(subjectSelector).trigger('mouseup', { force: true });
}); 