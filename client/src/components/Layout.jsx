import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const menuItems = {
  admin: [
    { path: '/admin', label: 'Dashboard', icon: '📊' },
    { path: '/admin/students', label: 'Students', icon: '👨‍🎓' },
    { path: '/admin/attendance', label: 'Attendance', icon: '📋' },
    { path: '/admin/buses', label: 'Bus Tracking', icon: '🚌' },
  ],
  parent: [
    { path: '/parent', label: 'Dashboard', icon: '🏠' },
    { path: '/parent/spending', label: 'Spending', icon: '💰' },
    { path: '/parent/card', label: 'Card Control', icon: '💳' },
    { path: '/parent/location', label: 'Location', icon: '📍' },
  ],
  vendor: [
    { path: '/vendor', label: 'Dashboard', icon: '📊' },
    { path: '/vendor/sales', label: 'Sales Log', icon: '🧾' },
    { path: '/vendor/menu', label: 'Menu', icon: '🍔' },
  ],
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState(0);
  const items = menuItems[user?.role] || [];

  useEffect(() => {
    api.get('/notifications/unread-count').then(r => setNotifications(r.data.count)).catch(() => {});
    const interval = setInterval(() => {
      api.get('/notifications/unread-count').then(r => setNotifications(r.data.count)).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabels = { admin: 'School Admin', parent: 'Parent', vendor: 'Canteen Vendor', driver: 'Bus Driver' };

  return (
    <div className="flex h-screen bg-slate-100">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-slate-800 text-white transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-slate-700">
          {sidebarOpen ? (
            <div>
              <h1 className="text-lg font-bold">SMS</h1>
              <p className="text-xs text-slate-400">Student Management</p>
            </div>
          ) : (
            <h1 className="text-lg font-bold text-center">S</h1>
          )}
        </div>
        <nav className="flex-1 py-4">
          {items.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-4 py-3 text-sm transition-colors ${
                location.pathname === item.path
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {sidebarOpen && <span className="ml-3">{item.label}</span>}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700">
          {sidebarOpen && (
            <div className="mb-2">
              <p className="text-sm font-medium">{user?.full_name}</p>
              <p className="text-xs text-slate-400">{roleLabels[user?.role]}</p>
            </div>
          )}
          <button onClick={handleLogout} className="w-full text-left text-sm text-red-400 hover:text-red-300">
            {sidebarOpen ? 'Logout' : '→'}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm px-6 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-600 hover:text-slate-800">
            ☰
          </button>
          <div className="flex items-center gap-4">
            <Link to={`/${user?.role}`} className="relative">
              <span className="text-xl">🔔</span>
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {notifications}
                </span>
              )}
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
