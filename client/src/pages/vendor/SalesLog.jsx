import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import DataTable from '../../components/DataTable';

export default function SalesLog() {
  const [sales, setSales] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const loadSales = async () => {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const { data } = await api.get('/vendor/sales', { params });
    setSales(data);
  };

  useEffect(() => { loadSales(); }, [from, to]);

  const columns = [
    { key: 'created_at', label: 'Date/Time', render: (v) => new Date(v).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) },
    { key: 'student_name', label: 'Student' },
    { key: 'student_id_code', label: 'Student ID' },
    { key: 'item_name', label: 'Item' },
    { key: 'amount', label: 'Amount (OMR)', render: (v) => Number(v).toFixed(3) },
    { key: 'status', label: 'Status', render: (v, row) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${v === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        {v === 'completed' ? 'Paid' : row.declined_reason?.replace('_', ' ') || 'Declined'}
      </span>
    )},
  ];

  const totalAmount = sales.filter(s => s.status === 'completed').reduce((sum, s) => sum + Number(s.amount), 0);

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Sales Log</h2>

      <div className="flex gap-4 mb-6 flex-wrap items-center">
        <div>
          <label className="text-xs text-slate-500">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="block px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div>
          <label className="text-xs text-slate-500">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="block px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div className="self-end">
          <p className="text-sm text-slate-600">{sales.length} transactions | Total: <strong>{totalAmount.toFixed(3)} OMR</strong></p>
        </div>
      </div>

      <DataTable columns={columns} data={sales} emptyMessage="No sales found for this period" />
    </div>
  );
}
