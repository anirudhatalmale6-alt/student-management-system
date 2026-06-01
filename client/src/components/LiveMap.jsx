import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const busIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function MarkerUpdater({ markers }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, []);
  return null;
}

export default function LiveMap({ markers = [], height = '400px', center = [23.5880, 58.3829] }) {
  return (
    <div style={{ height }} className="rounded-xl overflow-hidden border">
      <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        {markers.map((marker, i) => (
          <Marker key={marker.id || i} position={[marker.lat, marker.lng]} icon={busIcon}>
            <Popup>
              <div>
                <strong>{marker.label || 'Location'}</strong>
                {marker.sublabel && <p className="text-xs">{marker.sublabel}</p>}
                {marker.speed !== undefined && <p className="text-xs">Speed: {marker.speed} km/h</p>}
              </div>
            </Popup>
          </Marker>
        ))}
        {markers.length > 0 && <MarkerUpdater markers={markers} />}
      </MapContainer>
    </div>
  );
}
