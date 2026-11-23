import React, { useState, useEffect, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  LayersControl,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const API_URL = 'http://localhost:5000/api/customers';

// প্রিমিয়াম কালার প্যালেট
const PREMIUM_COLORS = {
  blue: '#2563eb',   // < 9 (High / Strong)
  green: '#10b981',  // 9 - 22 (Good)
  yellow: '#f59e0b', // 23 - 26 (Warning)
  red: '#ef4444',    // >= 27 (Critical)
};

// লেজার ভ্যালু অনুযায়ী স্ট্যাটাস ও প্রিমিয়াম রঙ নির্ণয়
function getLaserInfo(laserValue) {
  const val = Number(laserValue);
  if (Number.isNaN(val)) {
    return { key: 'green', color: PREMIUM_COLORS.green, label: 'N/A', text: 'Normal' };
  }
  const mag = Math.abs(val); // -18.5 বা 18.5 উভয়কেই 18.5 হিসেবে ধরবে

  if (mag < 9) {
    return { key: 'blue', color: PREMIUM_COLORS.blue, label: `${val} dBm`, text: 'Strong / High (Blue)' };
  }
  if (mag <= 22) {
    return { key: 'green', color: PREMIUM_COLORS.green, label: `${val} dBm`, text: 'Good (Green)' };
  }
  if (mag <= 26) {
    return { key: 'yellow', color: PREMIUM_COLORS.yellow, label: `${val} dBm`, text: 'Warning (Yellow)' };
  }
  return { key: 'red', color: PREMIUM_COLORS.red, label: `${val} dBm`, text: 'Critical / Loss (Red)' };
}

// প্রিমিয়াম কাস্টমার পিন আইকন
function createPremiumPin(color, size = 26) {
  return L.divIcon({
    className: 'premium-marker',
    html: `
      <div style="
        position: relative;
        width: ${size}px;
        height: ${size}px;
        background: linear-gradient(135deg, ${color}, ${color}dd);
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2.5px solid #ffffff;
        box-shadow: 0 0 0 2px ${color}44, 0 6px 14px rgba(0,0,0,0.4);
      ">
        <div style="
          width: 7px;
          height: 7px;
          background: #ffffff;
          border-radius: 50%;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        "></div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

// আপনার নিজের বর্তমান অবস্থান দেখানোর পালস পিন
const myPositionPin = L.divIcon({
  className: 'my-live-pos',
  html: `
    <div style="
      width: 18px;
      height: 18px;
      background: #0ea5e9;
      border: 3px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 0 0 6px rgba(14, 165, 233, 0.35), 0 3px 10px rgba(0,0,0,0.4);
    "></div>
  `,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -10],
});

const pinCache = {
  blue: createPremiumPin(PREMIUM_COLORS.blue),
  green: createPremiumPin(PREMIUM_COLORS.green),
  yellow: createPremiumPin(PREMIUM_COLORS.yellow),
  red: createPremiumPin(PREMIUM_COLORS.red),
  temp: createPremiumPin('#6366f1', 30),
};

function FlyToCoords({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target && target.coords) {
      map.flyTo(target.coords, 18, { duration: 1.1 });
    }
  }, [target, map]);
  return null;
}

function MapClickHandler({ isPicking, onPickLocation }) {
  useMapEvents({
    click(e) {
      if (isPicking) {
        onPickLocation([e.latlng.lat, e.latlng.lng]);
      }
    },
  });
  return null;
}

const initialCustomers = [
  {
    id: '1',
    name: 'রহিম উদ্দিন',
    phone: '01711000001',
    pppoe: 'rahim_ftth',
    package: '15 Mbps',
    due: 500,
    laser: -18.2,
    lat: 24.177908,
    lng: 88.96567,
    note: 'মেইন রোড, নীল গেট',
  },
  {
    id: '2',
    name: 'করিম আহমেদ',
    phone: '01711000002',
    pppoe: 'karim_net',
    package: '20 Mbps',
    due: 0,
    laser: -24.5,
    lat: 24.1795,
    lng: 88.9675,
    note: 'মসজিদ গলি, ২য় তলা',
  },
  {
    id: '3',
    name: 'সালমা খাতুন',
    phone: '01711000003',
    pppoe: 'salma_isp',
    package: '10 Mbps',
    due: 400,
    laser: -27.8,
    lat: 24.1765,
    lng: 88.9642,
    note: 'স্কুল মোড়, বক্স #A2',
  },
];

const emptyForm = {
  name: '',
  phone: '',
  pppoe: '',
  package: '10 Mbps',
  due: 0,
  laser: -18,
  note: '',
  lat: '',
  lng: '',
};

export default function App() {
  // 'local' অথবা 'mongodb'
  const [dataSource, setDataSource] = useState('local');
  const [dbStatus, setDbStatus] = useState('LocalStorage');

  const [customers, setCustomers] = useState(() => {
    try {
      const saved = localStorage.getItem('pro_isp_customers_v2');
      return saved ? JSON.parse(saved) : initialCustomers;
    } catch {
      return initialCustomers;
    }
  });

  // আপনার বর্তমান লাইভ লোকেশন
  const [myLocation, setMyLocation] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);

  const [search, setSearch] = useState('');
  const [laserFilter, setLaserFilter] = useState('all'); // all | blue | green | yellow | red

  // নতুন পিন বা এডিট ফর্ম স্টেট
  const [isPickingMode, setIsPickingMode] = useState(false);
  const [pickedCoords, setPickedCoords] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // null হলে নতুন, ID থাকলে এডিট
  const [formData, setFormData] = useState(emptyForm);

  // LocalStorage সিঙ্ক
  useEffect(() => {
    localStorage.setItem('pro_isp_customers_v2', JSON.stringify(customers));
  }, [customers]);

  // MongoDB থেকে ডাটা লোড করার ফাংশন
  const fetchFromMongo = useCallback(async () => {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error('API failed');
      const data = await res.json();
      const normalized = data.map((item) => ({ ...item, id: item._id || item.id }));
      setCustomers(normalized);
      setDbStatus('MongoDB Connected');
    } catch {
      setDbStatus('MongoDB Offline (Local active)');
    }
  }, []);

  useEffect(() => {
    if (dataSource === 'mongodb') {
      fetchFromMongo();
    } else {
      setDbStatus('LocalStorage');
    }
  }, [dataSource, fetchFromMongo]);

  // বর্তমান অবস্থান ট্র্যাক করা
  const locateMe = useCallback((shouldFly = false) => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setMyLocation(coords);
        if (shouldFly) {
          setFlyTarget({ coords, ts: Date.now() });
        }
      },
      () => {
        if (shouldFly) alert('আপনার বর্তমান GPS লোকেশন পাওয়া যায়নি। পারমিশন অন করুন।');
      },
      { enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    locateMe(false);
    const watchId = navigator.geolocation?.watchPosition(
      (pos) => setMyLocation([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true }
    );
    return () => {
      if (watchId && navigator.geolocation?.clearWatch) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [locateMe]);

  // ফিল্টার ও সার্চ
  const filteredCustomers = customers.filter((c) => {
    const q = search.toLowerCase();
    const matchText =
      c.name?.toLowerCase().includes(q) ||
      c.pppoe?.toLowerCase().includes(q) ||
      c.phone?.includes(search) ||
      c.note?.toLowerCase().includes(q);

    if (!matchText) return false;
    if (laserFilter === 'all') return true;
    return getLaserInfo(c.laser).key === laserFilter;
  });

  // ম্যাপে ক্লিক করে নতুন কাস্টমার ফর্ম খোলা
  const handleMapPick = (coords) => {
    setPickedCoords(coords);
    setIsPickingMode(false);
    setEditingId(null);
    setFormData({
      ...emptyForm,
      lat: coords[0].toFixed(6),
      lng: coords[1].toFixed(6),
    });
    setModalOpen(true);
  };

  // বিদ্যমান কাস্টমার এডিট করা
  const handleOpenEdit = (customer) => {
    setEditingId(customer.id);
    setPickedCoords([customer.lat, customer.lng]);
    setFormData({
      name: customer.name || '',
      phone: customer.phone || '',
      pppoe: customer.pppoe || '',
      package: customer.package || '10 Mbps',
      due: customer.due ?? 0,
      laser: customer.laser ?? -18,
      note: customer.note || '',
      lat: customer.lat,
      lng: customer.lng,
    });
    setModalOpen(true);
  };

  // সেভ বা আপডেট (Local + MongoDB)
  const handleSubmit = async (e) => {
    e.preventDefault();
    const latNum = Number(formData.lat);
    const lngNum = Number(formData.lng);
    if (!formData.name.trim() || Number.isNaN(latNum) || Number.isNaN(lngNum)) return;

    const payload = {
      name: formData.name.trim(),
      phone: formData.phone.trim() || 'N/A',
      pppoe: formData.pppoe.trim() || 'N/A',
      package: formData.package.trim() || '10 Mbps',
      due: Number(formData.due) || 0,
      laser: Number(formData.laser),
      lat: latNum,
      lng: lngNum,
      note: formData.note.trim(),
    };

    if (editingId) {
      // Edit Existing
      if (dataSource === 'mongodb') {
        try {
          const res = await fetch(`${API_URL}/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            const updated = await res.json();
            setCustomers((prev) =>
              prev.map((item) => (item.id === editingId ? { ...updated, id: updated._id || editingId } : item))
            );
          }
        } catch {
          setDbStatus('MongoDB Error - Local updated');
        }
      }
      setCustomers((prev) =>
        prev.map((item) => (item.id === editingId ? { ...item, ...payload } : item))
      );
      setFlyTarget({ coords: [latNum, lngNum], ts: Date.now() });
    } else {
      // Create New
      let newRecord = { ...payload, id: String(Date.now()) };
      if (dataSource === 'mongodb') {
        try {
          const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            const created = await res.json();
            newRecord = { ...created, id: created._id };
          }
        } catch {
          setDbStatus('MongoDB Error - Local saved');
        }
      }
      setCustomers((prev) => [newRecord, ...prev]);
      setFlyTarget({ coords: [latNum, lngNum], ts: Date.now() });
    }

    setModalOpen(false);
    setEditingId(null);
    setPickedCoords(null);
    setFormData(emptyForm);
  };

  // ডিলিট
  const handleDelete = async (id) => {
    if (!window.confirm('এই কাস্টমারকে মুছে ফেলতে চান?')) return;
    if (dataSource === 'mongodb') {
      try {
        await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      } catch {
        // ignore
      }
    }
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  };

  const openGoogleMaps = (lat, lng) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  const mapCenter = myLocation || [24.177908, 88.96567];

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: '#0f172a' }}>
      {/* বাম সাইডবার */}
      <aside
        style={{
          width: '365px',
          maxWidth: '92vw',
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #e2e8f0',
          zIndex: 1000,
        }}
      >
        <div style={{ padding: '14px', background: '#0f172a', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>ISP Map & Laser Pro</h2>
            <span style={{ fontSize: '11px', background: '#1e293b', padding: '3px 8px', borderRadius: '10px' }}>
              {dbStatus}
            </span>
          </div>

          {/* MongoDB / LocalStorage সুইচ */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
            <button
              onClick={() => setDataSource('local')}
              style={{
                flex: 1,
                padding: '6px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                background: dataSource === 'local' ? '#334155' : '#1e293b',
                color: '#fff',
              }}
            >
              LocalStorage
            </button>
            <button
              onClick={() => setDataSource('mongodb')}
              style={{
                flex: 1,
                padding: '6px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                background: dataSource === 'mongodb' ? '#059669' : '#1e293b',
                color: '#fff',
              }}
            >
              MongoDB Sync
            </button>
          </div>

          {/* অ্যাকশন বাটন */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
            <button
              onClick={() => {
                setIsPickingMode(!isPickingMode);
                setModalOpen(false);
              }}
              style={{
                flex: 1,
                padding: '8px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 700,
                background: isPickingMode ? '#f59e0b' : '#2563eb',
                color: '#fff',
              }}
            >
              {isPickingMode ? 'ম্যাপে ক্লিক করুন...' : '+ ম্যাপে পিন'}
            </button>

            <button
              onClick={() => locateMe(true)}
              style={{
                padding: '8px 10px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 700,
                background: '#0ea5e9',
                color: '#fff',
              }}
            >
              📍 আমার অবস্থান
            </button>
          </div>
        </div>

        {/* সার্চ ও লেজার কালার ফিল্টার */}
        <div style={{ padding: '10px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <input
            type="text"
            placeholder="নাম, PPPoE, ফোন বা নোট খুঁজুন..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
            }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', marginTop: '8px' }}>
            {[
              { id: 'all', label: 'All', dot: '#64748b' },
              { id: 'blue', label: '<9', dot: PREMIUM_COLORS.blue },
              { id: 'green', label: '9-22', dot: PREMIUM_COLORS.green },
              { id: 'yellow', label: '23-26', dot: PREMIUM_COLORS.yellow },
              { id: 'red', label: '27+', dot: PREMIUM_COLORS.red },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setLaserFilter(f.id)}
                style={{
                  padding: '5px 2px',
                  fontSize: '11px',
                  fontWeight: laserFilter === f.id ? 700 : 500,
                  borderRadius: '5px',
                  border: laserFilter === f.id ? `2px solid ${f.dot}` : '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#0f172a',
                  cursor: 'pointer',
                }}
              >
                <span style={{ color: f.dot }}>●</span> {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* কাস্টমার লিস্ট */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
          {filteredCustomers.map((c) => {
            const laser = getLaserInfo(c.laser);
            return (
              <div
                key={c.id}
                onClick={() => setFlyTarget({ coords: [c.lat, c.lng], ts: Date.now() })}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  borderLeft: `5px solid ${laser.color}`,
                  marginBottom: '8px',
                  background: '#fff',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '14px', color: '#0f172a' }}>{c.name}</strong>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '10px',
                      background: `${laser.color}22`,
                      color: laser.color,
                    }}
                  >
                    Laser: {laser.label}
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>
                  PPPoE: <b>{c.pppoe}</b> • {c.package} • বকেয়া: <b>{c.due}৳</b>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>📞 {c.phone}</div>
                {c.note && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>📌 {c.note}</div>}

                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }} onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => openGoogleMaps(c.lat, c.lng)}
                    style={{
                      flex: 1,
                      padding: '5px',
                      background: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '5px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    🧭 যান
                  </button>
                  <button
                    onClick={() => handleOpenEdit(c)}
                    style={{
                      padding: '5px 9px',
                      background: '#f59e0b',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '5px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    ✏️ এডিট
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    style={{
                      padding: '5px 8px',
                      background: '#fee2e2',
                      color: '#dc2626',
                      border: 'none',
                      borderRadius: '5px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ডান পাশে ম্যাপ */}
      <main style={{ flex: 1, position: 'relative' }}>
        {/* এডিট / অ্যাড ফর্ম */}
        {modalOpen && (
          <div
            style={{
              position: 'absolute',
              top: '18px',
              right: '18px',
              width: '320px',
              background: '#fff',
              padding: '16px',
              borderRadius: '10px',
              boxShadow: '0 12px 28px rgba(0,0,0,0.28)',
              zIndex: 1100,
            }}
          >
            <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#0f172a' }}>
              {editingId ? 'কাস্টমার তথ্য এডিট করুন' : 'নতুন কাস্টমার যুক্ত করুন'}
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                type="text"
                placeholder="কাস্টমারের নাম *"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{ padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
              <input
                type="text"
                placeholder="PPPoE ইউজারনেম"
                value={formData.pppoe}
                onChange={(e) => setFormData({ ...formData, pppoe: e.target.value })}
                style={{ padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
              <input
                type="text"
                placeholder="ফোন নম্বর"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                style={{ padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="প্যাকেজ"
                  value={formData.package}
                  onChange={(e) => setFormData({ ...formData, package: e.target.value })}
                  style={{ padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
                <input
                  type="number"
                  placeholder="বকেয়া (৳)"
                  value={formData.due}
                  onChange={(e) => setFormData({ ...formData, due: e.target.value })}
                  style={{ padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>
                  Laser Power (যেমন: -18.5 বা 18.5)
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.laser}
                  onChange={(e) => setFormData({ ...formData, laser: e.target.value })}
                  style={{ width: '100%', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '13px', marginTop: '2px' }}
                />
                <div style={{ fontSize: '11px', marginTop: '3px', color: getLaserInfo(formData.laser).color, fontWeight: 700 }}>
                  স্ট্যাটাস: {getLaserInfo(formData.laser).text}
                </div>
              </div>

              <input
                type="text"
                placeholder="ঠিকানা নোট"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                style={{ padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {editingId ? 'আপডেট করুন' : 'সেভ করুন'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setEditingId(null);
                    setPickedCoords(null);
                  }}
                  style={{
                    padding: '8px 12px',
                    background: '#e2e8f0',
                    color: '#334155',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  বাতিল
                </button>
              </div>
            </form>
          </div>
        )}

        <MapContainer center={mapCenter} zoom={17} maxZoom={21} style={{ height: '100%', width: '100%' }}>
          <LayersControl position="bottomright">
            <LayersControl.BaseLayer checked name="Google Hybrid">
              <TileLayer
                url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                maxZoom={21}
                attribution="© Google Maps"
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Google Street">
              <TileLayer
                url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                maxZoom={21}
                attribution="© Google Maps"
              />
            </LayersControl.BaseLayer>
          </LayersControl>

          <FlyToCoords target={flyTarget} />
          <MapClickHandler isPicking={isPickingMode} onPickLocation={handleMapPick} />

          {/* আপনার বর্তমান অবস্থান */}
          {myLocation && (
            <Marker position={myLocation} icon={myPositionPin}>
              <Popup>
                <strong>আপনার বর্তমান অবস্থান</strong>
              </Popup>
            </Marker>
          )}

          {/* নতুন পিন প্রিভিউ */}
          {pickedCoords && !editingId && (
            <Marker position={pickedCoords} icon={pinCache.temp}>
              <Popup>নতুন লোকেশন</Popup>
            </Marker>
          )}

          {/* কাস্টমার মার্কারসমূহ */}
          {filteredCustomers.map((c) => {
            const laser = getLaserInfo(c.laser);
            return (
              <Marker key={c.id} position={[c.lat, c.lng]} icon={pinCache[laser.key]}>
                <Popup>
                  <div style={{ minWidth: '215px', lineHeight: 1.55 }}>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>{c.name}</h4>
                    <div><b>PPPoE:</b> {c.pppoe}</div>
                    <div><b>ফোন:</b> <a href={`tel:${c.phone}`}>{c.phone}</a></div>
                    <div><b>প্যাকেজ:</b> {c.package}</div>
                    <div><b>বকেয়া:</b> {c.due} টাকা</div>
                    <div>
                      <b>Laser:</b>{' '}
                      <span style={{ color: laser.color, fontWeight: 700 }}>{laser.text}</span>
                    </div>
                    {c.note && <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px' }}><b>নোট:</b> {c.note}</div>}

                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                      <button
                        onClick={() => openGoogleMaps(c.lat, c.lng)}
                        style={{
                          flex: 1,
                          padding: '7px',
                          background: '#2563eb',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        🧭 যান
                      </button>
                      <button
                        onClick={() => handleOpenEdit(c)}
                        style={{
                          padding: '7px 10px',
                          background: '#f59e0b',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        ✏️ এডিট
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </main>
    </div>
  );
}