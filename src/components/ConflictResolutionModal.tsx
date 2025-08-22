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
  Chip
} from '@mui/material';
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
}

const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({ 
  open, 
  onClose, 
  onResolve, 
  conflictDetails 
}) => {
  if (!conflictDetails) return null;

  const { conflictingAssignment, newAssignmentData, originalAssignment } = conflictDetails;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6" color="error">
          ⚠️ Scheduling Conflict Detected
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          There is already an assignment scheduled for this time slot.
        </Alert>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Current Assignment:
          </Typography>
          <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, mb: 2 }}>
            <Typography variant="body1" fontWeight="bold">
              {conflictingAssignment.task_title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {conflictingAssignment.day} at {conflictingAssignment.start_time} - {conflictingAssignment.end_time}
            </Typography>
            <Chip 
              label={conflictingAssignment.task_category} 
              size="small" 
              sx={{ mt: 1 }}
            />
          </Box>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            New Assignment:
          </Typography>
          <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
            <Typography variant="body1" fontWeight="bold">
              {newAssignmentData.task_title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {newAssignmentData.day} at {newAssignmentData.start_time} - {newAssignmentData.end_time}
            </Typography>
            <Chip 
              label={newAssignmentData.task_category} 
              size="small" 
              sx={{ mt: 1 }}
            />
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary">
          Choose how to resolve this conflict:
        </Typography>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button 
          onClick={() => onResolve('replace')} 
          variant="contained" 
          color="primary"
        >
          Replace Current Assignment
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConflictResolutionModal;
