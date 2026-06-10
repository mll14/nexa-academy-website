// src/services/contactService.js
import apiService from './apiService';

class ContactService {
  /**
   * Fetch all contact messages
   * @param {Object} filters - Optional filters (page, limit, etc.)
   * @returns {Promise<{success: boolean, data: Array, count: number, error?: string}>}
   */
  async getMessages(filters = {}) {
    try {
      const response = await apiService.get('/messages/', filters);
      return {
        success: true,
        data: response.results || (Array.isArray(response) ? response : []),
        count: response.count !== undefined ? response.count : (Array.isArray(response) ? response.length : 0),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: [],
        count: 0,
      };
    }
  }

  /**
   * Get total message count and unread count
   * @returns {Promise<{success: boolean, count: number, unreadCount: number, error?: string}>}
   */
  async getMessageCount() {
    try {
      const response = await apiService.get('/messages/count/');
      return {
        success: true,
        count: response.count || 0,
        unreadCount: response.unread_count || 0
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        count: 0,
        unreadCount: 0
      };
    }
  }

  /**
   * Mark a message as read
   * @param {number|string} id - Message ID
   */
  async markAsRead(id) {
    try {
      const response = await apiService.post(`/messages/${id}/mark_read/`);
      return { success: true, is_read: response.is_read };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a contact message
   * @param {number|string} id - Message ID
   */
  async deleteMessage(id) {
    try {
      await apiService.delete(`/messages/${id}/`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new ContactService();
