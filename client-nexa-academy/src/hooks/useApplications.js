import { useState, useEffect } from 'react';
import applicationService from '../services/applicationService';

export const useApplications = (filters = {}) => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  const loadApplications = async () => {
    setLoading(true);
    setError(null);
    const result = await applicationService.getApplications(filters);
    if (result.success) {
      setApplications(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const loadStats = async () => {
    const result = await applicationService.getApplicationStats();
    if (result.success) {
      setStats(result.stats);
    }
  };

  useEffect(() => {
    loadApplications();
    loadStats();
  }, [JSON.stringify(filters)]);

  const updateStatus = async (applicationId, status, notes) => {
    const result = await applicationService.updateApplicationStatus(
      applicationId,
      status,
      notes
    );
    if (result.success) {
      await loadApplications();
      await loadStats();
    }
    return result;
  };

  const search = async (criteria) => {
    setLoading(true);
    setError(null);
    const result = await applicationService.searchApplications(criteria);
    if (result.success) {
      setApplications(result.applications);
    } else {
      setError(result.error);
    }
    setLoading(false);
    return result;
  };

  return {
    applications,
    loading,
    error,
    stats,
    updateStatus,
    search,
    refresh: loadApplications,
  };
};
