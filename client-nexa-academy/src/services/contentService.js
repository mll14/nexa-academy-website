import apiService from "./apiService";

class ContentService {
  /** Fetch active testimonials ordered by sort_order. */
  async getTestimonials() {
    try {
      const response = await apiService.get("/content/testimonials/");
      const data = response.results || response || [];
      return { success: true, testimonials: data.map(this._mapTestimonial) };
    } catch (error) {
      return { success: false, error: error.message, testimonials: [] };
    }
  }

  /** Fetch active FAQs. Pass filters like { category: 'pricing' } or { show_on_homepage: true }. */
  async getFaqs(filters = {}) {
    try {
      const response = await apiService.get("/content/faqs/", filters);
      const data = response.results || response || [];
      return { success: true, faqs: data.map(this._mapFaq) };
    } catch (error) {
      return { success: false, error: error.message, faqs: [] };
    }
  }

  /** Shorthand for homepage FAQ section. */
  async getHomepageFaqs() {
    return this.getFaqs({ show_on_homepage: true });
  }

  /**
   * Fetch site settings as a flat key→value object.
   * Optional group filter e.g. 'hero', 'contact', 'cta'.
   */
  async getSettings(group = null) {
    try {
      const params = group ? { group } : {};
      const response = await apiService.get("/content/settings/", params);
      return { success: true, settings: response };
    } catch (error) {
      return { success: false, error: error.message, settings: {} };
    }
  }

  /**
   * Fetch homepage feature cards.
   * section: 'why_choose' | 'journey'
   */
  async getFeatures(section) {
    try {
      const response = await apiService.get("/content/features/", { section });
      const data = response.results || response || [];
      return { success: true, features: data.map(this._mapFeature) };
    } catch (error) {
      return { success: false, error: error.message, features: [] };
    }
  }

  /**
   * Fetch legal document sections.
   * docType: 'privacy' | 'terms'
   */
  async getLegalDocument(docType) {
    try {
      const response = await apiService.get(`/content/legal/${docType}/`);
      const data = response.results || response || [];
      return { success: true, sections: data.map(this._mapLegalSection) };
    } catch (error) {
      return { success: false, error: error.message, sections: [] };
    }
  }

  async getBlogPosts() {
    try {
      const response = await apiService.get('/content/blog/');
      const data = response.results || response || [];
      return { success: true, posts: data };
    } catch (error) {
      return { success: false, error: error.message, posts: [] };
    }
  }

  async getBlogPost(slug) {
    try {
      const response = await apiService.get(`/content/blog/${slug}/`);
      return { success: true, post: response };
    } catch (error) {
      return { success: false, error: error.message, post: null };
    }
  }

  async getAnnouncements() {
    try {
      const response = await apiService.get('/content/announcements/');
      const data = response.results || response || [];
      return { success: true, announcements: data };
    } catch (error) {
      return { success: false, error: error.message, announcements: [] };
    }
  }

  async getActiveBanners() {
    try {
      const response = await apiService.get('/content/banners/');
      const data = response.results || response || [];
      return { success: true, banners: data };
    } catch (error) {
      return { success: false, error: error.message, banners: [] };
    }
  }

  async getNav() {
    try {
      const response = await apiService.get('/content/nav/');
      return { success: true, items: response.items || [] };
    } catch (error) {
      return { success: false, error: error.message, items: [] };
    }
  }

  async getFooter() {
    try {
      const response = await apiService.get('/content/footer/');
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error.message, data: null };
    }
  }

  // ── Admin CRUD methods ──────────────────────────────────────────────────

  async createTestimonial(data) {
    try {
      const res = await apiService.post("/content/admin/testimonials/", data);
      return { success: true, testimonial: this._mapTestimonial(res) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updateTestimonial(id, data) {
    try {
      const res = await apiService.patch(`/content/admin/testimonials/${id}/`, data);
      return { success: true, testimonial: this._mapTestimonial(res) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteTestimonial(id) {
    try {
      await apiService.delete(`/content/admin/testimonials/${id}/`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createFaq(data) {
    try {
      const res = await apiService.post("/content/admin/faqs/", data);
      return { success: true, faq: this._mapFaq(res) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updateFaq(id, data) {
    try {
      const res = await apiService.patch(`/content/admin/faqs/${id}/`, data);
      return { success: true, faq: this._mapFaq(res) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteFaq(id) {
    try {
      await apiService.delete(`/content/admin/faqs/${id}/`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updateSetting(key, value) {
    try {
      await apiService.patch(`/content/settings/${key}/`, { value });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createFeature(data) {
    try {
      const res = await apiService.post("/content/admin/features/", data);
      return { success: true, feature: this._mapFeature(res) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updateFeature(id, data) {
    try {
      const res = await apiService.patch(`/content/admin/features/${id}/`, data);
      return { success: true, feature: this._mapFeature(res) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteFeature(id) {
    try {
      await apiService.delete(`/content/admin/features/${id}/`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createLegalSection(data) {
    try {
      const res = await apiService.post("/content/admin/legal/", data);
      return { success: true, section: this._mapLegalSection(res) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updateLegalSection(id, data) {
    try {
      const res = await apiService.patch(`/content/admin/legal/${id}/`, data);
      return { success: true, section: this._mapLegalSection(res) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteLegalSection(id) {
    try {
      await apiService.delete(`/content/admin/legal/${id}/`);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ── snake_case → camelCase mappers ─────────────────────────────────────

  _mapTestimonial(t) {
    return {
      id: t.id,
      name: t.name,
      role: t.role,
      quote: t.quote,
      rating: t.rating,
      avatarUrl: t.avatar_url,
      isActive: t.is_active,
      sortOrder: t.sort_order,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    };
  }

  _mapFaq(f) {
    return {
      id: f.id,
      question: f.question,
      answer: f.answer,
      category: f.category,
      showOnHomepage: f.show_on_homepage,
      isActive: f.is_active,
      sortOrder: f.sort_order,
      createdAt: f.created_at,
    };
  }

  _mapFeature(f) {
    return {
      id: f.id,
      section: f.section,
      title: f.title,
      description: f.description,
      iconName: f.icon_name,
      sortOrder: f.sort_order,
      isActive: f.is_active,
    };
  }

  _mapLegalSection(s) {
    return {
      id: s.id,
      docType: s.doc_type,
      sectionId: s.section_id,
      title: s.title,
      content: s.content,
      sortOrder: s.sort_order,
      isActive: s.is_active,
      updatedAt: s.updated_at,
    };
  }
}

export default new ContentService();
