import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const MinimalDragTest: React.FC = () => {
  const handleDragEnd = (result: any) => {
    console.log('🎯 MINIMAL DRAG TEST - Drag result:', result);
    
    if (!result.destination) {
      console.log('❌ No destination - drag cancelled');
      alert('No destination detected!');
      return;
    }

    console.log('✅ Drop successful!');
    alert(`Drop successful!\nFrom: ${result.source.droppableId}\nTo: ${result.destination.droppableId}`);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Minimal Drag Test</h1>
      <p>Try dragging the items below to the drop zone on the right.</p>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', gap: '20px' }}>
          {/* Draggable Items */}
          <div style={{ width: '200px' }}>
            <h3>Draggable Items</h3>
            <Droppable droppableId="source">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    minHeight: '200px',
                    padding: '10px',
                    backgroundColor: snapshot.isDraggingOver ? '#f0f0f0' : '#ffffff',
                    border: '2px dashed #ccc',
                  }}
                >
                  <Draggable draggableId="1" index={0}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={{
                          padding: '10px',
                          marginBottom: '10px',
                          backgroundColor: snapshot.isDragging ? '#e3f2fd' : '#ffffff',
                          border: '1px solid #ddd',
                          cursor: 'grab',
                          ...provided.draggableProps.style,
                        }}
                      >
                        Task 1
                      </div>
                    )}
                  </Draggable>
                  <Draggable draggableId="2" index={1}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={{
                          padding: '10px',
                          marginBottom: '10px',
                          backgroundColor: snapshot.isDragging ? '#e3f2fd' : '#ffffff',
                          border: '1px solid #ddd',
                          cursor: 'grab',
                          ...provided.draggableProps.style,
                        }}
                      >
                        Task 2
                      </div>
                    )}
                  </Draggable>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          {/* Drop Zone */}
          <div style={{ width: '200px' }}>
            <h3>Drop Zone</h3>
            <Droppable droppableId="destination">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    minHeight: '200px',
                    padding: '10px',
                    backgroundColor: snapshot.isDraggingOver ? '#e3f2fd' : '#f8f8f8',
                    border: snapshot.isDraggingOver ? '3px dashed #2196f3' : '2px solid #ddd',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ color: '#666' }}>
                    {snapshot.isDraggingOver ? 'Drop here!' : 'Drop Zone'}
                  </div>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </div>
      </DragDropContext>
    </div>
  );
};

export default MinimalDragTest;
