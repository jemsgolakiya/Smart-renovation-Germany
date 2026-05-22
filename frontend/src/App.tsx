import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import Home from "./pages/Home/Home";
import Planning from "./pages/Planning/Planning";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { TopBar } from "./components/Topbar/Topbar";
import { Footer } from "./components/Footer/Footer";
import Contracting from "./pages/Contracting/Contracting";
import Financing from "./pages/Financing/Financing";
import LoginPage from "./pages/Login/Login";
import Register from "./pages/Register/Register";
import GmailCallback from "./pages/GmailCallback/GmailCallback";
import { ProjectProvider, useProject } from "./contexts/ProjectContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AppStateProvider } from "./contexts/AppStateContext";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import LandingPage from "./pages/Landing/Landing";
import AnalysisReportPage from "./pages/Contracting/AnalysisReportPage";
import { Toaster } from "./pages/Landing/ui/sonner";

const Layout: React.FC = () => {
  const { selectedProject } = useProject();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex bg-gray-50 min-h-screen">
      {selectedProject && (
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar isSidebarOpen={isSidebarOpen} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 p-4 sm:p-6 md:p-8">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/home" replace /> : <LoginPage />}
        />
        <Route
          path="/register"
          element={isAuthenticated ? <Navigate to="/home" replace /> : <Register />}
        />
        <Route
          path="/"
          element={
            isAuthenticated ? <Navigate to="/home" replace /> : <LandingPage />
          }
        />
        {/* Gmail OAuth Callback - public route for popup authentication */}
        <Route path="/gmail/callback" element={<GmailCallback />} />
        <Route path="/gmail-callback" element={<GmailCallback />} />
        {/* Protected routes with layout */}
        <Route
          element={
            <AppStateProvider>
              <ProjectProvider>
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              </ProjectProvider>
            </AppStateProvider>
          }
        >
          <Route path="/home" element={<Home />} />
          <Route path="/contracting" element={<Contracting />} />
          <Route path="/financing" element={<Financing />} />
          <Route path="/planning" element={<Planning />} />
          <Route 
            path="/projects/:projectId/contractors/:contractorId/analysis/:analysisId" 
            element={<AnalysisReportPage />} 
          />
        </Route>
      </Routes>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppRoutes />
      <Toaster />
    </AuthProvider>
  );
};

export default App;
