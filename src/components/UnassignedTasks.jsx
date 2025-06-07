import React from 'react';
import './UnassignedTasks.css';

const UnassignedTasks = ({ tasks = [] }) => (
  <aside className="unassigned-tasks">
    <h3>Unassigned Tasks</h3>
    <div className="task-list">
      {tasks.map(task => (
        <div className="task-card" key={task.id} style={{ borderLeft: `8px solid ${task.color || '#3b82f6'}` }}>
          <div className="task-title">{task.title}</div>
          <div className="task-duration">{task.duration}</div>
        </div>
      ))}
    </div>
  </aside>
);

export default UnassignedTasks; 