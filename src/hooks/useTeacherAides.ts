import { useState, useEffect } from 'react';
import { TeacherAide } from '../types';
import { aidesApi } from '../services';

export const useTeacherAides = () => {
  const [teacherAides, setTeacherAides] = useState<TeacherAide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    console.log('useTeacherAides: Fetching teacher aides...');
    const fetchTeacherAides = async () => {
      try {
        const response = await aidesApi.getAll();
        const data = Array.isArray(response.data) ? response.data : [];
        setTeacherAides(data);
        setError(null);
        console.log('useTeacherAides: Teacher aides fetched successfully', response.data);
      } catch (error) {
        console.error('useTeacherAides: Failed to fetch teacher aides:', error);
        setError(error instanceof Error ? error : new Error('Failed to fetch teacher aides'));
        setTeacherAides([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeacherAides();
  }, []);

  return { teacherAides, isLoading, error };
};
