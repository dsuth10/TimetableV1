import { useState, useEffect } from 'react';
import { Assignment } from '../types/assignment';
import { assignmentsApi } from '../services';

export const useAssignments = (weekStartDate?: Date) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    console.log('useAssignments: Fetching assignments...');
    const fetchAssignments = async () => {
      try {
        let response;
        if (weekStartDate instanceof Date) {
          const start = new Date(weekStartDate);
          start.setHours(0,0,0,0);
          const end = new Date(start);
          end.setDate(start.getDate() + 4);
          const startStr = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-${String(start.getDate()).padStart(2,'0')}`;
          const endStr = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`;
          response = await assignmentsApi.getAll({ start_date: startStr, end_date: endStr });
        } else {
          response = await assignmentsApi.getAll();
        }
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
  }, [weekStartDate]);

  const updateAssignment = async (id: number, updatedAssignment: Assignment) => {
    try {
      const data = await assignmentsApi.update(id, updatedAssignment);
      
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
      await assignmentsApi.delete(id);
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
