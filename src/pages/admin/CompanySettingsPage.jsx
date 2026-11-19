import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { Sliders, Clock, MapPin, ShieldAlert, Check, RefreshCw, AlertCircle, RotateCcw } from 'lucide-react';

export default function CompanySettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [officeStartTime, setOfficeStartTime] = useState('09:00');
  const [graceMinutes, setGraceMinutes] = useState(15);
  const [halfDayHours, setHalfDayHours] = useState(5);
  const [weekendDays, setWeekendDays] = useState([0, 6]);
  const [officeLat, setOfficeLat] = useState('24.8607');
  const [officeLng, setOfficeLng] = useState('67.0011');
  const [officeRadius, setOfficeRadius] = useState(150);
  const [latePenaltyRule, setLatePenaltyRule] = useState(true);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await api.getCompanySettings();
      setSettings(res);
      setName(res.name || '');
      setOfficeStartTime(res.officeStartTime || '09:00');
      setGraceMinutes(res.graceMinutes || 15);
      setHalfDayHours(res.halfDayHours || 5);
      setWeekendDays(res.weekendDays || [0, 6]);
      setOfficeLat(String(res.officeLocation?.lat || '24.8607'));
      setOfficeLng(String(res.officeLocation?.lng || '67.0011'));
      setOfficeRadius(res.officeLocation?.radius || 150);
      setLatePenaltyRule(res.latePenaltyRule !== false);
    } catch (err) {
      setError(err.message || 'Failed to load company settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      await api.updateCompanySettings({
        name,
        officeStartTime,
        graceMinutes: Number(graceMinutes),
        halfDayHours: Number(halfDayHours),
        weekendDays,
        officeLocation: {
          lat: parseFloat(officeLat) || 24.8607,
          lng: parseFloat(officeLng) || 67.0011,
          radius: Number(officeRadius) || 150,
          address: 'Zaitoon Ashraf IT Park'
        },
        latePenaltyRule
      });
      setMessage('Company rules and office settings updated successfully.');
    } catch (err) {
      setError(err.message || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  const toggleWeekendDay = (dayNum) => {
    if (weekendDays.includes(dayNum)) {
      setWeekendDays(weekendDays.filter(d => d !== dayNum));
    } else {
      setWeekendDays([...weekendDays, dayNum]);
    }
  };

  const handleResetSystem = async () => {
    if (!window.confirm('CAUTION: Are you sure you want to completely reset the system to a clean, empty state? This will clear all data.')) {
      return;
    }
    try {
      await api.resetSystem();
      window.location.href = '/setup';
    } catch (err) {
      alert('Failed to reset: ' + err.message);
    }
  };

  if (loading && !settings) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  const daysOfWeek = [
    { num: 1, name: 'Monday' },
    { num: 2, name: 'Tuesday' },
    { num: 3, name: 'Wednesday' },
    { num: 4, name: 'Thursday' },
    { num: 5, name: 'Friday' },
    { num: 6, name: 'Saturday' },
    { num: 0, name: 'Sunday' }
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Sliders className="w-6 h-6 text-indigo-600" /> Company Rules & Configuration
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Applied across attendance calculations, half-day flags, payroll deductions, and camera attendance geofence
        </p>
      </div>

      {message && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* General Profile */}
        <div className="card p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Company Profile
          </h3>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Company Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input text-xs"
            />
          </div>
        </div>

        {/* Attendance & Working Hours Rules */}
        <div className="card p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Attendance & Shift Rules (M2, M4)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Office Start Time
              </label>
              <input
                type="time"
                required
                value={officeStartTime}
                onChange={(e) => setOfficeStartTime(e.target.value)}
                className="input text-xs"
              />
              <p className="text-[10px] text-slate-400 mt-1">Check-in start timestamp</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Grace Period (Minutes)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                required
                value={graceMinutes}
                onChange={(e) => setGraceMinutes(e.target.value)}
                className="input text-xs"
              />
              <p className="text-[10px] text-slate-400 mt-1">Late after {officeStartTime} + {graceMinutes}m</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Half-Day Threshold (Hours)
              </label>
              <input
                type="number"
                min="1"
                max="8"
                step="0.5"
                required
                value={halfDayHours}
                onChange={(e) => setHalfDayHours(e.target.value)}
                className="input text-xs"
              />
              <p className="text-[10px] text-slate-400 mt-1">Under {halfDayHours}h counts as half_day</p>
            </div>
          </div>

          {/* Weekend Days Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Official Weekend Days (Non-Working)
            </label>
            <div className="flex flex-wrap gap-2">
              {daysOfWeek.map((day) => {
                const isSelected = weekendDays.includes(day.num);
                return (
                  <button
                    key={day.num}
                    type="button"
                    onClick={() => toggleWeekendDay(day.num)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {day.name}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">Excluded from leave deduction calculations</p>
          </div>
        </div>

        {/* Office Location & Geofence */}
        <div className="card p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Camera Geofence Coordinates (M4, Section 5)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Office Latitude
              </label>
              <input
                type="text"
                required
                value={officeLat}
                onChange={(e) => setOfficeLat(e.target.value)}
                className="input text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Office Longitude
              </label>
              <input
                type="text"
                required
                value={officeLng}
                onChange={(e) => setOfficeLng(e.target.value)}
                className="input text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Accepted Radius (Meters)
              </label>
              <input
                type="number"
                min="10"
                max="5000"
                required
                value={officeRadius}
                onChange={(e) => setOfficeRadius(e.target.value)}
                className="input text-xs"
              />
            </div>
          </div>
        </div>

        {/* Bonus Late Penalty Rule Toggle */}
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-500" /> Late Penalty Rule (+Bonus Points)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Every 3 late arrivals automatically deduct 0.5 day's gross salary in the monthly payroll run.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={latePenaltyRule}
                onChange={(e) => setLatePenaltyRule(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleResetSystem}
            className="px-4 py-2.5 rounded-xl border border-rose-300 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Reset System to Empty
          </button>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary py-2.5 px-6 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Saving Changes...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" /> Save Configuration
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
