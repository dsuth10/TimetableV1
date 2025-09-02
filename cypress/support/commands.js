Cypress.Commands.add('dragAndDropDnd', (subjectSelector, targetSelector) => {
  // Ensure both elements exist
  cy.get(subjectSelector, { timeout: 10000 }).should('exist');
  cy.get(targetSelector, { timeout: 10000 }).should('exist');

  // Use precise mouse events with element center coordinates
  cy.get(subjectSelector).then(($subject) => {
    const subject = $subject[0];
    const subjectRect = subject.getBoundingClientRect();
    const startX = subjectRect.left + subjectRect.width / 2;
    const startY = subjectRect.top + subjectRect.height / 2;

    cy.get(targetSelector).then(($target) => {
      const target = $target[0];
      const targetRect = target.getBoundingClientRect();
      const endX = targetRect.left + targetRect.width / 2;
      const endY = targetRect.top + targetRect.height / 2;
      const dataTransfer = new DataTransfer();

      // Start drag
      cy.wrap($subject)
        .trigger('pointerdown', { button: 0, clientX: startX, clientY: startY, force: true })
        .trigger('mousedown', { which: 1, clientX: startX, clientY: startY, force: true })
        .trigger('dragstart', { dataTransfer, force: true });

      // Move over target
      cy.get('body')
        .trigger('mousemove', { clientX: endX, clientY: endY, force: true })
        .trigger('pointermove', { clientX: endX, clientY: endY, force: true });

      cy.wrap($target)
        .trigger('dragenter', { dataTransfer, force: true })
        .trigger('dragover', { dataTransfer, force: true })
        .trigger('drop', { dataTransfer, force: true });

      // End drag
      cy.get('body')
        .trigger('mouseup', { clientX: endX, clientY: endY, force: true })
        .trigger('pointerup', { clientX: endX, clientY: endY, force: true });

      // Fire dragend on subject to finalize DnD lifecycle
      cy.wrap($subject).trigger('dragend', { dataTransfer, force: true });

      cy.wait(200);
    });
  });
});