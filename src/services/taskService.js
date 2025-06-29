import axios from 'axios';

const API_BASE_URL = '/api';

/**
 * Creates a new task
 * @param {Object} taskData - The task data to create
 * @returns {Promise} Promise resolving to the created task
 */
export const createTask = async (taskData) => {
  const response = await axios.post(`${API_BASE_URL}/tasks`, taskData);
  return response.data;
};

/**
 * Updates an existing task
 * @param {number} taskId - The ID of the task to update
 * @param {Object} taskData - The updated task data
 * @returns {Promise} Promise resolving to the updated task
 */
export const updateTask = async (taskId, taskData) => {
  const response = await axios.put(`${API_BASE_URL}/tasks/${taskId}`, taskData);
  return response.data;
};

/**
 * Fetches all classrooms
 * @returns {Promise} Promise resolving to the list of classrooms
 */
export const getClassrooms = async () => {
  const response = await axios.get(`${API_BASE_URL}/classrooms`);
  return response.data.classrooms;
};

/**
 * Generates a preview of recurring task occurrences
 * @param {Object} taskData - The task data to preview
 * @returns {Promise} Promise resolving to the preview data
 */
export const previewRecurringTask = async (taskData) => {
  const response = await axios.post(`${API_BASE_URL}/tasks/preview`, taskData);
  return response.data;
};

/**
 * Fetches all school classes
 * @returns {Promise} Promise resolving to the list of school classes
 */
export const getSchoolClasses = async () => {
  const response = await axios.get(`${API_BASE_URL}/school-classes`);
  return response.data;
};
