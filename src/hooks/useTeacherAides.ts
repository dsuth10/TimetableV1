import { useState, useEffect } from 'react';
import { TeacherAide } from '../types';
import { teacherAideAPI } from '../services/api';

export const useTeacherAides = () => {
  const [teacherAides, setTeacherAides] = useState<TeacherAide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTeacherAides = async () => {
      try {
        const response = await teacherAideAPI.getAll();
        setTeacherAides(response.data);
        setError(null);
      } catch (error) {
        console.error('Failed to fetch teacher aides:', error);
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