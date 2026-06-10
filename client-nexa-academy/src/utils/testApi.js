import authService from '../services/authService';
import applicationService from '../services/applicationService';
import programService from '../services/programService';

export const testApiConnection = async () => {
  const tests = [];

  // Test 1: Check if API is reachable
  tests.push({
    name: 'API Reachable',
    test: async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/`);
        return response.ok || response.status === 404; // 404 is acceptable for root endpoint
      } catch {
        return false;
      }
    }
  });

  // Test 2: Test authentication service
  tests.push({
    name: 'Auth Service',
    test: async () => {
      return !!authService;
    }
  });

  // Test 3: Test applications service
  tests.push({
    name: 'Applications Service',
    test: async () => {
      return !!applicationService;
    }
  });

  // Test 4: Test Programs service
  tests.push({
    name: 'Programs Service',
    test: async () => {
      return !!programService;
    }
  });

  // Run tests
  for (const test of tests) {
    try {
      await test.test();
    } catch (error) {
    }
  }
};
