import apiService from './apiService';

class programService {
  // Get all Programs
  async getPrograms(filters = {}) {
    try {
      const response = await apiService.get('/programs/', filters);
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

  // Get active programs (non-coming-soon) — replaces static programs array
  async getActivePrograms() {
    try {
      const response = await apiService.get('/programs/', { status: 'active' });
      const data = response.results || response || [];
      return { success: true, data: data.map(this._mapProgram), count: data.length };
    } catch (error) {
      return { success: false, error: error.message, data: [] };
    }
  }

  // Get a single program by its URL slug
  async getProgramBySlug(slug) {
    try {
      const response = await apiService.get('/programs/', { slug });
      const results = response.results || response || [];
      const program = Array.isArray(results) ? results[0] : results;
      if (!program) return { success: false, error: 'Program not found' };
      return { success: true, program: this._mapProgram(program) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Map snake_case API fields to camelCase for components
  _mapProgram(p) {
    return {
      id: p.program_id,
      programId: p.program_id,
      programName: p.program_name,
      name: p.program_name,
      title: p.program_name,
      description: p.description,
      category: p.category,
      level: p.level,
      duration: p.duration,
      durationMonths: p.duration_months,
      price: p.price != null ? parseFloat(p.price) : null,
      originalPrice: p.original_price != null ? parseFloat(p.original_price) : null,
      maxStudents: p.max_students,
      currentEnrolled: p.current_enrolled,
      instructor: p.instructor,
      instructorEmail: p.instructor_email,
      status: p.status,
      thumbnail: p.thumbnail,
      image: p.image || p.thumbnail || '',
      icon: p.icon || '',
      syllabus: p.syllabus,
      requirements: p.requirements || [],
      skills: p.skills || [],
      offersCertificate: p.offers_certificate,
      slug: p.slug || '',
      subtitle: p.subtitle || '',
      comingSoon: p.coming_soon || false,
      topics: p.topics || [],
      curriculum: p.curriculum || [],
      features: p.features || [],
      outcomes: p.outcomes || [],
      faq: p.faq || [],
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    };
  }

  // Get single Program
  async getProgram(programId) {
    try {
      const response = await apiService.get(`/programs/${programId}/`);
      return {
        success: true,
        program: response,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Manual Enrollment (Admin)
  async manualEnroll(enrollmentData) {
    try {
      const response = await apiService.post('/enrollments/manual_enroll/', {
        student_id: enrollmentData.studentId,
        program_id: enrollmentData.programId,
        amount: enrollmentData.amount,
        amount_paid: enrollmentData.amountPaid || 0,
      });
      
      return {
        success: true,
        enrollment: response,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Enroll in Program
  async enrollInProgram(programId, enrollmentData) {

    try {
      const response = await apiService.post('/enrollments/enroll/', {
        program_id: programId,
        ...enrollmentData,
      });
      
      return {
        success: true,
        enrollment: response,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get student enrollments
  async getMyEnrollments() {
    try {
      const response = await apiService.get('/enrollments/');
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

  // Get Program progress
  async getProgramProgress(programId) {
    try {
      const response = await apiService.get(`/progress/?program=${programId}`);
      return {
        success: true,
        progress: response.results?.[0] || response,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Update lesson completion
  async updateLessonProgress(programId, lessonData) {
    try {
      const progress = await this.getProgramProgress(programId);
      if (progress.success && progress.progress?.id) {
        const response = await apiService.post(
          `/progress/${progress.progress.id}/update_lesson/`,
          lessonData
        );
        return {
          success: true,
          progress: response,
        };
      }
      return {
        success: false,
        error: 'No progress record found',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Update quiz score
  async updateQuizScore(programId, quizData) {
    try {
      const progress = await this.getProgramProgress(programId);
      if (progress.success && progress.progress?.id) {
        const response = await apiService.post(
          `/progress/${progress.progress.id}/update_quiz_score/`,
          quizData
        );
        return {
          success: true,
          progress: response,
        };
      }
      return {
        success: false,
        error: 'No progress record found',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Get certificates
  async getMyCertificates() {
    try {
      const response = await apiService.get('/certificates/');
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

  // Verify certificate
  async verifyCertificate(verificationCode) {
    try {
      const response = await apiService.get(`/certificates/verify/?code=${verificationCode}`);
      return {
        success: true,
        certificate: response.certificate,
        valid: response.valid,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default new programService();
