import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Typography, CircularProgress } from '@mui/material';
import { fetchAides } from '../store/slices/aidesSlice';

function AideManagement() {
  const dispatch = useDispatch();
  const { items: aides, status, error } = useSelector((state) => state.aides);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchAides());
    }
  }, [status, dispatch]);

  if (status === 'loading') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (status === 'failed') {
    return (
      <Box>
        <Typography color="error">Error: {error}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Teacher Aide Management
      </Typography>
      <Typography>Total Aides: {aides.length}</Typography>
    </Box>
  );
}

export default AideManagement; 