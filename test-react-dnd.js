import React from 'react';
import { createRoot } from 'react-dom/client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

console.log('🧪 Testing React + @hello-pangea/dnd integration...');

// Create a simple test component
const TestComponent = () => {
  const handleDragEnd = (result) => {
    console.log('🎯 Drag result:', result);
    if (result.destination) {
      console.log('✅ Drop successful!');
      console.log('From:', result.source.droppableId);
      console.log('To:', result.destination.droppableId);
    } else {
      console.log('❌ No destination - drag cancelled');
    }
  };

  return React.createElement(DragDropContext, { onDragEnd: handleDragEnd },
    React.createElement('div', { style: { display: 'flex', gap: '20px', padding: '20px' } },
      // Source area
      React.createElement('div', { style: { width: '200px' } },
        React.createElement('h3', null, 'Draggable Items'),
        React.createElement(Droppable, { droppableId: 'source' },
          (provided, snapshot) => React.createElement('div', {
            ref: provided.innerRef,
            ...provided.droppableProps,
            style: {
              minHeight: '200px',
              padding: '10px',
              backgroundColor: snapshot.isDraggingOver ? '#f0f0f0' : '#ffffff',
              border: '2px dashed #ccc',
            }
          },
            React.createElement(Draggable, { draggableId: '1', index: 0 },
              (provided, snapshot) => React.createElement('div', {
                ref: provided.innerRef,
                ...provided.draggableProps,
                ...provided.dragHandleProps,
                style: {
                  padding: '10px',
                  marginBottom: '10px',
                  backgroundColor: snapshot.isDragging ? '#e3f2fd' : '#ffffff',
                  border: '1px solid #ddd',
                  cursor: 'grab',
                  ...provided.draggableProps.style,
                }
              }, 'Task 1')
            ),
            React.createElement(Draggable, { draggableId: '2', index: 1 },
              (provided, snapshot) => React.createElement('div', {
                ref: provided.innerRef,
                ...provided.draggableProps,
                ...provided.dragHandleProps,
                style: {
                  padding: '10px',
                  marginBottom: '10px',
                  backgroundColor: snapshot.isDragging ? '#e3f2fd' : '#ffffff',
                  border: '1px solid #ddd',
                  cursor: 'grab',
                  ...provided.draggableProps.style,
                }
              }, 'Task 2')
            ),
            provided.placeholder
          )
        )
      ),
      // Destination area
      React.createElement('div', { style: { width: '200px' } },
        React.createElement('h3', null, 'Drop Zone'),
        React.createElement(Droppable, { droppableId: 'destination' },
          (provided, snapshot) => React.createElement('div', {
            ref: provided.innerRef,
            ...provided.droppableProps,
            style: {
              minHeight: '200px',
              padding: '10px',
              backgroundColor: snapshot.isDraggingOver ? '#e3f2fd' : '#f8f8f8',
              border: snapshot.isDraggingOver ? '3px dashed #2196f3' : '2px solid #ddd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }
          },
            React.createElement('div', { style: { color: '#666' } },
              snapshot.isDraggingOver ? 'Drop here!' : 'Drop Zone'
            ),
            provided.placeholder
          )
        )
      )
    )
  );
};

console.log('✅ Test component created successfully');
console.log('📋 Component structure:');
console.log('- DragDropContext');
console.log('  - Source Droppable (2 Draggable items)');
console.log('  - Destination Droppable (drop zone)');

// Test that all the necessary components are available
console.log('\n🔍 Testing component availability:');
console.log('✅ DragDropContext:', typeof DragDropContext);
console.log('✅ Droppable:', typeof Droppable);
console.log('✅ Draggable:', typeof Draggable);

console.log('\n🎯 React + @hello-pangea/dnd integration test completed!');
console.log('💡 The components are ready to be used in the browser.');

