import apiService from "./apiService";

class PaymentService {
  // Initialize Paystack payment
  async initializePayment(paymentData) {
    try {
      const response = await apiService.post("/payments/initialize_payment/", {
        amount: paymentData.amount,
        program_id: paymentData.programId,
        payment_type: paymentData.paymentType,
        email: paymentData.email,
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Verify Paystack payment
  async verifyPayment(reference) {
    try {
      const response = await apiService.post("/payments/verify_payment/", {
        reference,
      });

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get public key for Paystack (from env fallback)
  getPublicKey() {
    return import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "";
  }

  // Process payment
  async processPayment(paymentData) {
    try {
      const response = await apiService.post("/payments/process/", {
        amount: paymentData.amount,
        payment_method: paymentData.paymentMethod,
        mobile_number: paymentData.mobileNumber,
        program_id: paymentData.programId,
        description: paymentData.description,
      });

      return {
        success: true,
        payment: response,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get payment history
  async getPaymentHistory() {
    try {
      const response = await apiService.get("/payments/");
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

  // Get single payment
  async getPayment(paymentId) {
    try {
      const response = await apiService.get(`/payments/${paymentId}/`);
      return {
        success: true,
        payment: response,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Confirm payment (admin)
  async confirmPayment(paymentId) {
    try {
      const response = await apiService.post(`/payments/${paymentId}/confirm/`);
      return {
        success: true,
        payment: response,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Refund payment (admin)
  async refundPayment(paymentId) {
    try {
      const response = await apiService.post(`/payments/${paymentId}/refund/`);
      return {
        success: true,
        payment: response,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Check a single payment's status against Paystack
  async checkPaymentStatus(paymentId) {
    try {
      const response = await apiService.post(`/payments/${paymentId}/check_status/`);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Admin: check all pending payments in one sweep
  async checkAllPending() {
    try {
      const response = await apiService.post("/payments/check_all_pending/");
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get fee balance
  async getFeeBalance() {
    try {
      const profile = await apiService.get("/auth/profile/");
      return {
        success: true,
        balance: profile.fee_balance,
        totalPaid: profile.total_fee_paid,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default new PaymentService();
