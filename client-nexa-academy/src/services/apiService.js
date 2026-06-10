import apiConfig from "../utils/apiConfig";

class ApiService {
  constructor() {
    this.baseURL = apiConfig.baseURL;
    this.token = localStorage.getItem("accessToken");
    this.refreshToken = localStorage.getItem("refreshToken");
  }

  // Set authentication token
  setToken(token) {
    this.token = token;
    localStorage.setItem("accessToken", token);
  }

  setRefreshToken(token) {
    this.refreshToken = token;
    localStorage.setItem("refreshToken", token);
  }

  clearTokens() {
    this.token = null;
    this.refreshToken = null;
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  }

  // Get auth headers
  getHeaders() {
    const headers = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Handle response
  async handleResponse(response) {
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Handle token expiration
      if (response.status === 401 && this.refreshToken) {
        // Try to refresh token
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry the original request
          return this.fetchWithRetry(response.url, {
            method: response.method,
            body: response.body,
          });
        }
      }

      // Extract field errors if they exist (Django Rest Framework format)
      let errorMessage =
        data.error || data.message || data.detail || "Request failed";

      if (
        typeof data === "object" &&
        !data.error &&
        !data.message &&
        !data.detail
      ) {
        const fieldErrors = Object.entries(data)
          .map(
            ([key, value]) =>
              `${key}: ${Array.isArray(value) ? value[0] : value}`,
          )
          .join(", ");
        if (fieldErrors) errorMessage = fieldErrors;
      }

      throw {
        status: response.status,
        message: errorMessage,
        data: data,
      };
    }

    return data;
  }

  // Refresh access token
  async refreshAccessToken() {
    try {
      const response = await fetch(`${this.baseURL}/auth/refresh/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refresh: this.refreshToken,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        this.setToken(data.access);
        return true;
      } else {
        this.clearTokens();
        return false;
      }
    } catch (error) {
      this.clearTokens();
      return false;
    }
  }

  // Retry request with new token
  async fetchWithRetry(url, options) {
    const response = await fetch(url, {
      ...options,
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  // Main request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: this.getHeaders(),
    });

    return this.handleResponse(response);
  }

  // HTTP methods
  async get(endpoint, params = {}) {
    // Remove undefined/null params so they don't become the string "undefined"
    const filtered = Object.fromEntries(
      Object.entries(params || {}).filter(
        ([, v]) => v !== undefined && v !== null,
      ),
    );
    const queryString = new URLSearchParams(filtered).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: "GET" });
  }

  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async patch(endpoint, data = {}) {
    return this.request(endpoint, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: "DELETE" });
  }
}

export default new ApiService();
