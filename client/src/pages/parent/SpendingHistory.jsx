import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import StatsCard from '../../components/StatsCard';
import DataTable from '../../components/DataTable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function SpendingHistory() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    api.get('/parent/children').then(r => {
      setChildren(r.data);
      if (r.data.length > 0) setSelectedChild(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedChild) return;
    Promise.all([
      api.get(`/parent/children/${selectedChild}/spending/summary`),
      api.get(`/parent/children/${selectedChild}/spending`),
    ]).then(([s, t]) => {
      setSummary(s.data);
      setTransactions(t.data);
    });
  }, [selectedChild]);

  const columns = [
    { key: 'created_at', label: 'Date/Time', render: (v) => new Date(v).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) },
    { key: 'item_name', label: 'Item' },
    { key: 'amount', label: 'Amount (OMR)', render: (v) => <span className="font-medium">{Number(v).toFixed(3)}</span> },
    { key: 'status', label: 'Status', render: (v) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${v === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        {v}
      </span>
    )},
  ];

  const dailyData = transactions.reduce((acc, t) => {
    const day = new Date(t.created_at).toLocaleDateString('en-US', { weekday: 'short' });
    const existing = acc.find(d => d.day === day);
    if (existing) existing.amount += Number(t.amount);
    else acc.push({ day, amount: Number(t.amount) });
    return acc;
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Spending History</h2>

      {children.length > 1 && (
        <select
          value={selectedChild || ''}
          onChange={(e) => setSelectedChild(Number(e.target.value))}
          className="px-4 py-2 border border-slate-300 rounded-lg mb-6 focus:ring-2 focus:ring-blue-500 outline-none"
        >
          {children.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
        </select>
      )}

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatsCard title="Today" value={`${Number(summary.today).toFixed(3)} OMR`} icon="📅" color="blue" />
          <StatsCard title="This Week" value={`${Number(summary.this_week).toFixed(3)} OMR`} icon="📊" color="green" />
          <StatsCard title="This Month" value={`${Number(summary.this_month).toFixed(3)} OMR`} icon="📈" color="purple" />
        </div>
      )}

      {dailyData.length > 0 && (
        <div className="bg-white rounded-xl border p-5 mb-6">
          <h3 className="text-lg font-semibold text-slate-700 mb-3">Daily Spending</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip formatter={(v) => `${Number(v).toFixed(3)} OMR`} />
              <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <DataTable columns={columns} data={transactions} emptyMessage="No transactions yet" />
    </div>
  );
}
