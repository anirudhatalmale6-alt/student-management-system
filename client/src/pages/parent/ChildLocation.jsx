import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/axios';
import LiveMap from '../../components/LiveMap';
import { useSocket } from '../../hooks/useSocket';

export default function ChildLocation() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    api.get('/parent/children').then(r => {
      setChildren(r.data);
      if (r.data.length > 0) setSelectedChild(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedChild) return;
    api.get(`/parent/children/${selectedChild}/location`).then(r => setLocation(r.data)).catch(() => {});
  }, [selectedChild]);

  const handleGpsUpdate = useCallback((data) => {
    setLocation(prev => ({
      ...prev,
      latitude: data.latitude,
      longitude: data.longitude,
      speed: data.speed,
    }));
  }, []);

  useSocket('gps:update', handleGpsUpdate);

  const child = children.find(c => c.id === selectedChild);
  const markers = location ? [{
    id: 1,
    lat: location.latitude,
    lng: location.longitude,
    label: `${child?.full_name || 'Child'}'s Bus`,
    sublabel: location.route_name || '',
    speed: location.speed,
  }] : [];

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Child Location</h2>

      {children.length > 1 && (
        <select
          value={selectedChild || ''}
          onChange={(e) => setSelectedChild(Number(e.target.value))}
          className="px-4 py-2 border border-slate-300 rounded-lg mb-6 focus:ring-2 focus:ring-blue-500 outline-none"
        >
          {children.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
        </select>
      )}

      {child && (
        <div className="bg-white rounded-xl border p-4 mb-4">
          <div className="flex items-center gap-4">
            <span className="text-2xl">👨‍🎓</span>
            <div>
              <p className="font-semibold">{child.full_name}</p>
              <p className="text-sm text-slate-500">{child.class_name} - {child.route_name || 'No bus assigned'}</p>
            </div>
            {location && (
              <div className="ml-auto text-right">
                <p className="text-xs text-slate-400">Last update</p>
                <p className="text-sm text-slate-600">{location.recorded_at ? new Date(location.recorded_at).toLocaleTimeString() : 'Live'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border p-4">
        <h3 className="text-lg font-semibold text-slate-700 mb-3">Live Bus Location</h3>
        {markers.length > 0 ? (
          <LiveMap markers={markers} height="500px" />
        ) : (
          <div className="h-64 flex items-center justify-center bg-slate-50 rounded-xl">
            <div className="text-center text-slate-400">
              <p className="text-4xl mb-2">📍</p>
              <p>No location data available</p>
              <p className="text-xs mt-1">Location will appear when the bus GPS module is active</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
