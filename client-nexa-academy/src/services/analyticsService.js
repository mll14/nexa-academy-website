import apiService from './apiService';

class AnalyticsService {
  // Get dashboard statistics (admin)
  async getDashboardStats() {
    try {
      const response = await apiService.get('/analytics/dashboard/');
      return {
        success: true,
        stats: response,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get enhanced analytics (admin)
  async getEnhancedAnalytics(timeRange = 'all') {
    try {
      const response = await apiService.get('/analytics/enhanced/', { timeRange });
      return {
        success: true,
        analytics: response,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get Program breakdown (admin)
  async getProgramBreakdown() {
    try {
      const response = await apiService.get('/analytics/Program_breakdown/');
      return {
        success: true,
        breakdown: response,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        breakdown: [],
      };
    }
  }

  // Refresh analytics (admin)
  async refreshAnalytics() {
    try {
      const response = await apiService.get('/analytics/refresh/');
      return {
        success: true,
        message: response.message,
        monthly: response.monthly,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default new AnalyticsService();
