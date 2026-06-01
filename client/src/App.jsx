import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import StudentList from './pages/admin/StudentList';
import AttendanceView from './pages/admin/AttendanceView';
import BusTracking from './pages/admin/BusTracking';
import ParentDashboard from './pages/parent/ParentDashboard';
import SpendingHistory from './pages/parent/SpendingHistory';
import CardControls from './pages/parent/CardControls';
import ChildLocation from './pages/parent/ChildLocation';
import VendorDashboard from './pages/vendor/VendorDashboard';
import SalesLog from './pages/vendor/SalesLog';
import MenuManager from './pages/vendor/MenuManager';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to={`/${user.role}`} />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={`/${user.role}`} /> : <LoginPage />} />

      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/students" element={<ProtectedRoute allowedRoles={['admin']}><StudentList /></ProtectedRoute>} />
      <Route path="/admin/attendance" element={<ProtectedRoute allowedRoles={['admin']}><AttendanceView /></ProtectedRoute>} />
      <Route path="/admin/buses" element={<ProtectedRoute allowedRoles={['admin']}><BusTracking /></ProtectedRoute>} />

      <Route path="/parent" element={<ProtectedRoute allowedRoles={['parent']}><ParentDashboard /></ProtectedRoute>} />
      <Route path="/parent/spending" element={<ProtectedRoute allowedRoles={['parent']}><SpendingHistory /></ProtectedRoute>} />
      <Route path="/parent/card" element={<ProtectedRoute allowedRoles={['parent']}><CardControls /></ProtectedRoute>} />
      <Route path="/parent/location" element={<ProtectedRoute allowedRoles={['parent']}><ChildLocation /></ProtectedRoute>} />

      <Route path="/vendor" element={<ProtectedRoute allowedRoles={['vendor']}><VendorDashboard /></ProtectedRoute>} />
      <Route path="/vendor/sales" element={<ProtectedRoute allowedRoles={['vendor']}><SalesLog /></ProtectedRoute>} />
      <Route path="/vendor/menu" element={<ProtectedRoute allowedRoles={['vendor']}><MenuManager /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}
