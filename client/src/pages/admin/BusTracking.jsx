import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/axios';
import LiveMap from '../../components/LiveMap';
import { useSocket } from '../../hooks/useSocket';

export default function BusTracking() {
  const [buses, setBuses] = useState([]);
  const [gpsData, setGpsData] = useState([]);

  useEffect(() => {
    api.get('/admin/buses').then(r => setBuses(r.data));
    api.get('/admin/gps/live').then(r => setGpsData(r.data));
  }, []);

  const handleGpsUpdate = useCallback((data) => {
    setGpsData(prev => {
      const idx = prev.findIndex(g => g.bus_route_id === data.bus_route_id);
      if (idx >= 0) { const n = [...prev]; n[idx] = { ...n[idx], ...data }; return n; }
      return [...prev, data];
    });
  }, []);

  useSocket('gps:update', handleGpsUpdate);

  const markers = gpsData.map(g => ({
    id: g.bus_route_id,
    lat: g.latitude,
    lng: g.longitude,
    label: g.route_name || `Route ${g.bus_route_id}`,
    sublabel: g.bus_plate || '',
    speed: g.speed,
  }));

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Bus Tracking</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {buses.map(bus => (
          <div key={bus.id} className="bg-white rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚌</span>
              <div>
                <p className="font-semibold text-slate-800">{bus.route_name}</p>
                <p className="text-sm text-slate-500">{bus.bus_plate} - {bus.driver_name || 'No driver'}</p>
                <p className="text-xs text-slate-400">{bus.student_count} students assigned</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border p-4">
        <h3 className="text-lg font-semibold text-slate-700 mb-3">Live Bus Locations</h3>
        <LiveMap markers={markers} height="500px" />
        {markers.length === 0 && (
          <p className="text-center text-slate-400 mt-4">No GPS data available. Buses will appear when GPS modules send location data.</p>
        )}
      </div>
    </div>
  );
}
