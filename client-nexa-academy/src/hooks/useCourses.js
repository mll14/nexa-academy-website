import { useState, useEffect } from 'react';
import programService from '../services/programService';

export const usePrograms = (filters = {}) => {
  const [Programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [myEnrollments, setMyEnrollments] = useState([]);

  const loadPrograms = async () => {
    setLoading(true);
    setError(null);
    const result = await programService.getPrograms(filters);
    if (result.success) {
      setPrograms(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const loadEnrollments = async () => {
    const result = await programService.getMyEnrollments();
    if (result.success) {
      setMyEnrollments(result.data);
    }
  };

  useEffect(() => {
    loadPrograms();
    loadEnrollments();
  }, [JSON.stringify(filters)]);

  const enroll = async (ProgramId, enrollmentData) => {
    const result = await programService.enrollInProgram(ProgramId, enrollmentData);
    if (result.success) {
      await loadEnrollments();
    }
    return result;
  };

  const isEnrolled = (ProgramId) => {
    return myEnrollments.some(e => e.Program === ProgramId || e.Program_id === ProgramId);
  };

  return {
    Programs,
    myEnrollments,
    loading,
    error,
    enroll,
    isEnrolled,
    refresh: loadPrograms,
  };
};
