import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Building2, ShieldCheck, MapPin, Clock, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';

export default function FirstRunSetupPage() {
  const { firstRunSetup } = useAuth();
  const navigate = useNavigate();

  const [companyName, setCompanyName] = useState('Affanverse Solutions');
  const [adminName, setAdminName] = useState('System Administrator');
  const [adminEmail, setAdminEmail] = useState('admin@company.com');
  const [adminPassword, setAdminPassword] = useState('AdminPass123!');
  const [officeLat, setOfficeLat] = useState('24.8607');
  const [officeLng, setOfficeLng] = useState('67.0011');
  const [officeRadius, setOfficeRadius] = useState('150');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await firstRunSetup({
        companyName,
        adminName,
        adminEmail,
        adminPassword,
        officeLocation: {
          lat: parseFloat(officeLat) || 24.8607,
          lng: parseFloat(officeLng) || 67.0011,
          radius: parseInt(officeRadius) || 150,
          address: 'Zaitoon Ashraf IT Park, Karachi'
        }
      });
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
      <div className="max-w-xl w-full bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl animate-fade-in">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-500/25">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            First-Run System Setup
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight mt-3">Welcome to QuickServe</h1>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            Initialize your company profile with Affanverse QuickServe and create the master Administrator account to get started.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Building2 className="w-4 h-4" /> Company Details
            </h3>
            <div>
              <label className="block text-xs text-slate-300 font-medium mb-1">Company / Organization Name</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Master Admin Login
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">Admin Full Name</label>
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">Admin Email Address</label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-300 font-medium mb-1">Master Password</label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <MapPin className="w-4 h-4" /> Office Location & Geofence
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Latitude</label>
                <input
                  type="text"
                  value={officeLat}
                  onChange={(e) => setOfficeLat(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Longitude</label>
                <input
                  type="text"
                  value={officeLng}
                  onChange={(e) => setOfficeLng(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Radius (meters)</label>
                <input
                  type="number"
                  value={officeRadius}
                  onChange={(e) => setOfficeRadius(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Initializing System...
              </>
            ) : (
              <>
                Initialize Company & Launch
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
