import apiService from "./apiService";

class AuthService {
  // Student Sign Up
  async signUp(userData) {
    try {
      const response = await apiService.post("/auth/signup/", {
        email: userData.email,
        password: userData.password,
        display_name: userData.displayName,
        phone: userData.phone || "",
      });

      if (response.access) {
        apiService.setToken(response.access);
        apiService.setRefreshToken(response.refresh);
        try {
          if (response.user)
            localStorage.setItem("currentUser", JSON.stringify(response.user));
        } catch {}
      }

      return {
        success: true,
        user: response.user,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Student Login
  async login(email, password) {
    try {
      const response = await apiService.post("/auth/login/", {
        email,
        password,
      });

      if (response.access) {
        apiService.setToken(response.access);
        apiService.setRefreshToken(response.refresh);

        // Get user profile
        const profile = await this.getProfile();
        try {
          if (profile && profile.user)
            localStorage.setItem("currentUser", JSON.stringify(profile.user));
        } catch {}
        return {
          success: true,
          user: profile.user,
          role: profile.user.role,
        };
      }

      return {
        success: false,
        error: "Login failed",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Google Login (OAuth)
  async googleLogin(googleToken) {
    try {
      const response = await apiService.post("/auth/login/google/", {
        google_token: googleToken,
      });

      if (response.access) {
        apiService.setToken(response.access);
        apiService.setRefreshToken(response.refresh);
        try {
          if (response.user)
            localStorage.setItem("currentUser", JSON.stringify(response.user));
        } catch {}
      }

      return {
        success: true,
        user: response.user,
        isNewUser: response.isNewUser || false,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Admin Login
  async adminLogin(email, password) {
    try {
      // In Django, we use the same token endpoint since role logic is in the JWT or profile
      const response = await apiService.post("/auth/login/", {
        email,
        password,
      });

      if (response.access) {
        apiService.setToken(response.access);
        apiService.setRefreshToken(response.refresh);

        // Get user profile
        const profile = await this.getProfile();

        if (profile.success && profile.user.role === "admin") {
          try {
            if (profile.user)
              localStorage.setItem("currentUser", JSON.stringify(profile.user));
          } catch {}
          return {
            success: true,
            user: profile.user,
            role: "admin",
          };
        } else {
          // Reset tokens if not admin
          this.clearTokens();
          return {
            success: false,
            error: "User is not an administrator",
          };
        }
      }

      return {
        success: false,
        error: "Login failed",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Logout — blacklists the refresh token on the server, then clears local storage
  async logout() {
    try {
      const refresh = apiService.refreshToken;
      if (refresh) {
        await apiService.post("/auth/logout/", { refresh });
      }
    } catch (_) {
      // Best-effort — always clear tokens locally regardless of server response
    } finally {
      apiService.clearTokens();
      try {
        localStorage.removeItem("currentUser");
      } catch {}
    }
    return { success: true };
  }

  // Get current user profile
  async getProfile() {
    try {
      const response = await apiService.get("/auth/profile/");
      return {
        success: true,
        user: response,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Verify token
  async verifyToken() {
    try {
      const response = await apiService.get("/auth/profile/");
      return {
        success: true,
        user: response,
        role: response.role,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Clear tokens directly
  clearTokens() {
    apiService.clearTokens();
  }

  // Update profile
  async updateProfile(profileData) {
    try {
      const response = await apiService.put("/auth/profile/", profileData);
      return {
        success: true,
        user: response,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!apiService.token;
  }

  // Get user role from token
  getUserRole() {
    const token = apiService.token;
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload.role || "student";
      } catch {
        return null;
      }
    }
    return null;
  }
}

export default new AuthService();
