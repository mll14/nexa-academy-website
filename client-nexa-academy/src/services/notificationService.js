import apiService from './apiService';

class NotificationService {
  // Get user notifications
  async getNotifications() {
    try {
      const response = await apiService.get('/notifications/');
      return {
        success: true,
        data: response.results || response,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }
  }

  // Get unread count
  async getUnreadCount() {
    try {
      const response = await apiService.get('/notifications/unread_count/');
      return {
        success: true,
        count: response.unread_count,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        count: 0,
      };
    }
  }

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      const response = await apiService.post(`/notifications/${notificationId}/mark_read/`);
      return {
        success: true,
        notification: response,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Mark all as read
  async markAllAsRead() {
    try {
      await apiService.post('/notifications/mark_all_read/');
      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Delete notification
  async deleteNotification(notificationId) {
    try {
      await apiService.delete(`/notifications/${notificationId}/`);
      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Send notification to a group preset (admin only)
  // group: 'all' | 'pending' | 'approved' | 'enrolled' | 'program:<slug>'
  async createGroupNotification({ group, type, title, message, link = '' }) {
    try {
      const response = await apiService.post('/notifications/create_for_group/', {
        group,
        type,
        title,
        message,
        link,
      });
      return {
        success: true,
        sent_count: response.sent_count ?? 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Create notification (admin)
  async createNotification(notificationData) {
    try {
      const response = await apiService.post('/notifications/create_for_user/', {
        user_id: notificationData.userId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        link: notificationData.link,
      });
      
      return {
        success: true,
        notification: response,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default new NotificationService();
