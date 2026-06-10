import apiService from "./apiService";

class IntakeService {
  /**
   * Fetch open intakes for a program by UUID (public — no auth required).
   * @param {string} programId - UUID of the program
   */
  async getIntakesForProgram(programId) {
    try {
      const response = await apiService.get("/intakes/", { program: programId });
      const intakes = response.results || response || [];
      return { success: true, intakes: intakes.map(this._mapIntake) };
    } catch (error) {
      return { success: false, error: error.message, intakes: [] };
    }
  }

  /**
   * Fetch open intakes for a program by name (public — no auth required).
   * Used when only the program's display name is available (not UUID).
   * @param {string} programName - e.g. "Software Engineering"
   */
  async getIntakesByProgramName(programName) {
    try {
      const response = await apiService.get("/intakes/", { program_name: programName });
      const intakes = response.results || response || [];
      return { success: true, intakes: intakes.map(this._mapIntake) };
    } catch (error) {
      return { success: false, error: error.message, intakes: [] };
    }
  }

  /**
   * Fetch all intakes — admin use, supports optional filters.
   * @param {Object} filters - e.g. { program: uuid, status: 'open' }
   * @returns {Promise<{success: boolean, intakes: Array, error?: string}>}
   */
  async getAllIntakes(filters = {}) {
    try {
      const response = await apiService.get("/intakes/", filters);
      const intakes = response.results || response || [];
      return { success: true, intakes: intakes.map(this._mapIntake) };
    } catch (error) {
      return { success: false, error: error.message, intakes: [] };
    }
  }

  /**
   * Create a new intake (admin only).
   * @param {Object} data - intake fields (snake_case to match API)
   */
  async createIntake(data) {
    try {
      const response = await apiService.post("/intakes/", data);
      return { success: true, intake: this._mapIntake(response) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Partially update an intake (admin only).
   * @param {string} intakeId - UUID of the intake
   * @param {Object} data - fields to update
   */
  async updateIntake(intakeId, data) {
    try {
      const response = await apiService.patch(`/intakes/${intakeId}/`, data);
      return { success: true, intake: this._mapIntake(response) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete an intake (admin only).
   * @param {string} intakeId - UUID of the intake
   */
  async deleteIntake(intakeId) {
    try {
      await apiService.delete(`/intakes/${intakeId}/`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /** Map snake_case API response to camelCase for components. */
  _mapIntake(intake) {
    return {
      id: intake.id,
      programId: intake.program,
      programName: intake.program_name,
      startDate: intake.start_date,
      endDate: intake.end_date,
      applicationDeadline: intake.application_deadline,
      maxSeats: intake.max_seats,
      seatsRemaining: intake.seats_remaining,
      status: intake.status,
      notes: intake.notes,
      source: intake.source,
      cmsId: intake.cms_id,
      lastSyncedAt: intake.last_synced_at,
      createdAt: intake.created_at,
      updatedAt: intake.updated_at,
    };
  }
}

export default new IntakeService();
