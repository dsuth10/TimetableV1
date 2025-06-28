import { Assignment } from '../types/assignment';

const API_BASE_URL = '/api';

export const getAssignments = async (): Promise<Assignment[]> => {
  console.log('Fetching assignments...');
  const response = await fetch(`${API_BASE_URL}/assignments`);
  if (!response.ok) {
    console.error('Failed to fetch assignments:', response.statusText);
    throw new Error('Failed to fetch assignments');
  }
  const data = await response.json();
  console.log('Fetched assignments:', data);
  return data;
};

export const updateAssignment = async (assignment: Assignment): Promise<Assignment> => {
  console.log('Updating assignment:', assignment);
  const response = await fetch(`${API_BASE_URL}/assignments/${assignment.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(assignment),
  });
  if (!response.ok) {
    console.error('Failed to update assignment:', response.statusText);
    throw new Error('Failed to update assignment');
  }
  const data = await response.json();
  console.log('Updated assignment:', data);
  return data;
};

export const createAssignment = async (assignment: Omit<Assignment, 'id'>): Promise<Assignment> => {
  const response = await fetch(`${API_BASE_URL}/assignments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(assignment),
  });
  if (!response.ok) {
    throw new Error('Failed to create assignment');
  }
  return response.json();
};

export const deleteAssignment = async (id: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/assignments/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete assignment');
  }
}; 