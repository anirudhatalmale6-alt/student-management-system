import React, { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function MenuManager() {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ item_name: '', price: '', category: 'meal', is_healthy: false });
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState('');

  const loadMenu = () => api.get('/vendor/menu').then(r => setItems(r.data));
  useEffect(() => { loadMenu(); }, []);

  const showMsg = (msg) => { setMessage(msg); setTimeout(() => setMessage(''), 3000); };

  const handleAdd = async () => {
    if (!newItem.item_name || !newItem.price) return;
    await api.post('/vendor/menu', { ...newItem, price: parseFloat(newItem.price) });
    setNewItem({ item_name: '', price: '', category: 'meal', is_healthy: false });
    showMsg('Item added');
    loadMenu();
  };

  const handleUpdate = async (item) => {
    await api.put(`/vendor/menu/${item.id}`, item);
    setEditing(null);
    showMsg('Item updated');
    loadMenu();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return;
    await api.delete(`/vendor/menu/${id}`);
    showMsg('Item deleted');
    loadMenu();
  };

  const handleToggle = async (item) => {
    await api.put(`/vendor/menu/${item.id}`, { ...item, available: !item.available });
    loadMenu();
  };

  const handleToggleHealthy = async (item) => {
    await api.put(`/vendor/menu/${item.id}`, { ...item, is_healthy: !item.is_healthy });
    loadMenu();
  };

  const categories = ['meal', 'snack', 'drink', 'other'];
  const categoryColors = { meal: 'bg-orange-100 text-orange-700', snack: 'bg-blue-100 text-blue-700', drink: 'bg-green-100 text-green-700', other: 'bg-slate-100 text-slate-700' };

  const healthyCount = items.filter(i => i.is_healthy).length;
  const totalCount = items.length;

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Menu Manager</h2>
      <p className="text-sm text-slate-500 mb-6">
        {healthyCount} of {totalCount} items marked as healthy
        <span className="ml-2 inline-block px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
          {totalCount > 0 ? Math.round((healthyCount / totalCount) * 100) : 0}% healthy options
        </span>
      </p>

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 mb-4 text-sm">{message}</div>
      )}

      <div className="bg-white rounded-xl border p-5 mb-6">
        <h3 className="text-lg font-semibold text-slate-700 mb-4">Add New Item</h3>
        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex-1 min-w-48">
            <label className="text-xs text-slate-500 block mb-1">Item Name</label>
            <input
              type="text"
              placeholder="Item name"
              value={newItem.item_name}
              onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
              className="px-4 py-2 border border-slate-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="w-32">
            <label className="text-xs text-slate-500 block mb-1">Price (OMR)</label>
            <input
              type="number"
              step="0.050"
              min="0.050"
              placeholder="Price"
              value={newItem.price}
              onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
              className="px-4 py-2 border border-slate-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Category</label>
            <select
              value={newItem.category}
              onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer py-2">
              <input
                type="checkbox"
                checked={newItem.is_healthy}
                onChange={(e) => setNewItem({ ...newItem, is_healthy: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              <span className="text-sm text-emerald-700 font-medium">Healthy</span>
            </label>
          </div>
          <button onClick={handleAdd} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
            Add Item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => (
          <div key={item.id} className={`bg-white rounded-xl border p-4 ${!item.available ? 'opacity-60' : ''} ${item.is_healthy ? 'border-emerald-300' : ''}`}>
            {editing === item.id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={item.item_name}
                  onChange={(e) => setItems(prev => prev.map(i => i.id === item.id ? { ...i, item_name: e.target.value } : i))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
                <input
                  type="number"
                  step="0.050"
                  value={item.price}
                  onChange={(e) => setItems(prev => prev.map(i => i.id === item.id ? { ...i, price: e.target.value } : i))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
                <div className="flex gap-2">
                  <button onClick={() => handleUpdate(item)} className="px-3 py-1 bg-green-600 text-white rounded text-sm">Save</button>
                  <button onClick={() => { setEditing(null); loadMenu(); }} className="px-3 py-1 bg-slate-200 rounded text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-800">{item.item_name}</h4>
                      {item.is_healthy ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">Healthy</span>
                      ) : null}
                    </div>
                    <p className="text-lg font-bold text-blue-600 mt-1">{Number(item.price).toFixed(3)} OMR</p>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${categoryColors[item.category] || categoryColors.other}`}>
                      {item.category}
                    </span>
                  </div>
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input type="checkbox" checked={!!item.available} onChange={() => handleToggle(item)} className="sr-only" />
                      <div className={`w-10 h-6 rounded-full transition-colors ${item.available ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                      <div className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform ${item.available ? 'translate-x-4' : ''}`}></div>
                    </div>
                  </label>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setEditing(item.id)} className="px-3 py-1 bg-slate-100 rounded text-sm text-slate-600 hover:bg-slate-200">Edit</button>
                  <button onClick={() => handleToggleHealthy(item)} className={`px-3 py-1 rounded text-sm ${item.is_healthy ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'} hover:opacity-80`}>
                    {item.is_healthy ? 'Healthy' : 'Mark Healthy'}
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="px-3 py-1 bg-red-50 rounded text-sm text-red-600 hover:bg-red-100">Delete</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
