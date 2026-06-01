import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/axios';
import StatsCard from '../../components/StatsCard';
import { useSocket } from '../../hooks/useSocket';

export default function ParentDashboard() {
  const [children, setChildren] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const loadData = async () => {
    const [c, n] = await Promise.all([
      api.get('/parent/children'),
      api.get('/notifications'),
    ]);
    setChildren(c.data);
    setNotifications(n.data.slice(0, 10));
  };

  useEffect(() => { loadData(); }, []);

  const handleAttUpdate = useCallback(() => { loadData(); }, []);
  useSocket('attendance:update', handleAttUpdate);
  useSocket('spending:update', handleAttUpdate);

  const statusStyles = {
    present: 'bg-green-100 text-green-700 border-green-200',
    late: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    absent: 'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Parent Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {children.map(child => (
          <div key={child.id} className="bg-white rounded-xl border p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-slate-800">{child.full_name}</h3>
                <p className="text-sm text-slate-500">{child.student_id_code} - {child.class_name}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusStyles[child.today_status] || statusStyles.absent}`}>
                {child.today_status || 'absent'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-50 rounded-lg p-2">
                <p className="text-slate-500 text-xs">Balance</p>
                <p className="font-bold text-slate-800">{Number(child.card_balance).toFixed(3)} OMR</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2">
                <p className="text-slate-500 text-xs">Daily Limit</p>
                <p className="font-bold text-slate-800">{Number(child.spending_limit).toFixed(3)} OMR</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2">
                <p className="text-slate-500 text-xs">Bus Route</p>
                <p className="font-bold text-slate-800 text-xs">{child.route_name || 'N/A'}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2">
                <p className="text-slate-500 text-xs">Card</p>
                <p className={`font-bold text-xs ${child.card_blocked ? 'text-red-600' : 'text-green-600'}`}>
                  {child.card_blocked ? 'Blocked' : 'Active'}
                </p>
              </div>
            </div>
            {child.today_gate_in && (
              <p className="text-xs text-slate-400 mt-2">
                Gate in: {new Date(child.today_gate_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border p-5">
        <h3 className="text-lg font-semibold text-slate-700 mb-3">Recent Notifications</h3>
        {notifications.length === 0 ? (
          <p className="text-slate-400 text-sm">No notifications yet</p>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => (
              <div key={n.id} className={`flex items-start gap-3 p-3 rounded-lg ${n.is_read ? 'bg-slate-50' : 'bg-blue-50'}`}>
                <span className="text-lg">{n.is_read ? '📩' : '📬'}</span>
                <div>
                  <p className="text-sm font-medium text-slate-700">{n.title}</p>
                  <p className="text-xs text-slate-500">{n.message}</p>
                  <p className="text-xs text-slate-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
