import apiService from "./apiService";

class ApplicationService {
  // Helper to map snake_case API response to camelCase frontend model
  _mapApplicationFromApi(app) {
    if (!app) return null;
    return {
      ...app,
      fullName: app.full_name,
      program: app.program,
      programName: app.program_name,
      estimatedFees: app.estimated_fees ? parseFloat(app.estimated_fees) : 0,
      paymentPlan: app.payment_plan,
      startDate: app.start_date,
      appliedAt: app.applied_at || app.timestamp,
      statusUpdatedAt: app.status_updated_at,
      previousStatus: app.previous_status,
      adminNotes: app.admin_notes,
      processedBy: app.processed_by,
      recaptchaVerified: app.recaptcha_verified,
      emailSent: app.email_sent,
    };
  }

  // Save or update a draft application by email (upsert)
  async saveDraft(data) {
    try {
      const response = await apiService.post('/application-drafts/', {
        email: data.email,
        full_name: data.full_name || '',
        program: data.program || '',
        step_reached: data.step_reached || 1,
      });
      return { success: true, id: response.id, email: response.email };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Submit new application
  async submitApplication(applicationData) {
    try {
      const fullName = applicationData.full_name ?? applicationData.fullName;
      const programName =
        applicationData.program_name ?? applicationData.programName;
      const estimatedFees =
        applicationData.estimated_fees ?? applicationData.estimatedFees;
      const paymentPlan =
        applicationData.payment_plan ?? applicationData.paymentPlan;
      const startDate = applicationData.start_date ?? applicationData.startDate;

      const response = await apiService.post("/applications/", {
        full_name: fullName,
        email: applicationData.email,
        phone: applicationData.phone,
        phone_country: applicationData.phone_country,
        has_basic_knowledge:
          applicationData.has_basic_knowledge ??
          applicationData.hasBasicKnowledge ??
          undefined,
        knowledge_description:
          applicationData.knowledge_description ??
          applicationData.knowledgeDescription ??
          undefined,
        program: applicationData.program,
        program_name: programName,
        estimated_fees: estimatedFees,
        payment_plan: paymentPlan,
        start_date: startDate,
        message: applicationData.message,
        // pass reCAPTCHA token if present
        recaptcha_token:
          applicationData.recaptchaToken ??
          applicationData.recaptcha_token ??
          "",
      });

      return {
        success: true,
        id: response.id,
        application: this._mapApplicationFromApi(response),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get all applications (admin)
  async getApplications(filters = {}) {
    try {
      const response = await apiService.get("/applications/", filters);
      const applications = response.results || response;
      return {
        success: true,
        data: Array.isArray(applications)
          ? applications.map((app) => this._mapApplicationFromApi(app))
          : [],
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

  // Get applications by status
  async getApplicationsByStatus(status, limit = 50) {
    return this.getApplications({ status, limit });
  }

  // Get recent applications
  async getRecentApplications(limit = 10) {
    return this.getApplications({ limit, ordering: "-applied_at" });
  }

  // Get single application by ID
  async getApplicationById(applicationId) {
    try {
      const response = await apiService.get(`/applications/${applicationId}/`);
      return {
        success: true,
        application: this._mapApplicationFromApi(response),
        logs: response.logs || [],
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Update application status
  async updateApplicationStatus(applicationId, status, adminNotes = "") {
    try {
      const response = await apiService.patch(
        `/applications/${applicationId}/update_status/`,
        {
          status,
          notes: adminNotes,
        },
      );

      return {
        success: true,
        application: this._mapApplicationFromApi(response),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Bulk update applications
  async bulkUpdateStatus(applicationIds, status, adminNotes = "") {
    try {
      const response = await apiService.post("/applications/bulk-status/", {
        application_ids: applicationIds,
        status,
        admin_notes: adminNotes,
      });

      return {
        success: true,
        results: Array.isArray(response.results)
          ? response.results.map((r) => ({
              ...r,
              application: this._mapApplicationFromApi(r.application),
            }))
          : response.results,
        summary: response.summary,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Search applications
  async searchApplications(criteria) {
    try {
      const response = await apiService.get("/applications/", criteria);
      const applications = response.results || response;
      return {
        success: true,
        applications: Array.isArray(applications)
          ? applications.map((app) => this._mapApplicationFromApi(app))
          : [],
        count: response.count,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get application statistics
  async getApplicationStats() {
    try {
      const response = await apiService.get("/applications/stats/");
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

  // Export applications to CSV
  async exportToCSV(filters = {}) {
    try {
      const response = await apiService.get("/applications/export/", filters);
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

  async getAvailableSlots(applicationId) {
    try {
      const response = await apiService.get(`/applications/${applicationId}/available_slots/`);
      // slots — full list [{time, status}] for grid rendering
      // available — ISO strings only (backward compat)
      return {
        success: true,
        slots: response.slots || [],
        available: response.available || [],
      };
    } catch (error) {
      return { success: false, error: error.message, slots: [], available: [] };
    }
  }

  async confirmInterview(applicationId, chosenTime) {
    try {
      const response = await apiService.post(
        `/applications/${applicationId}/confirm_interview/`,
        { chosen_time: chosenTime },
      );
      return { success: true, slot: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async rescheduleInterview(applicationId, chosenTime) {
    try {
      const response = await apiService.post(
        `/applications/${applicationId}/reschedule_interview/`,
        { chosen_time: chosenTime },
      );
      return { success: true, slot: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async cancelInterview(applicationId) {
    try {
      const response = await apiService.post(
        `/applications/${applicationId}/cancel_interview/`,
      );
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export default new ApplicationService();
