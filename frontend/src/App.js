import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './components/Dashboard';
import PatientList from './components/PatientList';
import StaffList from './components/StaffList';
import Schedule from './components/Schedule';
import AddPatient from './components/AddPatient';
import AddStaff from './components/AddStaff';
import ChangePassword from './components/ChangePassword';
import Reports from './components/Reports';
import PayrollRunsList from './components/Payrollrunslist';
import PayrollRunDetail from './components/Payrollrundetail';
import Login from './components/Login';
import './App.css';

// Main app layout component (authenticated routes)
function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="app">
      <TopBar onToggleSidebar={toggleSidebar} />
      <Sidebar isOpen={sidebarOpen} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/patients" element={<PatientList />} />
          <Route path="/staff" element={
            <ProtectedRoute allowedAccessLevels={['ADMINISTRATOR', 'RECORDS_OPERATOR']}>
              <StaffList />
            </ProtectedRoute>
          } />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/add-patient" element={<AddPatient />} />
          <Route path="/add-staff" element={
            <ProtectedRoute allowedAccessLevels={['ADMINISTRATOR']}>
              <AddStaff />
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute allowedAccessLevels={['ADMINISTRATOR']}>
              <Reports />
            </ProtectedRoute>
          } />
          <Route path="/payroll" element={
            <ProtectedRoute allowedAccessLevels={['ADMINISTRATOR']}>
              <PayrollRunsList />
            </ProtectedRoute>
          } />
          <Route path="/payroll/:id" element={
            <ProtectedRoute allowedAccessLevels={['ADMINISTRATOR']}>
              <PayrollRunDetail />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
    </div>
  );
}

// Public routes component
function PublicRoutes() {
  const { isAuthenticated } = useAuth();
  
  // If user is authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router future={{ 
        v7_relativeSplatPath: true,
        v7_startTransition: true 
      }}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Change password route - requires authentication but not wrapped in layout */}
          <Route path="/change-password" element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          } />
          
          {/* Protected routes */}
          <Route path="/*" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          } />
          
          {/* Root route - show landing if not authenticated, dashboard if authenticated */}
          <Route path="/" element={<PublicRoutes />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;