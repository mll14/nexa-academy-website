import apiService from './apiService';

class NewsletterService {
  // Subscribe to newsletter
  async subscribe(email, name = '', source = 'website') {
    try {
      const response = await apiService.post('/newsletter/subscribe/', {
        email,
        name,
        source,
      });
      
      return {
        success: true,
        message: response.message,
        subscription: response.subscription,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Unsubscribe from newsletter
  async unsubscribe(email) {
    try {
      const response = await apiService.post('/newsletter/unsubscribe/', {
        email,
      });
      
      return {
        success: true,
        message: response.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get subscriber count
  async getSubscriberCount() {
    try {
      const response = await apiService.get('/newsletter/count/');
      return {
        success: true,
        count: response.count,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        count: 0,
      };
    }
  }

  // Get all subscribers (admin)
  async getSubscribers(filters = {}) {
    try {
      const response = await apiService.get('/newsletter/', filters);
      return {
        success: true,
        data: response.results || response,
        count: response.count,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  // Export subscribers to CSV (admin)
  async exportToCSV() {
    try {
      const response = await apiService.get('/newsletter/export/');
      return {
        success: true,
        csvData: response,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default new NewsletterService();
