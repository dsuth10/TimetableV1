import { useState, useEffect } from 'react';
import { absencesApi } from '../services';
import { Absence } from '../types'; // Import the Absence type

export const useAbsences = (weekStartDate?: Date) => {
  const [absences, setAbsences] = useState<Absence[]>([]); // Add TypeScript type annotation
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    console.log('useAbsences: Fetching absences...');
    const fetchAbsences = async () => {
      try {
        let response;
        if (weekStartDate instanceof Date) {
          const start = new Date(weekStartDate);
          start.setHours(0,0,0,0);
          const end = new Date(start);
          end.setDate(start.getDate() + 4);
          const startStr = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-${String(start.getDate()).padStart(2,'0')}`;
          const endStr = `${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`;
          response = await absencesApi.getByDateRange(startStr, endStr);
        } else {
          response = await absencesApi.getAll();
        }
        // Ensure we have an array of absences
        const data = Array.isArray(response.data) ? response.data : [];
        setAbsences(data);
        setError(null);
        console.log('useAbsences: Absences fetched successfully', data);
      } catch (error) {
        console.error('useAbsences: Failed to fetch absences:', error);
        setError(error instanceof Error ? error : new Error('Failed to fetch absences'));
        setAbsences([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAbsences();
  }, [weekStartDate]);

  return { absences, isLoading, error };
};
