import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Divider } from '@mui/material';
import type { Assignment } from '../types';

interface ConflictResolutionModalProps {
  open: boolean;
  onClose: () => void;
  onResolve: (action: 'replace' | 'cancel') => void;
  conflictingAssignment: Assignment;
  newAssignmentData: Partial<Assignment>;
}

const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  open,
  onClose,
  onResolve,
  conflictingAssignment,
  newAssignmentData,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Conflict Detected!</DialogTitle>
      <DialogContent dividers>
        <Typography variant="subtitle1" gutterBottom>
          There's a scheduling conflict for Aide: {newAssignmentData.aide_id} on {newAssignmentData.date} at {newAssignmentData.start_time}.
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          You are trying to assign "{newAssignmentData.task_title}" to this slot, but it conflicts with an existing assignment.
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-around', my: 2 }}>
          <Box sx={{ flex: 1, mr: 1, p: 1, border: '1px solid #ccc', borderRadius: '4px' }}>
            <Typography variant="h6" color="error" gutterBottom>
              Conflicting Assignment
            </Typography>
            <Typography variant="body1">
              <strong>Task:</strong> {conflictingAssignment.task_title}
            </Typography>
            <Typography variant="body2">
              <strong>Time:</strong> {conflictingAssignment.start_time} - {conflictingAssignment.end_time}
            </Typography>
            <Typography variant="body2">
              <strong>Category:</strong> {conflictingAssignment.task_category}
            </Typography>
            {conflictingAssignment.notes && (
              <Typography variant="caption">
                <strong>Notes:</strong> {conflictingAssignment.notes}
              </Typography>
            )}
          </Box>

          <Divider orientation="vertical" flexItem />

          <Box sx={{ flex: 1, ml: 1, p: 1, border: '1px solid #ccc', borderRadius: '4px' }}>
            <Typography variant="h6" color="primary" gutterBottom>
              New Assignment
            </Typography>
            <Typography variant="body1">
              <strong>Task:</strong> {newAssignmentData.task_title}
            </Typography>
            <Typography variant="body2">
              <strong>Time:</strong> {newAssignmentData.start_time} - {newAssignmentData.end_time}
            </Typography>
            <Typography variant="body2">
              <strong>Category:</strong> {newAssignmentData.task_category}
            </Typography>
            {newAssignmentData.notes && (
              <Typography variant="caption">
                <strong>Notes:</strong> {newAssignmentData.notes}
              </Typography>
            )}
          </Box>
        </Box>

        <Typography variant="body1" mt={2}>
          Do you want to replace the existing assignment with the new one?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onResolve('cancel')} color="secondary">
          Cancel
        </Button>
        <Button onClick={() => onResolve('replace')} variant="contained" color="primary">
          Replace
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConflictResolutionModal;
