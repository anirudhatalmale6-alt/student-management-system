import React, { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function CardControls() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [child, setChild] = useState(null);
  const [topupAmount, setTopupAmount] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/parent/children').then(r => {
      setChildren(r.data);
      if (r.data.length > 0) {
        setSelectedChild(r.data[0].id);
        setChild(r.data[0]);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedChild) {
      const c = children.find(ch => ch.id === selectedChild);
      if (c) { setChild(c); setNewLimit(c.spending_limit); }
    }
  }, [selectedChild, children]);

  const reload = async () => {
    const { data } = await api.get('/parent/children');
    setChildren(data);
    const c = data.find(ch => ch.id === selectedChild);
    if (c) setChild(c);
  };

  const handleToggleBlock = async () => {
    await api.patch(`/parent/children/${selectedChild}/card`, { card_blocked: !child.card_blocked });
    setMessage(child.card_blocked ? 'Card unblocked' : 'Card blocked');
    await reload();
    setTimeout(() => setMessage(''), 3000);
  };

  const handleTopup = async () => {
    const amount = parseFloat(topupAmount);
    if (!amount || amount <= 0) return;
    await api.post(`/parent/children/${selectedChild}/topup`, { amount });
    setMessage(`Added ${amount.toFixed(3)} OMR`);
    setTopupAmount('');
    await reload();
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSetLimit = async () => {
    const limit = parseFloat(newLimit);
    if (!limit || limit <= 0) return;
    await api.patch(`/parent/children/${selectedChild}/card`, { spending_limit: limit });
    setMessage(`Daily limit set to ${limit.toFixed(3)} OMR`);
    await reload();
    setTimeout(() => setMessage(''), 3000);
  };

  if (!child) return <p className="text-slate-400">Loading...</p>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Card Controls</h2>

      {children.length > 1 && (
        <select
          value={selectedChild || ''}
          onChange={(e) => setSelectedChild(Number(e.target.value))}
          className="px-4 py-2 border border-slate-300 rounded-lg mb-6 focus:ring-2 focus:ring-blue-500 outline-none"
        >
          {children.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
        </select>
      )}

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 mb-6 text-sm">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-semibold text-slate-700 mb-4">{child.full_name}'s Card</h3>
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-6 text-white mb-4">
            <p className="text-sm opacity-75">Card Balance</p>
            <p className="text-3xl font-bold mt-1">{Number(child.card_balance).toFixed(3)} OMR</p>
            <div className="flex justify-between mt-4 text-sm">
              <span>NFC: {child.nfc_card_uid || 'N/A'}</span>
              <span className={child.card_blocked ? 'text-red-300' : 'text-green-300'}>
                {child.card_blocked ? 'BLOCKED' : 'ACTIVE'}
              </span>
            </div>
          </div>
          <button
            onClick={handleToggleBlock}
            className={`w-full py-2.5 rounded-lg font-medium transition-colors ${
              child.card_blocked
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            {child.card_blocked ? 'Unblock Card' : 'Block Card'}
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6">
            <h3 className="text-lg font-semibold text-slate-700 mb-4">Top Up Balance</h3>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.100"
                min="0.100"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                placeholder="Amount in OMR"
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button onClick={handleTopup} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                Top Up
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              {[1, 2, 5, 10].map(amt => (
                <button
                  key={amt}
                  onClick={() => setTopupAmount(amt.toString())}
                  className="px-3 py-1 bg-slate-100 rounded-lg text-sm text-slate-600 hover:bg-slate-200"
                >
                  {amt} OMR
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6">
            <h3 className="text-lg font-semibold text-slate-700 mb-4">Daily Spending Limit</h3>
            <p className="text-sm text-slate-500 mb-3">Current limit: {Number(child.spending_limit).toFixed(3)} OMR/day</p>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.500"
                min="0.500"
                max="50"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button onClick={handleSetLimit} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                Set Limit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
