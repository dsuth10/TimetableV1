import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useAidesStore } from '../stores/aidesStore';
import { useTasksStore } from '../stores/tasksStore';
import { useAssignmentsStore } from '../stores/assignmentsStore';

// Mock data
const mockAides = [
  { id: 1, name: 'John Doe', email: 'john@example.com', status: 'ACTIVE' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'ACTIVE' }
];

const mockTasks = [
  { id: 1, title: 'Morning Duty', category: 'PLAYGROUND' },
  { id: 2, title: 'Class Support', category: 'CLASS_SUPPORT' }
];

const mockAssignments = [
  { id: 1, task_id: 1, aide_id: 1, date: '2024-03-20' },
  { id: 2, task_id: 2, aide_id: 2, date: '2024-03-20' }
];

describe('Zustand Stores', () => {
  beforeEach(() => {
    // Reset all stores before each test
    act(() => {
      useAidesStore.getState().setAides([]);
      useAidesStore.getState().setLoading(false);
      useAidesStore.getState().setError(null);
      
      useTasksStore.getState().setTasks([]);
      useTasksStore.getState().setLoading(false);
      useTasksStore.getState().setError(null);
      
      useAssignmentsStore.getState().setAssignments([]);
      useAssignmentsStore.getState().setLoading(false);
      useAssignmentsStore.getState().setError(null);
    });
  });

  describe('Aides Store', () => {
    it('should set and get aides', () => {
      const { result } = renderHook(() => useAidesStore());
      
      act(() => {
        result.current.setAides(mockAides);
      });
      
      expect(result.current.aides).toEqual(mockAides);
      expect(result.current.error).toBeNull();
    });

    it('should add a new aide', () => {
      const { result } = renderHook(() => useAidesStore());
      const newAide = { id: 3, name: 'Bob Wilson', email: 'bob@example.com', status: 'ACTIVE' };
      
      act(() => {
        result.current.addAide(newAide);
      });
      
      expect(result.current.aides).toHaveLength(1);
      expect(result.current.aides[0]).toEqual(newAide);
    });

    it('should update an existing aide', () => {
      const { result } = renderHook(() => useAidesStore());
      
      act(() => {
        result.current.setAides(mockAides);
        result.current.updateAide(1, { name: 'John Updated' });
      });
      
      expect(result.current.aides[0].name).toBe('John Updated');
    });

    it('should delete an aide', () => {
      const { result } = renderHook(() => useAidesStore());
      
      act(() => {
        result.current.setAides(mockAides);
        result.current.deleteAide(1);
      });
      
      expect(result.current.aides).toHaveLength(1);
      expect(result.current.aides[0].id).toBe(2);
    });

    it('should set loading state', () => {
      const { result } = renderHook(() => useAidesStore());
      
      act(() => {
        result.current.setLoading(true);
      });
      
      expect(result.current.loading).toBe(true);
    });

    it('should set error state', () => {
      const { result } = renderHook(() => useAidesStore());
      
      act(() => {
        result.current.setError('Test error');
      });
      
      expect(result.current.error).toBe('Test error');
    });

    it('should get aide by ID', () => {
      const { result } = renderHook(() => useAidesStore());
      
      act(() => {
        result.current.setAides(mockAides);
      });
      
      const aide = result.current.getAideById(1);
      expect(aide).toEqual(mockAides[0]);
    });

    it('should get active aides', () => {
      const { result } = renderHook(() => useAidesStore());
      const aidesWithInactive = [
        ...mockAides,
        { id: 3, name: 'Inactive Aide', email: 'inactive@example.com', status: 'INACTIVE' }
      ];
      
      act(() => {
        result.current.setAides(aidesWithInactive);
      });
      
      const activeAides = result.current.getActiveAides();
      expect(activeAides).toHaveLength(2);
      expect(activeAides.every(aide => aide.status === 'ACTIVE')).toBe(true);
    });
  });

  describe('Tasks Store', () => {
    it('should set and get tasks', () => {
      const { result } = renderHook(() => useTasksStore());
      
      act(() => {
        result.current.setTasks(mockTasks);
      });
      
      expect(result.current.tasks).toEqual(mockTasks);
      expect(result.current.error).toBeNull();
    });

    it('should add a new task', () => {
      const { result } = renderHook(() => useTasksStore());
      const newTask = { id: 3, title: 'New Task', category: 'GROUP_SUPPORT' };
      
      act(() => {
        result.current.addTask(newTask);
      });
      
      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0]).toEqual(newTask);
    });
  });

  describe('Assignments Store', () => {
    it('should set and get assignments', () => {
      const { result } = renderHook(() => useAssignmentsStore());
      
      act(() => {
        result.current.setAssignments(mockAssignments);
      });
      
      expect(result.current.assignments).toEqual(mockAssignments);
      expect(result.current.error).toBeNull();
    });

    it('should add a new assignment', () => {
      const { result } = renderHook(() => useAssignmentsStore());
      const newAssignment = { id: 3, task_id: 3, aide_id: 3, date: '2024-03-21' };
      
      act(() => {
        result.current.addAssignment(newAssignment);
      });
      
      expect(result.current.assignments).toHaveLength(1);
      expect(result.current.assignments[0]).toEqual(newAssignment);
    });
  });
}); 