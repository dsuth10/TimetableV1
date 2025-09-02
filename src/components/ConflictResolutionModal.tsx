import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  Stack,
  Avatar
} from '@mui/material';
import {
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Category as CategoryIcon,
  AccessTime as TimeIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';
import { Assignment } from '../types/assignment';

interface ConflictResolutionModalProps {
  open: boolean;
  onClose: () => void;
  onResolve: (resolution: 'replace' | 'cancel') => void;
  conflictDetails: {
    conflictingAssignment: Assignment;
    newAssignmentData: Partial<Assignment>;
    originalAssignment: Assignment;
  } | null;
  isResolving?: boolean;
}

const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({ 
  open, 
  onClose, 
  onResolve, 
  conflictDetails,
  isResolving = false
}) => {
  if (!conflictDetails) return null;

  const { conflictingAssignment, newAssignmentData, originalAssignment } = conflictDetails;

  // Helper function to format time
  const formatTime = (time: string) => {
    if (!time) return 'N/A';
    // Remove seconds if present and ensure HH:MM format
    return time.split(':').slice(0, 2).join(':');
  };

  // Helper function to get day name from date
  const getDayName = (date: string) => {
    if (!date) return 'N/A';
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayIndex = new Date(date).getDay();
    return dayNames[dayIndex];
  };

  // Helper function to get category color
  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'ACADEMIC': '#1976d2',
      'BEHAVIORAL': '#d32f2f',
      'PHYSICAL': '#388e3c',
      'SOCIAL': '#f57c00',
      'ADMINISTRATIVE': '#7b1fa2',
      'OTHER': '#757575'
    };
    return colors[category.toUpperCase()] || '#757575';
  };

  const titleId = 'conflict-resolution-title';
  const descriptionId = 'conflict-resolution-description';

  return (
    <Dialog 
      open={open} 
      onClose={isResolving ? undefined : onClose}
      maxWidth="md" 
      fullWidth
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      disableEscapeKeyDown={isResolving}
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
        }
      }}
    >
      <DialogTitle id={titleId} sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'warning.main', width: 48, height: 48 }}>
            <WarningIcon fontSize="large" />
          </Avatar>
          <Box>
            <Typography variant="h5" color="error.main" fontWeight="bold">
              Scheduling Conflict Detected
            </Typography>
            <Typography variant="body2" color="text.secondary">
              There's already an assignment scheduled for this time slot
            </Typography>
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent id={descriptionId} sx={{ pt: 2 }}>
        {/* Conflict Summary Alert */}
        <Alert 
          severity="warning" 
          icon={<ScheduleIcon />}
          sx={{ 
            mb: 3,
            '& .MuiAlert-message': { fontWeight: 500 }
          }}
        >
          <Typography variant="body1" fontWeight="bold">
            Time Slot Conflict: {formatTime(conflictingAssignment.start_time)} - {formatTime(conflictingAssignment.end_time)}
          </Typography>
          <Typography variant="body2">
            {getDayName(conflictingAssignment.date)} • {conflictingAssignment.date}
          </Typography>
        </Alert>

        {/* Current Assignment Details */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon color="primary" />
            Current Assignment
          </Typography>
          <Box sx={{ 
            p: 3, 
            bgcolor: 'grey.50', 
            borderRadius: 2, 
            border: '2px solid',
            borderColor: 'grey.300',
            position: 'relative'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Avatar sx={{ bgcolor: getCategoryColor(conflictingAssignment.task_category), width: 40, height: 40 }}>
                <CategoryIcon />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" fontWeight="bold" color="text.primary" gutterBottom>
                  {conflictingAssignment.task_title}
                </Typography>
                
                <Stack direction="row" spacing={3} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TimeIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {formatTime(conflictingAssignment.start_time)} - {formatTime(conflictingAssignment.end_time)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {getDayName(conflictingAssignment.date)}
                    </Typography>
                  </Box>
                </Stack>

                <Chip 
                  label={conflictingAssignment.task_category} 
                  size="medium"
                  sx={{ 
                    bgcolor: getCategoryColor(conflictingAssignment.task_category),
                    color: 'white',
                    fontWeight: 500
                  }}
                />
              </Box>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* New Assignment Details */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ScheduleIcon color="secondary" />
            New Assignment
          </Typography>
          <Box sx={{ 
            p: 3, 
            bgcolor: 'primary.50', 
            borderRadius: 2, 
            border: '2px solid',
            borderColor: 'primary.200',
            position: 'relative'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Avatar sx={{ bgcolor: getCategoryColor(newAssignmentData.task_category || 'OTHER'), width: 40, height: 40 }}>
                <CategoryIcon />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" fontWeight="bold" color="primary.main" gutterBottom>
                  {newAssignmentData.task_title}
                </Typography>
                
                <Stack direction="row" spacing={3} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TimeIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {formatTime(newAssignmentData.start_time || '')} - {formatTime(newAssignmentData.end_time || '')}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {getDayName(newAssignmentData.date || '')}
                    </Typography>
                  </Box>
                </Stack>

                <Chip 
                  label={newAssignmentData.task_category || 'Unknown'} 
                  size="medium"
                  sx={{ 
                    bgcolor: getCategoryColor(newAssignmentData.task_category || 'OTHER'),
                    color: 'white',
                    fontWeight: 500
                  }}
                />
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Resolution Options */}
        <Box sx={{ 
          p: 3, 
          bgcolor: 'info.50', 
          borderRadius: 2, 
          border: '1px solid',
          borderColor: 'info.200'
        }}>
          <Typography variant="h6" gutterBottom color="info.main">
            How would you like to resolve this conflict?
          </Typography>
          
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Box sx={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                bgcolor: 'error.main',
                mt: 0.5,
                flexShrink: 0
              }} />
              <Box>
                <Typography variant="body1" fontWeight="bold" color="error.main">
                  Replace Current Assignment
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  The current assignment will be moved to the unassigned tasks panel, and the new assignment will take its place.
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              <Box sx={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                bgcolor: 'grey.500',
                mt: 0.5,
                flexShrink: 0
              }} />
              <Box>
                <Typography variant="body1" fontWeight="bold" color="text.secondary">
                  Cancel
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Keep the current assignment and cancel the new assignment. No changes will be made.
                </Typography>
              </Box>
            </Box>
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button 
          onClick={onClose} 
          variant="outlined" 
          color="inherit"
          size="large"
          sx={{ minWidth: 120 }}
          disabled={isResolving}
        >
          Cancel
        </Button>
        <Button 
          onClick={() => onResolve('replace')} 
          variant="contained" 
          color="primary"
          size="large"
          startIcon={<ScheduleIcon />}
          sx={{ 
            minWidth: 200,
            bgcolor: 'error.main',
            '&:hover': {
              bgcolor: 'error.dark'
            }
          }}
          disabled={isResolving}
        >
          {isResolving ? 'Resolving…' : 'Replace Current Assignment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConflictResolutionModal;
