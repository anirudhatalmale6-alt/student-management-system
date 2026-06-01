import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/axios';
import StatsCard from '../../components/StatsCard';
import DataTable from '../../components/DataTable';
import { useSocket } from '../../hooks/useSocket';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [summary, setSummary] = useState([]);
  const [sensors, setSensors] = useState([]);

  const loadData = async () => {
    try {
      const [s, att, sen] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/attendance/summary'),
        api.get('/admin/sensor-counts'),
      ]);
      setStats(s.data);
      setSummary(att.data);
      setSensors(sen.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleAttUpdate = useCallback(() => { loadData(); }, []);
  const handleSensorUpdate = useCallback((data) => {
    setSensors(prev => {
      const idx = prev.findIndex(s => s.location === data.location);
      if (idx >= 0) { const n = [...prev]; n[idx] = data; return n; }
      return [...prev, data];
    });
  }, []);

  useSocket('attendance:update', handleAttUpdate);
  useSocket('sensor:update', handleSensorUpdate);

  const summaryColumns = [
    { key: 'class_name', label: 'Class' },
    { key: 'total', label: 'Total' },
    { key: 'present', label: 'Present', render: (v) => <span className="text-green-600 font-medium">{v}</span> },
    { key: 'late', label: 'Late', render: (v) => <span className="text-yellow-600 font-medium">{v}</span> },
    { key: 'absent', label: 'Absent', render: (v) => <span className="text-red-600 font-medium">{v}</span> },
    { key: 'present', label: '% Present', render: (v, row) => {
      const pct = row.total > 0 ? Math.round(((row.present + row.late) / row.total) * 100) : 0;
      return <span className="font-medium">{pct}%</span>;
    }},
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Admin Dashboard</h2>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatsCard title="Total Students" value={stats.total_students} icon="👨‍🎓" color="blue" />
          <StatsCard title="Present Today" value={stats.present_today} icon="✅" color="green" />
          <StatsCard title="Late Today" value={stats.late_today} icon="⏰" color="yellow" />
          <StatsCard title="Absent Today" value={stats.absent_today} icon="❌" color="red" />
          <StatsCard title="Active Buses" value={stats.active_buses} icon="🚌" color="purple" />
        </div>
      )}

      {sensors.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {sensors.map((s) => (
            <div key={s.location} className="bg-white rounded-xl border p-4">
              <p className="text-xs text-slate-500 uppercase">{s.location.replace(/_/g, ' ')}</p>
              <div className="flex items-center gap-4 mt-2">
                <div>
                  <p className="text-2xl font-bold text-green-600">{s.count_in}</p>
                  <p className="text-xs text-slate-400">In</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{s.count_out}</p>
                  <p className="text-xs text-slate-400">Out</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mb-2">
        <h3 className="text-lg font-semibold text-slate-700 mb-3">Attendance by Class - Today</h3>
      </div>
      <DataTable columns={summaryColumns} data={summary} emptyMessage="No attendance data for today" />
    </div>
  );
}
