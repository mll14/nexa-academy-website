import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

/**
 * @param {Object} props
 * @param {"student"|"admin"} props.role - Required role to access the route
 */
const ProtectedRoute = ({ children, role = "student" }) => {
  const { currentUser, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!currentUser) {
    const loginPath = role === "admin" ? "/admin-login" : "/student-login";
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (role === "admin" && !isAdmin()) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
