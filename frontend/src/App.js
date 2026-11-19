import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OpenVisitsProvider } from './context/OpenVisitsContext';
import ProtectedRoute from './routes/ProtectedRoute';
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
import StorageMap from './components/StorageMap';
import PayrollRunsList from './components/PayrollRunsList';
import PayrollRunDetail from './components/PayrollRunDetail';
import Visit from './components/Visit';
import PatientHistory from './components/PatientHistory';
import PatientDetails from './components/PatientDetails';
import VisitDetails from './components/VisitDetails';
import Login from './components/Login';
import Inventory from './components/Inventory';
import './App.css';

// Main app layout component (authenticated routes)
function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="app">
      <TopBar onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
      <Sidebar isOpen={sidebarOpen} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/patients" element={<PatientList />} />
          <Route path="/patients/:patientId/history" element={<PatientHistory />} />
          <Route path="/patients/:patientId/visit/:visitId" element={<PatientDetails />} />
          <Route path="/visits/:id" element={<VisitDetails />} />
          <Route path="/visit" element={<Visit />} />
          <Route path="/put-back" element={<Navigate to="/visit" replace />} />
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
          <Route path="/storage-map" element={
            <ProtectedRoute allowedAccessLevels={['ADMINISTRATOR']}>
              <StorageMap />
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
          <Route path="/inventory" element={<Inventory />} />
        </Routes>
      </main>
    </div>
  );
}

// Wrap AppLayout with OpenVisitsProvider
function AppLayoutWithProvider() {
  return (
    <OpenVisitsProvider>
      <AppLayout />
    </OpenVisitsProvider>
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
      <Route path="*" element={<Login />} />
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
              <AppLayoutWithProvider />
            </ProtectedRoute>
          } />
          
          {/* Root route - show landing if not authenticated, dashboard if authenticated */}
          <Route path="/*" element={<PublicRoutes />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;