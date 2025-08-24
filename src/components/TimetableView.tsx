import React, { useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Box, Typography, CircularProgress, Menu, MenuItem } from '@mui/material';
import { Assignment } from '../types/assignment';

import { TeacherAide } from '../types';

interface TimetableViewProps {
  assignments: Assignment[];
  teacherAides: TeacherAide[];
  isLoading: boolean;
  onUpdateAssignmentStatus: (assignmentId: number, status: Assignment['status']) => void;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = ['8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];

const TimetableView: React.FC<TimetableViewProps> = ({ assignments = [], isLoading, onUpdateAssignmentStatus }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const open = Boolean(anchorEl);

  const handleRightClick = (event: React.MouseEvent<HTMLDivElement>, assignment: Assignment) => {
    event.preventDefault(); // Prevent default context menu
    setAnchorEl(event.currentTarget);
    setSelectedAssignment(assignment);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setSelectedAssignment(null);
  };

  const handleStatusChange = (status: Assignment['status']) => {
    if (selectedAssignment) {
      onUpdateAssignmentStatus(selectedAssignment.id, status);
    }
    handleClose();
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  // Ensure assignments is always an array
  const safeAssignments = Array.isArray(assignments) ? assignments : [];

  return (
    <Box>
      <Box display="flex" flexDirection="column" gap={2}>
        {/* Header row with days */}
        <Box display="flex">
          <Box width="16.66%" />
          {DAYS.map(day => (
            <Box key={day} width="16.66%" textAlign="center">
              <Typography variant="subtitle1">
                {day}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Time slots and assignments */}
        {TIME_SLOTS.map(timeSlot => (
          <Box key={timeSlot} display="flex">
            <Box width="16.66%" textAlign="right" pr={2}>
              <Typography variant="body2">
                {timeSlot}
              </Typography>
            </Box>
            {DAYS.map(day => (
              <Box key={`${day}-${timeSlot}`} width="16.66%">
                <Droppable droppableId={`${day}-${timeSlot}`}>
                  {(provided, snapshot) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      data-testid={`time-slot-${day}-${timeSlot}`}
                      sx={{
                        minHeight: 60,
                        p: 1,
                        backgroundColor: snapshot.isDraggingOver
                          ? 'action.hover'
                          : 'background.paper',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                      }}
                    >
                      {safeAssignments
                        .filter(
                          a =>
                            a.day === day &&
                            a.time_slot === timeSlot &&
                            a.status === 'ASSIGNED'
                        )
                        .map((assignment, index) => (
                          <Draggable
                            key={assignment.id}
                            draggableId={assignment.id.toString()}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <Box
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                sx={{
                                  p: 1,
                                  mb: 1,
                                  backgroundColor: 'primary.light',
                                  color: 'primary.contrastText',
                                  transform: snapshot.isDragging
                                    ? 'scale(1.02)'
                                    : 'scale(1)',
                                  transition: 'all 0.2s ease-in-out',
                                  cursor: 'context-menu', // Indicate right-clickability
                                  borderRadius: 1,
                                  boxShadow: snapshot.isDragging ? 3 : 1,
                                }}
                                onContextMenu={(event) => handleRightClick(event, assignment)}
                              >
                                <Typography variant="body2" noWrap>
                                  {assignment.task_title}
                                </Typography>
                                <Typography variant="caption" display="block" noWrap>
                                  {assignment.classroom_name}
                                </Typography>
                                <Typography variant="caption" display="block" noWrap color="text.secondary">
                                  Status: {assignment.status}
                                </Typography>
                              </Box>
                            )}
                          </Draggable>
                        ))}
                      {provided.placeholder}
                    </Box>
                  )}
                </Droppable>
              </Box>
            ))}
          </Box>
        ))}
      </Box>

      {/* Status Change Menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'basic-button',
        }}
      >
        <MenuItem onClick={() => handleStatusChange('ASSIGNED')}>Assigned</MenuItem>
        <MenuItem onClick={() => handleStatusChange('IN_PROGRESS')}>In Progress</MenuItem>
        <MenuItem onClick={() => handleStatusChange('COMPLETE')}>Complete</MenuItem>
        <MenuItem onClick={() => handleStatusChange('UNASSIGNED')}>Unassign</MenuItem>
      </Menu>
    </Box>
  );
};

export default TimetableView;
