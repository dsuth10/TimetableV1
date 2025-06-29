import { useState, useEffect } from 'react';
import { Assignment } from '../types';
import { assignmentAPI } from '../services/api';

export const useAssignments = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    console.log('useAssignments: Fetching assignments...');
    const fetchAssignments = async () => {
      try {
        const response = await assignmentAPI.getAll();
        // Ensure we have an array of assignments
        const data = Array.isArray(response.data) ? response.data : [];
        setAssignments(data);
        setError(null);
        console.log('useAssignments: Assignments fetched successfully', data);
      } catch (error) {
        console.error('useAssignments: Failed to fetch assignments:', error);
        setError(error instanceof Error ? error : new Error('Failed to fetch assignments'));
        setAssignments([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssignments();
  }, []);

  const updateAssignment = async (id: number, updatedAssignment: Assignment) => {
    try {
      const response = await assignmentAPI.update(id, updatedAssignment);
      const data = response.data;
      
      setAssignments(prev =>
        prev.map(a => (a.id === id ? data : a))
      );
      setError(null);
      return data;
    } catch (error) {
      console.error('Failed to update assignment:', error);
      setError(error instanceof Error ? error : new Error('Failed to update assignment'));
      throw error;
    }
  };

  const deleteAssignment = async (id: number) => {
    try {
      await assignmentAPI.delete(id);
      setAssignments(prev => prev.filter(a => a.id !== id));
      setError(null);
    } catch (error) {
      console.error('Failed to delete assignment:', error);
      setError(error instanceof Error ? error : new Error('Failed to delete assignment'));
      throw error;
    }
  };

  return { assignments, isLoading, error, updateAssignment, deleteAssignment };
};
