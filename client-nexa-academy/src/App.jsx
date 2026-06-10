import React from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import ScrollToTop from "./components/ScrollToTop";
import ProtectedRoute from "./components/ProtectedRoute";
import PopupBanner from "./components/shared/PopupBanner";

// Public pages
import Home from "./pages/landing-page/Home";
import ProgramPage from "./pages/landing-page/ProgramPage";
import ProgramDetail from "./pages/landing-page/ProgramDetail";
import ApplicationPage from "./pages/landing-page/ApplicationPage";
import FAQ from "./pages/landing-page/FAQ";
import ContactUs from "./pages/landing-page/ContactUs";
import Privacy from "./pages/landing-page/Privacy";
import Terms from "./pages/landing-page/Terms";
import NotFound from "./pages/landing-page/NotFound";

// Auth pages
import StudentLogin from "./pages/auth/StudentLogin";
import StudentDashboard from "./pages/student-dashboard/StudentDashboard";

// Admin pages
import AdminLogin from "./pages/auth/AdminLogin";
import AdminPage from "./pages/admin/AdminPage";
import ApplicationsList from "./pages/admin/ApplicationsList";
import ContactMessages from "./pages/admin/ContactMessages";
import Transactions from "./pages/admin/Transactions";
import ManualEnrollment from "./pages/admin/ManualEnrollment";
import NewsletterSubscribers from "./pages/admin/NewsletterSubscribers";
import ExpressInterestAdmin from "./pages/admin/ExpressInterestAdmin";
import StudentDetail from "./pages/admin/StudentDetail";
import Interviews from "./pages/admin/Interviews";
import SanityStudio from "./pages/admin/Studio";
import AdminPrograms from "./pages/admin/AdminPrograms";
import Notifications from "./pages/admin/Notifications";
import Blog from "./pages/landing-page/Blog";
import BlogPost from "./pages/landing-page/BlogPost";
import ChatWidget from "./components/ChatWidget";

const App = () => {
  return (
    <ScrollToTop>
      <>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { fontSize: "0.875rem" },
          }}
        />
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/programs" element={<ProgramPage />} />
          <Route path="/programs/:slug" element={<ProgramDetail />} />
          <Route path="/apply" element={<ApplicationPage />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />

          {/* Student auth */}
          <Route path="/student-login" element={<StudentLogin />} />
          <Route
            path="/student-dashboard/:uid"
            element={
              <ProtectedRoute role="student">
                <StudentDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin auth */}
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/notifications"
            element={
              <ProtectedRoute role="admin">
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/applications"
            element={
              <ProtectedRoute role="admin">
                <ApplicationsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/messages"
            element={
              <ProtectedRoute role="admin">
                <ContactMessages />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/transactions"
            element={
              <ProtectedRoute role="admin">
                <Transactions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/enroll"
            element={
              <ProtectedRoute role="admin">
                <ManualEnrollment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/newsletter"
            element={
              <ProtectedRoute role="admin">
                <NewsletterSubscribers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/express-interest"
            element={
              <ProtectedRoute role="admin">
                <ExpressInterestAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/students/:uid"
            element={
              <ProtectedRoute role="admin">
                <StudentDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/interviews"
            element={
              <ProtectedRoute role="admin">
                <Interviews />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/programs"
            element={<ProtectedRoute role="admin"><AdminPrograms /></ProtectedRoute>}
          />
          <Route
            path="/admin/studio"
            element={<ProtectedRoute role="admin"><SanityStudio /></ProtectedRoute>}
          />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <ChatWidget />
        <PopupBanner />
      </>
    </ScrollToTop>
  );
};

export default App;
