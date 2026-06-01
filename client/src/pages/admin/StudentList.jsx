import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import DataTable from '../../components/DataTable';

export default function StudentList() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/admin/classes').then(r => setClasses(r.data));
    loadStudents();
  }, []);

  const loadStudents = async (cls, srch) => {
    const params = {};
    if (cls) params.class_name = cls;
    if (srch) params.search = srch;
    const { data } = await api.get('/admin/students', { params });
    setStudents(data);
  };

  useEffect(() => { loadStudents(filter, search); }, [filter, search]);

  const columns = [
    { key: 'student_id_code', label: 'ID' },
    { key: 'full_name', label: 'Name' },
    { key: 'class_name', label: 'Class' },
    { key: 'route_name', label: 'Bus Route' },
    { key: 'card_balance', label: 'Balance (OMR)', render: (v) => <span className="font-medium">{Number(v).toFixed(3)}</span> },
    { key: 'card_blocked', label: 'Card Status', render: (v) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${v ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
        {v ? 'Blocked' : 'Active'}
      </span>
    )},
    { key: 'nfc_card_uid', label: 'NFC UID', render: (v) => <code className="text-xs bg-slate-100 px-1 rounded">{v || 'N/A'}</code> },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Student Management</h2>
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Search students..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-64"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">All Classes</option>
          {classes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-sm text-slate-500 self-center">{students.length} students</span>
      </div>
      <DataTable columns={columns} data={students} emptyMessage="No students found" />
    </div>
  );
}
