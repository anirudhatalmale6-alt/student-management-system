import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/axios';
import StatsCard from '../../components/StatsCard';
import DataTable from '../../components/DataTable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useSocket } from '../../hooks/useSocket';

export default function VendorDashboard() {
  const [summary, setSummary] = useState(null);
  const [balance, setBalance] = useState(0);
  const [sales, setSales] = useState([]);
  const [dailyData, setDailyData] = useState([]);

  const loadData = async () => {
    const [s, b, sl, d] = await Promise.all([
      api.get('/vendor/sales/summary'),
      api.get('/vendor/balance'),
      api.get('/vendor/sales'),
      api.get('/vendor/sales/daily'),
    ]);
    setSummary(s.data);
    setBalance(b.data.balance);
    setSales(sl.data);
    setDailyData(d.data);
  };

  useEffect(() => { loadData(); }, []);

  const handleTransaction = useCallback((data) => {
    loadData();
  }, []);

  useSocket('pos:transaction', handleTransaction);

  const columns = [
    { key: 'created_at', label: 'Time', render: (v) => new Date(v).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) },
    { key: 'student_name', label: 'Student' },
    { key: 'student_id_code', label: 'Student ID' },
    { key: 'item_name', label: 'Item' },
    { key: 'amount', label: 'Amount (OMR)', render: (v) => <span className="font-medium">{Number(v).toFixed(3)}</span> },
    { key: 'status', label: 'Status', render: (v, row) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${v === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        {v === 'completed' ? 'Paid' : row.declined_reason?.replace('_', ' ') || 'Declined'}
      </span>
    )},
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Vendor Dashboard</h2>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard title="Today's Sales" value={`${Number(summary.today_total).toFixed(3)} OMR`} icon="💰" color="green" subtitle={`${summary.today_count} transactions`} />
          <StatsCard title="This Week" value={`${Number(summary.week_total).toFixed(3)} OMR`} icon="📊" color="blue" />
          <StatsCard title="This Month" value={`${Number(summary.month_total).toFixed(3)} OMR`} icon="📈" color="purple" />
          <StatsCard title="Total Balance" value={`${Number(balance).toFixed(3)} OMR`} icon="🏦" color="yellow" />
        </div>
      )}

      {dailyData.length > 0 && (
        <div className="bg-white rounded-xl border p-5 mb-6">
          <h3 className="text-lg font-semibold text-slate-700 mb-3">Last 7 Days Sales</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { weekday: 'short' })} />
              <YAxis />
              <Tooltip formatter={(v) => `${Number(v).toFixed(3)} OMR`} />
              <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <h3 className="text-lg font-semibold text-slate-700 mb-3">Today's Transactions</h3>
      <DataTable columns={columns} data={sales} emptyMessage="No sales today" />
    </div>
  );
}
