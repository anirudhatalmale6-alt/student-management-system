import React, { useEffect, useState, useCallback } from 'react';
import api from '../../api/axios';
import LiveMap from '../../components/LiveMap';
import { useSocket } from '../../hooks/useSocket';

export default function BusTracking() {
  const [buses, setBuses] = useState([]);
  const [gpsData, setGpsData] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);

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

  const markers = gpsData.map(g => {
    const studentNames = g.students ? g.students.map(s => s.full_name).join(', ') : '';
    return {
      id: g.bus_route_id,
      lat: g.latitude,
      lng: g.longitude,
      label: g.route_name || `Route ${g.bus_route_id}`,
      sublabel: `${g.bus_plate || ''} | ${g.students ? g.students.length : 0} students`,
      speed: g.speed,
    };
  });

  const selectedGps = gpsData.find(g => g.bus_route_id === selectedBus);

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Bus Tracking - Live GPS</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {buses.map(bus => (
          <div
            key={bus.id}
            onClick={() => setSelectedBus(selectedBus === bus.id ? null : bus.id)}
            className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${selectedBus === bus.id ? 'ring-2 ring-blue-500 border-blue-300' : ''}`}
          >
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border p-4">
          <h3 className="text-lg font-semibold text-slate-700 mb-3">Live Bus Locations</h3>
          <LiveMap markers={markers} height="500px" />
          {markers.length === 0 && (
            <p className="text-center text-slate-400 mt-4">No GPS data available. Buses will appear when GPS modules send location data.</p>
          )}
        </div>

        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-lg font-semibold text-slate-700 mb-3">
            {selectedBus ? `Students on ${buses.find(b => b.id === selectedBus)?.route_name || 'Bus'}` : 'All Students by Bus'}
          </h3>
          {selectedBus && selectedGps?.students ? (
            <div className="space-y-2">
              {selectedGps.students.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                  <span className="text-lg">👨‍🎓</span>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{s.full_name}</p>
                    <p className="text-xs text-slate-400">{s.student_id_code} - {s.class_name}</p>
                  </div>
                </div>
              ))}
              {selectedGps.students.length === 0 && (
                <p className="text-sm text-slate-400">No students assigned to this route</p>
              )}
            </div>
          ) : selectedBus ? (
            <p className="text-sm text-slate-400">No GPS data for this bus yet</p>
          ) : (
            <div className="space-y-3">
              {buses.map(bus => (
                <div key={bus.id} className="border-b pb-2 last:border-0">
                  <p className="text-sm font-semibold text-slate-700">{bus.route_name}</p>
                  <p className="text-xs text-slate-500">{bus.student_count} students - {bus.driver_name}</p>
                  <button
                    onClick={() => setSelectedBus(bus.id)}
                    className="text-xs text-blue-600 hover:underline mt-1"
                  >
                    View students
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
