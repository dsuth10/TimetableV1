import { useState, useEffect } from 'react';
import { absenceAPI } from '../services/api';
import { Absence } from '../types'; // Import the Absence type

export const useAbsences = () => {
  const [absences, setAbsences] = useState<Absence[]>([]); // Add TypeScript type annotation
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    console.log('useAbsences: Fetching absences...');
    const fetchAbsences = async () => {
      try {
        const response = await absenceAPI.getAll();
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
  }, []);

  return { absences, isLoading, error };
};
