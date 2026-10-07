import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Plus,
  Search,
  Trash2,
  X,
  ShieldAlert,
  AlertCircle,
} from 'lucide-react';
import { apiClient, SantriItem } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const PelanggaranView: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    santri_id: '',
    violation_date: new Date().toISOString().slice(0, 10),
    violation_type: '',
    points: 10,
    penalty: '',
    recorded_by: user?.full_name || '',
  });

  const { data: violations = [], isLoading } = useQuery<any[]>({
    queryKey: ['violations'],
    queryFn: async () => {
      const res = await apiClient.get('/violations');
      return res.data;
    },
  });

  const { data: santriList = [] } = useQuery<SantriItem[]>({
    queryKey: ['santri-active-options'],
    queryFn: async () => {
      const res = await apiClient.get('/santri', { params: { status: 'aktif' } });
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      return apiClient.post('/violations', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['violations'] });
      queryClient.invalidateQueries({ queryKey: ['santri'] });
      queryClient.invalidateQueries({ queryKey: ['santri-active-options'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setModalOpen(false);
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message || 'Gagal mencatat pelanggaran.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.delete(`/violations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['violations'] });
      queryClient.invalidateQueries({ queryKey: ['santri'] });
      queryClient.invalidateQueries({ queryKey: ['santri-active-options'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const filteredViolations = violations.filter((v) => {
    const matchSearch =
      !search.trim() ||
      v.santri_name.toLowerCase().includes(search.toLowerCase()) ||
      v.santri_nis.toLowerCase().includes(search.toLowerCase()) ||
      v.violation_type.toLowerCase().includes(search.toLowerCase());
    const matchRisk = riskFilter === 'all' || v.risk_status === riskFilter;
    return matchSearch && matchRisk;
  });

  const openModal = () => {
    setFormError(null);
    setFormData({
      santri_id: santriList[0]?.id ? String(santriList[0].id) : '',
      violation_date: new Date().toISOString().slice(0, 10),
      violation_type: '',
      points: 10,
      penalty: '',
      recorded_by: user?.full_name || '',
    });
    setModalOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Banner Klasifikasi Risiko Poin Pelanggaran */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-emerald-800">Status Aman (0 – 15 Poin)</div>
            <div className="text-xs text-slate-500 mt-0.5">Pembinaan rutin harian</div>
          </div>
          <span className="text-xl font-bold text-emerald-700 tabular-nums">
            {santriList.filter((s) => s.riskStatus === 'Aman').length} Santri
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-amber-800">Status Waspada (16 – 30 Poin)</div>
            <div className="text-xs text-slate-500 mt-0.5">Wajib konseling pembina gedung</div>
          </div>
          <span className="text-xl font-bold text-amber-600 tabular-nums">
            {santriList.filter((s) => s.riskStatus === 'Waspada').length} Santri
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-red-800">Status Bahaya / SP (31+ Poin)</div>
            <div className="text-xs text-slate-500 mt-0.5">Surat Peringatan & panggilan wali</div>
          </div>
          <span className="text-xl font-bold text-red-600 tabular-nums">
            {santriList.filter((s) => s.riskStatus === 'Bahaya/SP').length} Santri
          </span>
        </div>
      </div>

      {/* Filter & Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama santri, NIS, atau jenis pelanggaran..."
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F5132]"
            />
          </div>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-3.5 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
          >
            <option value="all">Semua Tingkat Risiko</option>
            <option value="Aman">Risiko: Aman (0-15 Poin)</option>
            <option value="Waspada">Risiko: Waspada (16-30 Poin)</option>
            <option value="Bahaya/SP">Risiko: Bahaya / SP (31+ Poin)</option>
          </select>
        </div>

        <button
          type="button"
          onClick={openModal}
          className="px-5 py-2.5 bg-[#0F5132] hover:bg-[#0b3e26] text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Pelanggaran</span>
        </button>
      </div>

      {/* Tabel Riwayat Pelanggaran & Sanksi */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-700 bg-slate-50/60">
                <th className="py-4 px-5">Tanggal</th>
                <th className="py-4 px-5">Santri & Kamar</th>
                <th className="py-4 px-5">Jenis Pelanggaran & Sanksi</th>
                <th className="py-4 px-5">Poin Kasus</th>
                <th className="py-4 px-5">Akumulasi & Status Risiko</th>
                <th className="py-4 px-5">Pencatat</th>
                <th className="py-4 px-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                    Memuat data pelanggaran...
                  </td>
                </tr>
              ) : filteredViolations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="text-sm font-semibold text-slate-700">
                      Belum ada catatan pelanggaran yang ditemukan
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Klik tombol "Catat Pelanggaran" untuk menambahkan entri baru.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredViolations.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-5 font-mono text-xs text-slate-600 whitespace-nowrap tabular-nums">
                      {v.violation_date}
                    </td>
                    <td className="py-4 px-5">
                      <div className="font-semibold text-slate-900">{v.santri_name}</div>
                      <div className="text-xs text-slate-400 font-mono">
                        {v.santri_nis} · {v.room_number} ({v.building})
                      </div>
                    </td>
                    <td className="py-4 px-5 max-w-xs">
                      <div className="font-semibold text-slate-800">{v.violation_type}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Sanksi: {v.penalty}</div>
                    </td>
                    <td className="py-4 px-5 font-mono font-bold text-red-600 tabular-nums">
                      +{v.points} Poin
                    </td>
                    <td className="py-4 px-5">
                      <div
                        className={`text-xs font-bold ${
                          v.risk_status === 'Bahaya/SP'
                            ? 'text-red-600'
                            : v.risk_status === 'Waspada'
                            ? 'text-amber-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        {v.risk_status}
                      </div>
                      <div className="text-[11px] text-slate-400 tabular-nums">
                        Total: {v.total_violation_points} Poin
                      </div>
                    </td>
                    <td className="py-4 px-5 text-xs text-slate-600">{v.recorded_by}</td>
                    <td className="py-4 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(v.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                        title="Hapus Catatan Pelanggaran"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Catat Pelanggaran */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Catat Pelanggaran & Sanksi Santri
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(formData);
              }}
              className="mt-4 space-y-4"
            >
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Santri ({user?.building_assignment})
                </label>
                <select
                  value={formData.santri_id}
                  onChange={(e) => setFormData({ ...formData, santri_id: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                  required
                >
                  <option value="" disabled>
                    -- Pilih Santri --
                  </option>
                  {santriList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nis} — {s.full_name} ({s.room_number} / {s.building})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Kejadian
                  </label>
                  <input
                    type="date"
                    value={formData.violation_date}
                    onChange={(e) => setFormData({ ...formData, violation_date: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bobot Poin Pelanggaran
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={formData.points}
                    onChange={(e) =>
                      setFormData({ ...formData, points: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jenis Pelanggaran
                </label>
                <input
                  type="text"
                  value={formData.violation_type}
                  onChange={(e) => setFormData({ ...formData, violation_type: e.target.value })}
                  placeholder="Contoh: Terlambat jamaah Subuh / Keluar tanpa izin"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tindakan Sanksi / Ta'zir
                </label>
                <textarea
                  rows={2}
                  value={formData.penalty}
                  onChange={(e) => setFormData({ ...formData, penalty: e.target.value })}
                  placeholder="Contoh: Menghafal Juz Amma & piket kebersihan masjid 3 hari"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dicatat Oleh (Pembina / Musyrif)
                </label>
                <input
                  type="text"
                  value={formData.recorded_by}
                  onChange={(e) => setFormData({ ...formData, recorded_by: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#0F5132] hover:bg-[#0b3e26] rounded-xl cursor-pointer"
                >
                  {createMutation.isPending ? 'Menyimpan...' : 'Simpan Pelanggaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
