import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import DataTable from '../../components/DataTable';

export default function AttendanceView() {
  const [attendance, setAttendance] = useState([]);
  const [classes, setClasses] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [classFilter, setClassFilter] = useState('');

  useEffect(() => {
    api.get('/admin/classes').then(r => setClasses(r.data));
  }, []);

  useEffect(() => {
    const params = { date };
    if (classFilter) params.class_name = classFilter;
    api.get('/admin/attendance', { params }).then(r => setAttendance(r.data));
  }, [date, classFilter]);

  const handleExport = () => {
    window.open(`/api/admin/attendance/export?date=${date}`, '_blank');
  };

  const statusBadge = (status) => {
    const styles = {
      present: 'bg-green-100 text-green-700',
      late: 'bg-yellow-100 text-yellow-700',
      absent: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.absent}`}>
        {status || 'absent'}
      </span>
    );
  };

  const formatTime = (t) => t ? new Date(t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-';

  const columns = [
    { key: 'student_id_code', label: 'ID' },
    { key: 'full_name', label: 'Name' },
    { key: 'class_name', label: 'Class' },
    { key: 'status', label: 'Status', render: (v) => statusBadge(v) },
    { key: 'gate_in', label: 'Gate In', render: (v) => formatTime(v) },
    { key: 'bus_in', label: 'Bus In', render: (v) => formatTime(v) },
    { key: 'class_in', label: 'Class In', render: (v) => formatTime(v) },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Attendance Records</h2>
      <div className="flex gap-4 mb-6 flex-wrap">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">All Classes</option>
          {classes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
        >
          Export CSV
        </button>
        <span className="text-sm text-slate-500 self-center">{attendance.length} records</span>
      </div>
      <DataTable columns={columns} data={attendance} emptyMessage="No attendance records for this date" />
    </div>
  );
}
