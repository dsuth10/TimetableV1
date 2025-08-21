import { useAidesStore } from './aidesStore';
import { useTasksStore } from './tasksStore';
import { useAssignmentsStore } from './assignmentsStore';
import { useAbsencesStore } from './absencesStore';
import { useClassroomsStore } from './classroomsStore';
import { useSchoolClassesStore } from './schoolClassesStore';
import { useUIStore } from './uiStore';

/**
 * Initialize all stores with default data and set up cross-store subscriptions
 */
export const initializeStores = async () => {
  try {
    // Set loading states
    useAidesStore.getState().setLoading(true);
    useTasksStore.getState().setLoading(true);
    useAssignmentsStore.getState().setLoading(true);
    useAbsencesStore.getState().setLoading(true);
    useClassroomsStore.getState().setLoading(true);
    useSchoolClassesStore.getState().setLoading(true);

    // Load initial data from API
    await Promise.all([
      loadInitialAides(),
      loadInitialTasks(),
      loadInitialAssignments(),
      loadInitialAbsences(),
      loadInitialClassrooms(),
      loadInitialSchoolClasses(),
    ]);

    // Set up cross-store subscriptions
    setupStoreSubscriptions();

    console.log('All stores initialized successfully');
  } catch (error) {
    console.error('Failed to initialize stores:', error);
    
    // Set error states
    useAidesStore.getState().setError('Failed to load aides');
    useTasksStore.getState().setError('Failed to load tasks');
    useAssignmentsStore.getState().setError('Failed to load assignments');
    useAbsencesStore.getState().setError('Failed to load absences');
    useClassroomsStore.getState().setError('Failed to load classrooms');
    useSchoolClassesStore.getState().setError('Failed to load school classes');
  } finally {
    // Clear loading states
    useAidesStore.getState().setLoading(false);
    useTasksStore.getState().setLoading(false);
    useAssignmentsStore.getState().setLoading(false);
    useAbsencesStore.getState().setLoading(false);
    useClassroomsStore.getState().setLoading(false);
    useSchoolClassesStore.getState().setLoading(false);
  }
};

/**
 * Load initial aides data
 */
const loadInitialAides = async () => {
  try {
    const response = await fetch('/api/teacher-aides');
    if (response.ok) {
      const data = await response.json();
      // Handle different response formats
      const aides = Array.isArray(data) ? data : (data.data || data.items || []);
      useAidesStore.getState().setAides(aides);
    }
  } catch (error) {
    console.error('Failed to load aides:', error);
    throw error;
  }
};

/**
 * Load initial tasks data
 */
const loadInitialTasks = async () => {
  try {
    const response = await fetch('/api/tasks');
    if (response.ok) {
      const tasks = await response.json();
      useTasksStore.getState().setTasks(tasks);
    }
  } catch (error) {
    console.error('Failed to load tasks:', error);
    throw error;
  }
};

/**
 * Load initial assignments data
 */
const loadInitialAssignments = async () => {
  try {
    const currentWeek = useUIStore.getState().currentWeek;
    const response = await fetch(`/api/assignments?week=${currentWeek}`);
    if (response.ok) {
      const data = await response.json();
      // Handle paginated response
      const assignments = data.items || data;
      // Safety check: ensure assignments is an array
      if (Array.isArray(assignments)) {
        useAssignmentsStore.getState().setAssignments(assignments);
      } else {
        console.warn('Initial assignments response is not an array:', assignments);
        useAssignmentsStore.getState().setAssignments([]);
      }
    }
  } catch (error) {
    console.error('Failed to load assignments:', error);
    useAssignmentsStore.getState().setAssignments([]);
  }
};

/**
 * Load initial absences data
 */
const loadInitialAbsences = async () => {
  try {
    const currentWeek = useUIStore.getState().currentWeek;
    const response = await fetch(`/api/absences?week=${currentWeek}`);
    if (response.ok) {
      const absences = await response.json();
      // Safety check: ensure absences is an array
      if (Array.isArray(absences)) {
        useAbsencesStore.getState().setAbsences(absences);
      } else {
        console.warn('Initial absences response is not an array:', absences);
        useAbsencesStore.getState().setAbsences([]);
      }
    }
  } catch (error) {
    console.error('Failed to load absences:', error);
    useAbsencesStore.getState().setAbsences([]);
  }
};

/**
 * Load initial classrooms data
 */
const loadInitialClassrooms = async () => {
  try {
    const response = await fetch('/api/classrooms');
    if (response.ok) {
      const classrooms = await response.json();
      useClassroomsStore.getState().setClassrooms(classrooms);
    }
  } catch (error) {
    console.error('Failed to load classrooms:', error);
    throw error;
  }
};

/**
 * Load initial school classes data
 */
const loadInitialSchoolClasses = async () => {
  try {
    const response = await fetch('/api/school-classes');
    if (response.ok) {
      const schoolClasses = await response.json();
      useSchoolClassesStore.getState().setSchoolClasses(schoolClasses);
    }
  } catch (error) {
    console.error('Failed to load school classes:', error);
    throw error;
  }
};

/**
 * Set up cross-store subscriptions for reactive updates
 */
const setupStoreSubscriptions = () => {
  // Subscribe to week changes to reload assignments and absences
  useUIStore.subscribe(
    (state) => {
      // Reload assignments for new week
      loadAssignmentsForWeek(state.currentWeek);
      // Reload absences for new week
      loadAbsencesForWeek(state.currentWeek);
    }
  );

  // Subscribe to aide deletions to clean up related data
  useAidesStore.subscribe(
    (state) => {
      // Check if any aides were deleted and clean up related assignments
      const assignments = useAssignmentsStore.getState().assignments;
      // Safety check: ensure assignments is an array
      if (!Array.isArray(assignments)) {
        console.warn('Assignments is not an array:', assignments);
        return;
      }
      const aideIds = new Set(state.aides.map((aide: any) => aide.id));
      const orphanedAssignments = assignments.filter(
        assignment => !aideIds.has(assignment.aideId)
      );
      
      if (orphanedAssignments.length > 0) {
        orphanedAssignments.forEach(assignment => {
          useAssignmentsStore.getState().deleteAssignment(assignment.id);
        });
      }
    }
  );
};

/**
 * Load assignments for a specific week
 */
const loadAssignmentsForWeek = async (week: string) => {
  try {
    const response = await fetch(`/api/assignments?week=${week}`);
    if (response.ok) {
      const data = await response.json();
      // Handle paginated response
      const assignments = data.items || data;
      // Safety check: ensure assignments is an array
      if (Array.isArray(assignments)) {
        useAssignmentsStore.getState().setAssignments(assignments);
      } else {
        console.warn('Assignments response is not an array:', assignments);
        useAssignmentsStore.getState().setAssignments([]);
      }
    }
  } catch (error) {
    console.error('Failed to load assignments for week:', week, error);
    useAssignmentsStore.getState().setAssignments([]);
  }
};

/**
 * Load absences for a specific week
 */
const loadAbsencesForWeek = async (week: string) => {
  try {
    const response = await fetch(`/api/absences?week=${week}`);
    if (response.ok) {
      const absences = await response.json();
      // Safety check: ensure absences is an array
      if (Array.isArray(absences)) {
        useAbsencesStore.getState().setAbsences(absences);
      } else {
        console.warn('Absences response is not an array:', absences);
        useAbsencesStore.getState().setAbsences([]);
      }
    }
  } catch (error) {
    console.error('Failed to load absences for week:', week, error);
    useAbsencesStore.getState().setAbsences([]);
  }
};
