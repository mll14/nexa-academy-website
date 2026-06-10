import React, { createContext, useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../services/authService";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const loadUser = async () => {
      // First, try to rehydrate from localStorage for instant UI persistence
      try {
        const stored = localStorage.getItem("currentUser");
        if (stored) {
          const parsed = JSON.parse(stored);
          setCurrentUser(parsed);
          setUserRole(parsed?.role || null);
        }
      } catch {}

      // Then verify tokens with server to refresh user data
      if (authService.isAuthenticated()) {
        const result = await authService.verifyToken();
        if (result.success) {
          setCurrentUser(result.user);
          setUserRole(result.role || result.user?.role || null);
          try {
            localStorage.setItem("currentUser", JSON.stringify(result.user));
          } catch {}
        }
        // If verify fails (network error, server restart, etc.) we keep the
        // localStorage-hydrated user in state so the session survives a refresh.
        // Actual 401s from API calls will trigger logout via the apiService
        // interceptor, so there is no security concern here.
      }
      setLoading(false);
    };

    loadUser();
  }, []);

  const signUp = async (userData) => {
    setError(null);
    const result = await authService.signUp(userData);
    if (result.success) {
      setCurrentUser(result.user);
      setUserRole("student");
    } else {
      setError(result.error);
    }
    return result;
  };

  const login = async (email, password) => {
    setError(null);
    const result = await authService.login(email, password);
    if (result.success) {
      setCurrentUser(result.user);
      setUserRole(result.role);
    } else {
      setError(result.error);
    }
    return result;
  };

  const adminLogin = async (email, password) => {
    setError(null);
    const result = await authService.adminLogin(email, password);
    if (result.success) {
      setCurrentUser(result.user);
      setUserRole("admin");
    } else {
      setError(result.error);
    }
    return result;
  };
  const googleLogin = async (googleToken) => {
    setError(null);
    const result = await authService.googleLogin(googleToken);
    if (result.success) {
      setCurrentUser(result.user);
      setUserRole(result.user?.role || "student");
    } else {
      setError(result.error);
    }
    return result;
  };

  const navigate = useNavigate();

  const logout = async (redirectTo = "/") => {
    // Navigate first — before clearing state — so ProtectedRoute doesn't
    // intercept and redirect to the login page instead.
    try {
      navigate(redirectTo, { replace: true });
    } catch {
      // ignore if called outside router context
    }
    try {
      await authService.logout();
    } catch {
      // ignore
    }
    setCurrentUser(null);
    setUserRole(null);
  };

  const updateProfile = async (profileData) => {
    setError(null);
    const result = await authService.updateProfile(profileData);
    if (result.success) {
      setCurrentUser(result.user);
    } else {
      setError(result.error);
    }
    return result;
  };

  const value = {
    currentUser,
    userRole,
    loading,
    error,
    signUp,
    login,
    adminLogin,
    googleLogin,
    logout,
    updateProfile,
    isAuthenticated: authService.isAuthenticated(),
    isAdmin: () => userRole === "admin",
    isStudent: () => userRole === "student",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
