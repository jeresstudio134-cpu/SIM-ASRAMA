import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, Printer } from 'lucide-react';
import { apiClient, SantriItem } from '../services/api';
import { useAuth } from '../context/AuthContext';

type ReportType = 'santri' | 'violations' | 'finance' | 'permissions';

export const LaporanView: React.FC = () => {
  const { user } = useAuth();
  const [reportType, setReportType] = useState<ReportType>(
    user?.role === 'bendahara' ? 'finance' : 'santri'
  );
  const [buildingFilter, setBuildingFilter] = useState('all');

  const { data: santriList = [] } = useQuery<SantriItem[]>({
    queryKey: ['santri', '', buildingFilter, 'all', 'all'],
    queryFn: async () => {
      const res = await apiClient.get('/santri', {
        params: { building: buildingFilter, status: 'all' },
      });
      return res.data;
    },
  });

  const { data: violations = [] } = useQuery<any[]>({
    queryKey: ['violations'],
    enabled: user?.role !== 'bendahara',
    queryFn: async () => {
      const res = await apiClient.get('/violations');
      return res.data;
    },
  });

  const { data: sppList = [] } = useQuery<any[]>({
    queryKey: ['finance-spp', 'all'],
    enabled: user?.role === 'admin' || user?.role === 'bendahara',
    queryFn: async () => {
      const res = await apiClient.get('/finance/spp');
      return res.data;
    },
  });

  const { data: permissions = [] } = useQuery<any[]>({
    queryKey: ['permissions'],
    enabled: user?.role !== 'bendahara',
    queryFn: async () => {
      const res = await apiClient.get('/permissions');
      return res.data;
    },
  });

  const exportToCsv = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let filename = `Laporan_${reportType}_SIM-ASRAMA_${new Date().toISOString().slice(0, 10)}.csv`;

    if (reportType === 'santri') {
      headers = [
        'NIS',
        'Nama Lengkap',
        'Gender',
        'Kelas',
        'Kamar',
        'Gedung',
        'Skor Disiplin',
        'Status Risiko',
        'Wali Santri',
        'No Telepon Wali',
      ];
      rows = santriList.map((s) => [
        s.nis,
        s.full_name,
        s.gender,
        s.class_grade,
        s.room_number,
        s.building,
        s.netDisciplineScore,
        s.riskStatus,
        s.parent_name,
        s.parent_phone,
      ]);
    } else if (reportType === 'violations') {
      headers = ['Tanggal', 'NIS', 'Nama Santri', 'Kamar', 'Jenis Pelanggaran', 'Poin', 'Sanksi', 'Pencatat'];
      rows = violations.map((v) => [
        v.violation_date,
        v.santri_nis,
        v.santri_name,
        v.room_number,
        v.violation_type,
        v.points,
        v.penalty,
        v.recorded_by,
      ]);
    } else if (reportType === 'finance') {
      headers = ['NIS', 'Nama Santri', 'Kamar', 'Periode Bulan', 'Tahun', 'Nominal SPP', 'Status', 'Tanggal Bayar'];
      rows = sppList.map((f) => [
        f.santri_nis,
        f.santri_name,
        f.room_number,
        f.month,
        f.year,
        f.amount,
        f.status.toUpperCase(),
        f.paid_at ? new Date(f.paid_at).toLocaleDateString('id-ID') : '-',
      ]);
    } else {
      headers = ['NIS', 'Nama Santri', 'Kamar', 'Mulai Izin', 'Kembali', 'Alasan', 'Status', 'Disetujui Oleh'];
      rows = permissions.map((p) => [
        p.santri_nis,
        p.santri_name,
        p.room_number,
        p.start_date,
        p.end_date,
        p.reason,
        p.status.toUpperCase(),
        p.approved_by,
      ]);
    }

    const csvContent =
      '\uFEFF' +
      [headers, ...rows]
        .map((row) =>
          row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
        )
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Filter & Export Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900 mr-2">
            <FileText className="w-4 h-4 text-[#0F5132]" />
            <span>Pilih Jenis Laporan:</span>
          </div>

          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
          >
            <option value="santri">1. Laporan Database & Poin Disiplin Santri</option>
            {user?.role !== 'bendahara' && (
              <>
                <option value="violations">2. Rekapitulasi Pelanggaran & Sanksi</option>
                <option value="permissions">3. Rekapitulasi Perizinan Pulang Santri</option>
              </>
            )}
            {(user?.role === 'admin' || user?.role === 'bendahara') && (
              <option value="finance">4. Laporan Keuangan SPP Bulanan</option>
            )}
          </select>

          {user?.building_assignment === 'Semua' && reportType === 'santri' && (
            <select
              value={buildingFilter}
              onChange={(e) => setBuildingFilter(e.target.value)}
              className="px-3.5 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
            >
              <option value="all">Semua Gedung</option>
              <option value="Gedung A">Gedung A</option>
              <option value="Gedung B">Gedung B</option>
            </select>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={exportToCsv}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:border-[#0F5132] bg-white text-slate-800 text-xs font-semibold flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#0F5132]" />
            <span>Ekspor CSV / Excel</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2.5 rounded-xl bg-[#0F5132] hover:bg-[#0b3e26] text-white text-xs font-semibold flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Laporan / PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Report Sheet */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8">
        <div className="border-b-2 border-[#0F5132] pb-4 mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#0F5132] uppercase">
              LAPORAN RESMI SISTEM INFORMASI MANAJEMEN ASRAMA (SIM-ASRAMA)
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Dicetak oleh: {user?.full_name} ({user?.role.toUpperCase()}) · Wilayah:{' '}
              {user?.building_assignment}
            </p>
          </div>
          <div className="text-right font-mono text-xs text-slate-500 tabular-nums">
            <div>Tanggal: {new Date().toLocaleDateString('id-ID')}</div>
          </div>
        </div>

        {reportType === 'santri' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
                  <th className="py-3 px-4">NIS</th>
                  <th className="py-3 px-4">Nama Santri</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-4">Kamar & Gedung</th>
                  <th className="py-3 px-4">Poin Disiplin</th>
                  <th className="py-3 px-4">Status Risiko</th>
                  <th className="py-3 px-4">Wali Santri</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {santriList.map((s) => (
                  <tr key={s.id}>
                    <td className="py-3 px-4 font-mono tabular-nums">{s.nis}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{s.full_name}</td>
                    <td className="py-3 px-4">{s.class_grade}</td>
                    <td className="py-3 px-4">
                      {s.room_number} ({s.building})
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#0F5132] tabular-nums">
                      {s.netDisciplineScore}
                    </td>
                    <td className="py-3 px-4 font-semibold">{s.riskStatus}</td>
                    <td className="py-3 px-4">
                      {s.parent_name} ({s.parent_phone})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'violations' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Santri & Kamar</th>
                  <th className="py-3 px-4">Jenis Pelanggaran</th>
                  <th className="py-3 px-4">Poin</th>
                  <th className="py-3 px-4">Sanksi</th>
                  <th className="py-3 px-4">Pencatat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {violations.map((v) => (
                  <tr key={v.id}>
                    <td className="py-3 px-4 font-mono">{v.violation_date}</td>
                    <td className="py-3 px-4 font-semibold">
                      {v.santri_name} ({v.room_number})
                    </td>
                    <td className="py-3 px-4">{v.violation_type}</td>
                    <td className="py-3 px-4 font-mono font-bold text-red-600">+{v.points}</td>
                    <td className="py-3 px-4">{v.penalty}</td>
                    <td className="py-3 px-4">{v.recorded_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'finance' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
                  <th className="py-3 px-4">NIS</th>
                  <th className="py-3 px-4">Nama Santri</th>
                  <th className="py-3 px-4">Kamar</th>
                  <th className="py-3 px-4">Periode</th>
                  <th className="py-3 px-4">Nominal SPP</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sppList.map((f) => (
                  <tr key={f.id}>
                    <td className="py-3 px-4 font-mono">{f.santri_nis}</td>
                    <td className="py-3 px-4 font-semibold">{f.santri_name}</td>
                    <td className="py-3 px-4">{f.room_number}</td>
                    <td className="py-3 px-4">
                      {f.month} {f.year}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums">
                      Rp {Number(f.amount).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 font-bold uppercase">{f.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'permissions' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
                  <th className="py-3 px-4">Santri</th>
                  <th className="py-3 px-4">Kamar</th>
                  <th className="py-3 px-4">Tanggal Izin</th>
                  <th className="py-3 px-4">Keperluan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Disetujui Oleh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {permissions.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 px-4 font-semibold">{p.santri_name}</td>
                    <td className="py-3 px-4">{p.room_number}</td>
                    <td className="py-3 px-4 font-mono">
                      {p.start_date} s/d {p.end_date}
                    </td>
                    <td className="py-3 px-4">{p.reason}</td>
                    <td className="py-3 px-4 font-bold uppercase">{p.status}</td>
                    <td className="py-3 px-4">{p.approved_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
