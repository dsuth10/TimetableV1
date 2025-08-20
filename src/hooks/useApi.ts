import { useState, useCallback } from 'react';
import { useUIStore } from '@/store';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: any[]) => Promise<T | null>;
  reset: () => void;
}

export function useApi<T = any>(
  apiFunction: (...args: any[]) => Promise<T>,
  options?: {
    onSuccess?: (data: T) => void;
    onError?: (error: string) => void;
    showToast?: boolean;
  }
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const { addToast } = useUIStore();

  const execute = useCallback(
    async (...args: any[]): Promise<T | null> => {
      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const result = await apiFunction(...args);
        setState({ data: result, loading: false, error: null });
        
        if (options?.onSuccess) {
          options.onSuccess(result);
        }
        
        if (options?.showToast) {
          addToast({
            message: 'Operation completed successfully',
            type: 'success',
          });
        }
        
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An error occurred';
        setState({ data: null, loading: false, error: errorMessage });
        
        if (options?.onError) {
          options.onError(errorMessage);
        }
        
        if (options?.showToast) {
          addToast({
            message: errorMessage,
            type: 'error',
          });
        }
        
        return null;
      }
    },
    [apiFunction, options, addToast]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}
