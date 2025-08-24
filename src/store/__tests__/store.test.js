import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { vi } from 'vitest';
import { store } from '../index';
import { fetchAides } from '../slices/aidesSlice';
import { fetchTasks } from '../slices/tasksSlice';
import { fetchAssignments } from '../slices/assignmentsSlice';

// Mock API responses
const mockAides = [
  { id: 1, name: 'John Doe', email: 'john@example.com' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
];

const mockTasks = [
  { id: 1, title: 'Morning Duty', category: 'PLAYGROUND' },
  { id: 2, title: 'Class Support', category: 'CLASS_SUPPORT' }
];

const mockAssignments = [
  { id: 1, task_id: 1, aide_id: 1, date: '2024-03-20' },
  { id: 2, task_id: 2, aide_id: 2, date: '2024-03-20' }
];

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn((url) => {
      if (url.includes('/teacher-aides')) {
        return Promise.resolve({ data: mockAides });
      }
      if (url.includes('/tasks')) {
        return Promise.resolve({ data: mockTasks });
      }
      if (url.includes('/assignments')) {
        return Promise.resolve({ data: mockAssignments });
      }
      return Promise.reject(new Error('Not found'));
    })
  }
}));

describe('Redux Store', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );

  describe('Aides Slice', () => {
    it('fetches and stores aides', async () => {
      const { result } = renderHook(() => store.getState().aides, { wrapper });
      
      await act(async () => {
        await store.dispatch(fetchAides());
      });
      
      expect(result.current.items).toEqual(mockAides);
      expect(result.current.status).toBe('succeeded');
      expect(result.current.error).toBeNull();
    });
  });

  describe('Tasks Slice', () => {
    it('fetches and stores tasks', async () => {
      const { result } = renderHook(() => store.getState().tasks, { wrapper });
      
      await act(async () => {
        await store.dispatch(fetchTasks());
      });
      
      expect(result.current.items).toEqual(mockTasks);
      expect(result.current.status).toBe('succeeded');
      expect(result.current.error).toBeNull();
    });
  });

  describe('Assignments Slice', () => {
    it('fetches and stores assignments', async () => {
      const { result } = renderHook(() => store.getState().assignments, { wrapper });
      
      await act(async () => {
        await store.dispatch(fetchAssignments());
      });
      
      expect(result.current.items).toEqual(mockAssignments);
      expect(result.current.status).toBe('succeeded');
      expect(result.current.error).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('handles API errors correctly', async () => {
      // Mock axios to reject
      const axios = await import('axios');
      vi.spyOn(axios.default, 'get').mockRejectedValueOnce(new Error('API Error'));
      
      const { result } = renderHook(() => store.getState().aides, { wrapper });
      
      await act(async () => {
        await store.dispatch(fetchAides());
      });
      
      expect(result.current.status).toBe('failed');
      expect(result.current.error).toBeTruthy();
      expect(result.current.items).toEqual([]);
    });
  });
}); 