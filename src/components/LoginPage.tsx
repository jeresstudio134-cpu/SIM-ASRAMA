import React, { useState } from 'react';
import { Home, Eye, EyeOff, Lock, User, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, sessionNotice, clearNotice } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    clearNotice();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Harap masukkan username dan password.');
      return;
    }

    setSubmitting(true);
    try {
      await login(username.trim(), password);
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.message || 'Gagal masuk ke sistem. Periksa kembali kredensial Anda.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const fillCredential = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg(null);
    clearNotice();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Top Islamic Green Header */}
        <div className="bg-[#0F5132] px-7 py-7 text-white">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-700/80 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <Home className="w-6 h-6 text-emerald-100" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">SIM-ASRAMA</h1>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Sistem Informasi Manajemen Santri & Asrama
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-7">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">Masuk ke Portal Manajemen</h2>
            <p className="text-xs text-slate-500 mt-1">
              Otentikasi berbasis JWT & Hak Akses Peran (RBAC) otomatis.
            </p>
          </div>

          {sessionNotice && (
            <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{sessionNotice}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Username Pengguna
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username..."
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#0F5132] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kata Sandi (Password)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password..."
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#0F5132] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-[#0F5132] hover:bg-[#0b3e26] disabled:opacity-60 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>{submitting ? 'Memverifikasi Kredensial...' : 'Masuk ke SIM-ASRAMA'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Kredensial Contoh / Demo Accounts */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2.5">
              <ShieldCheck className="w-4 h-4 text-[#0F5132]" />
              <span>Kredensial Contoh (Klik untuk Isi Otomatis)</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => fillCredential('admin', 'admin123')}
                className="flex items-center justify-between px-3.5 py-2 rounded-xl border border-slate-200 hover:border-[#0F5132] hover:bg-emerald-50/40 text-left transition-colors cursor-pointer"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-900">Administrator Utama</div>
                  <div className="text-[11px] text-slate-500">Akses penuh seluruh modul & gedung</div>
                </div>
                <span className="font-mono text-xs text-[#0F5132] font-medium">
                  admin / admin123
                </span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fillCredential('pembina', 'pembina123')}
                  className="flex flex-col justify-between px-3 py-2 rounded-xl border border-slate-200 hover:border-[#0F5132] hover:bg-emerald-50/40 text-left transition-colors cursor-pointer"
                >
                  <div className="text-xs font-semibold text-slate-900">Pembina Gedung A</div>
                  <div className="font-mono text-[11px] text-[#0F5132] mt-0.5">
                    pembina / pembina123
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => fillCredential('pembina_b', 'pembina123')}
                  className="flex flex-col justify-between px-3 py-2 rounded-xl border border-slate-200 hover:border-[#0F5132] hover:bg-emerald-50/40 text-left transition-colors cursor-pointer"
                >
                  <div className="text-xs font-semibold text-slate-900">Pembina Gedung B</div>
                  <div className="font-mono text-[11px] text-[#0F5132] mt-0.5">
                    pembina_b / pembina123
                  </div>
                </button>
              </div>

              <button
                type="button"
                onClick={() => fillCredential('bendahara', 'bendahara123')}
                className="flex items-center justify-between px-3.5 py-2 rounded-xl border border-slate-200 hover:border-[#0F5132] hover:bg-emerald-50/40 text-left transition-colors cursor-pointer"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-900">Bendahara Asrama</div>
                  <div className="text-[11px] text-slate-500">SPP, Tabungan Saku & Kas Operasional</div>
                </div>
                <span className="font-mono text-xs text-[#0F5132] font-medium">
                  bendahara / bendahara123
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
