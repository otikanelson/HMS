import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './components/Dashboard';
import PatientList from './components/PatientList';
import StaffList from './components/StaffList';
import AddPatient from './components/AddPatient';
import Landing from './components/Landing';
import Login from './components/Login';
import './App.css';

// Main app layout component (authenticated routes)
function AppLayout() {
  return (
    <div className="app">
      <Sidebar />
      <div className="app-main">
        <TopBar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/patients" element={<PatientList />} />
            <Route path="/staff" element={<StaffList />} />
            <Route path="/add-patient" element={<AddPatient />} />
          </Routes>
        </main>
      </div>
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
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router future={{ v7_relativeSplatPath: true }}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/landing" element={<Landing />} />
          
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