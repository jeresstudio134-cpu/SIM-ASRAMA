import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  AlertTriangle,
  Award,
  Wallet,
  ArrowUpRight,
  Clock,
  ShieldCheck,
  FileText,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { apiClient } from '../services/api';
import { NavTabId } from '../components/LayoutShell';
import { useAuth } from '../context/AuthContext';

interface DashboardViewProps {
  onNavigate: (tab: NavTabId) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard/summary');
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-28 bg-white rounded-2xl border border-slate-200 p-5 animate-pulse"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-white rounded-2xl border border-slate-200 animate-pulse" />
          <div className="h-80 bg-white rounded-2xl border border-slate-200 animate-pulse" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="bg-white rounded-2xl border border-red-200 p-6 text-sm text-red-700">
        Gagal memuat ringkasan dashboard. Silakan muat ulang halaman.
      </div>
    );
  }

  const { stats, riskDistribution, disciplineTrend, financeTrend, recentLogs } = data;

  return (
    <div className="space-y-6">
      {/* Welcome Banner & Quick Shortcuts */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">
            Ikhtisar Operasional SIM-ASRAMA
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Selamat bertugas, <span className="font-semibold text-slate-800">{user?.full_name}</span>
            {' · '}
            Cakupan Akses:{' '}
            <span className="font-semibold text-[#0F5132]">{user?.building_assignment}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('santri')}
            className="px-3.5 py-2 rounded-xl bg-[#0F5132] hover:bg-[#0b3e26] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Database Santri</span>
          </button>

          {(user?.role === 'admin' || user?.role === 'pembina') && (
            <button
              type="button"
              onClick={() => onNavigate('rooms')}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Surat Izin Pulang</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Cetak Laporan</span>
          </button>
        </div>
      </div>

      {/* 4 Kartu Statistik Real-time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>TOTAL SANTRI AKTIF</span>
            <Users className="w-4 h-4 text-[#0F5132]" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">
            {stats.totalSantriAktif} <span className="text-xs font-normal text-slate-500">Santri</span>
          </div>
          <div className="text-xs text-slate-500 mt-2 tabular-nums">
            Alumni tercatat: {stats.totalAlumni} · Izin aktif: {stats.izinAktifCount}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>CATATAN PELANGGARAN</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">
            {stats.totalPelanggaran} <span className="text-xs font-normal text-slate-500">Kasus</span>
          </div>
          <div className="text-xs text-slate-500 mt-2 tabular-nums">
            Aman: {riskDistribution.aman} · Waspada: {riskDistribution.waspada} · SP: {riskDistribution.bahaya}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>TOTAL PRESTASI SANTRI</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">
            {stats.totalPrestasi} <span className="text-xs font-normal text-slate-500">Capaian</span>
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Tahfidz, Olimpiade Sains & Non-Akademik
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>SALDO KAS ASRAMA</span>
            <Wallet className="w-4 h-4 text-[#0F5132]" />
          </div>
          <div className="text-2xl font-bold text-[#0F5132] mt-2 tabular-nums">
            Rp {Number(stats.saldoKas).toLocaleString('id-ID')}
          </div>
          <div className="text-xs text-slate-500 mt-2 tabular-nums">
            SPP Lunas: {stats.sppLunasCount} · Tunggakan: {stats.sppTunggakanCount}
          </div>
        </div>
      </div>

      {/* 2 Grafik Interaktif Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Tren Pelanggaran vs Prestasi */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Tren Pelanggaran vs Prestasi Santri
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Perbandingan pembinaan disiplin 6 bulan terakhir (Mei – Okt 2026)
              </p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={disciplineTrend} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="bulan" tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748B' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  dataKey="prestasi"
                  name="Prestasi Santri"
                  fill="#0F5132"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="pelanggaran"
                  name="Pelanggaran"
                  fill="#D97706"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Arus Kas Pemasukan vs Pengeluaran */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Grafik Pemasukan vs Pengeluaran Kas
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Realisasi arus kas operasional asrama dalam Juta Rupiah
              </p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financeTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="bulan" tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748B' }}
                  tickFormatter={(v) => `${v}Jt`}
                />
                <Tooltip
                  formatter={(value: any) => [`Rp ${value} Juta`, '']}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  dataKey="pemasukan"
                  name="Pemasukan (Juta Rp)"
                  fill="#16A34A"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="pengeluaran"
                  name="Pengeluaran (Juta Rp)"
                  fill="#64748B"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row: Risk Status Summary & Activity Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Indikator Risiko Disiplin Santri */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-[#0F5132]" />
              <h2 className="text-sm font-bold text-slate-900">
                Status Risiko Kedisiplinan Santri
              </h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Klasifikasi otomatis berdasarkan akumulasi poin pelanggaran santri aktif:
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/70">
                <div>
                  <div className="text-xs font-bold text-emerald-900">Status Aman (0 – 15 Poin)</div>
                  <div className="text-[11px] text-emerald-700">Disiplin baik & terkendali</div>
                </div>
                <span className="text-base font-bold text-emerald-800 tabular-nums">
                  {riskDistribution.aman} Santri
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/70 border border-amber-200/80">
                <div>
                  <div className="text-xs font-bold text-amber-900">Status Waspada (16 – 30 Poin)</div>
                  <div className="text-[11px] text-amber-700">Wajib bimbingan musyrif/pembina</div>
                </div>
                <span className="text-base font-bold text-amber-800 tabular-nums">
                  {riskDistribution.waspada} Santri
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-red-50/70 border border-red-200/80">
                <div>
                  <div className="text-xs font-bold text-red-900">Status Bahaya / SP (31+ Poin)</div>
                  <div className="text-[11px] text-red-700">Surat Peringatan & panggilan wali</div>
                </div>
                <span className="text-base font-bold text-red-800 tabular-nums">
                  {riskDistribution.bahaya} Santri
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('santri')}
            className="mt-4 w-full py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Lihat Detail Rapor Seluruh Santri</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Log Aktivitas Terbaru */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#0F5132]" />
              <h2 className="text-sm font-bold text-slate-900">Log Aktivitas Sistem Terbaru</h2>
            </div>
            {user?.role === 'admin' && (
              <button
                type="button"
                onClick={() => onNavigate('users')}
                className="text-xs font-semibold text-[#0F5132] hover:underline cursor-pointer"
              >
                Lihat Semua Log Audit
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {recentLogs.map((log: any) => (
              <div key={log.id} className="py-2.5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900">
                    {log.action}{' '}
                    <span className="font-normal text-slate-500">oleh {log.user_name}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 truncate">{log.details}</p>
                </div>
                <span className="text-[11px] text-slate-400 whitespace-nowrap tabular-nums shrink-0">
                  {new Date(log.timestamp).toLocaleString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
