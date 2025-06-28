import { Task, Assignment } from '../types/task';

const API_BASE_URL = '/api';

interface CreateAssignmentData {
  taskId: number;
  aideId: number;
  day: string;
  startTime: string;
  duration: number;
}

interface CheckConflictsData {
  aideId: number;
  day: string;
  startTime: string;
  duration: number;
}

interface ConflictCheckResponse {
  hasConflicts: boolean;
  conflicts: Assignment[];
}

export const assignmentService = {
  async createAssignment(data: CreateAssignmentData): Promise<Assignment> {
    const response = await fetch(`${API_BASE_URL}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task_id: data.taskId,
        aide_id: data.aideId,
        day: data.day,
        start_time: data.startTime,
        duration: data.duration,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create assignment');
    }

    return response.json();
  },

  async updateAssignment(id: number, data: Partial<CreateAssignmentData>): Promise<Assignment> {
    const response = await fetch(`${API_BASE_URL}/assignments/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update assignment');
    }

    return response.json();
  },

  async deleteAssignment(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/assignments/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete assignment');
    }
  },

  async checkConflicts(data: CheckConflictsData): Promise<ConflictCheckResponse> {
    const response = await fetch(`${API_BASE_URL}/assignments/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        aide_id: data.aideId,
        day: data.day,
        start_time: data.startTime,
        duration: data.duration,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to check conflicts');
    }

    return response.json();
  },
}; 