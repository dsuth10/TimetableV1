import React from 'react';
import { Snackbar, Alert, AlertColor, Box } from '@mui/material';
import { useUIStore } from '@/store';

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useUIStore();

  const handleClose = (id: string) => {
    removeToast(id);
  };

  return (
    <Box>
      {toasts.map((toast) => (
        <Snackbar
          key={toast.id}
          open={true}
          autoHideDuration={toast.duration || 5000}
          onClose={() => handleClose(toast.id)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{ mt: 1 }}
        >
          <Alert
            onClose={() => handleClose(toast.id)}
            severity={toast.type as AlertColor}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      ))}
    </Box>
  );
};

export default ToastContainer;
