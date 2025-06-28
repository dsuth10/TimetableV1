import React from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import { Box, Paper, Typography, CircularProgress } from '@mui/material';
import { Assignment } from '../types/assignment';
import { format, parseISO } from 'date-fns';

const DAYS = ['MO', 'TU', 'WE', 'TH', 'FR'];
const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30'
];

interface TimetableViewProps {
  assignments: Assignment[];
  isLoading?: boolean;
}

const TimetableView: React.FC<TimetableViewProps> = ({ assignments, isLoading }) => {
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  // Convert assignments to the format needed for the timetable
  const timetableAssignments = assignments.map(assignment => {
    const date = parseISO(assignment.date);
    const dayIndex = date.getDay();
    const day = DAYS[dayIndex - 1]; // Convert 1-5 to MO-FR
    const time = assignment.start_time.split(':').slice(0, 2).join(':'); // Remove seconds
    return {
      ...assignment,
      date: `${day}-${time}`,
    };
  });

  console.log('Timetable assignments:', timetableAssignments);

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <Typography variant="h5" gutterBottom>
        Weekly Schedule
      </Typography>
      
      <Box display="flex" gap={2}>
        {/* Time slots column */}
        <Box width={100}>
          {TIME_SLOTS.map(time => (
            <Box key={time} height={60} display="flex" alignItems="center">
              <Typography variant="caption">{time}</Typography>
            </Box>
          ))}
        </Box>

        {/* Days columns */}
        {DAYS.map(day => (
          <Box key={day} flex={1}>
            <Typography variant="subtitle1" align="center" gutterBottom>
              {day}
            </Typography>
            
            {TIME_SLOTS.map(time => {
              const droppableId = `${day}-${time}`;
              const slotAssignments = timetableAssignments.filter(a => a.date === droppableId);
              
              return (
                <Droppable key={droppableId} droppableId={droppableId}>
                  {(provided, snapshot) => (
                    <Box
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      height={60}
                      border="1px solid #e0e0e0"
                      borderRadius={1}
                      mb={1}
                      sx={{
                        backgroundColor: snapshot.isDraggingOver
                          ? 'action.hover'
                          : 'background.paper',
                        transition: 'background-color 0.2s ease-in-out',
                        minHeight: 60,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                        position: 'relative',
                      }}
                    >
                      {slotAssignments.map((assignment, index) => (
                        <Draggable
                          key={assignment.id}
                          draggableId={assignment.id.toString()}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <Paper
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              elevation={snapshot.isDragging ? 3 : 1}
                              sx={{
                                p: 1,
                                mb: 0.5,
                                backgroundColor: 'primary.light',
                                color: 'primary.contrastText',
                                transform: snapshot.isDragging ? 'scale(1.02)' : 'scale(1)',
                                transition: 'all 0.2s ease-in-out',
                                cursor: 'grab',
                                '&:active': {
                                  cursor: 'grabbing',
                                },
                                width: '100%',
                                textAlign: 'center',
                              }}
                            >
                              <Typography variant="caption" noWrap>
                                {assignment.task_title}
                              </Typography>
                              {assignment.aide_name && (
                                <Typography variant="caption" display="block" noWrap>
                                  {assignment.aide_name}
                                </Typography>
                              )}
                            </Paper>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </Box>
                  )}
                </Droppable>
              );
            })}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default TimetableView; 