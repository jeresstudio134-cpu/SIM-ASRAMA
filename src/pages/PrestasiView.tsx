import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Award, Plus, Search, Trash2, X, AlertCircle } from 'lucide-react';
import { apiClient, SantriItem } from '../services/api';

export const PrestasiView: React.FC = () => {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    santri_id: '',
    achievement_date: new Date().toISOString().slice(0, 10),
    title: '',
    level: 'Provinsi',
    reward: '',
    points: 15,
  });

  const { data: achievements = [], isLoading } = useQuery<any[]>({
    queryKey: ['achievements'],
    queryFn: async () => {
      const res = await apiClient.get('/achievements');
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
      return apiClient.post('/achievements', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
      queryClient.invalidateQueries({ queryKey: ['santri'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setModalOpen(false);
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message || 'Gagal menyimpan prestasi santri.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.delete(`/achievements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
      queryClient.invalidateQueries({ queryKey: ['santri'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const filtered = achievements.filter((a) => {
    const matchSearch =
      !search.trim() ||
      a.santri_name.toLowerCase().includes(search.toLowerCase()) ||
      a.title.toLowerCase().includes(search.toLowerCase());
    const matchLevel = levelFilter === 'all' || a.level === levelFilter;
    return matchSearch && matchLevel;
  });

  const openModal = () => {
    setFormError(null);
    setFormData({
      santri_id: santriList[0]?.id ? String(santriList[0].id) : '',
      achievement_date: new Date().toISOString().slice(0, 10),
      title: '',
      level: 'Provinsi',
      reward: '',
      points: 15,
    });
    setModalOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Top Search & Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari prestasi atau nama santri..."
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F5132]"
            />
          </div>

          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3.5 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
          >
            <option value="all">Semua Tingkat</option>
            <option value="Internasional">Internasional</option>
            <option value="Nasional">Nasional</option>
            <option value="Provinsi">Provinsi</option>
            <option value="Kabupaten/Kota">Kabupaten/Kota</option>
            <option value="Internal Pesantren">Internal Pesantren</option>
          </select>
        </div>

        <button
          type="button"
          onClick={openModal}
          className="px-5 py-2.5 bg-[#0F5132] hover:bg-[#0b3e26] text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Prestasi Santri</span>
        </button>
      </div>

      {/* Tabel & Galeri Prestasi Santri */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-700 bg-slate-50/60">
                <th className="py-4 px-5">Tanggal</th>
                <th className="py-4 px-5">Santri & Kelas</th>
                <th className="py-4 px-5">Nama Prestasi / Capaian</th>
                <th className="py-4 px-5">Tingkat</th>
                <th className="py-4 px-5">Penghargaan / Apresiasi</th>
                <th className="py-4 px-5">Poin Prestasi</th>
                <th className="py-4 px-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                    Memuat data prestasi santri...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="text-sm font-semibold text-slate-700">
                      Belum ada data prestasi yang sesuai
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Catat capaian Tahfidz, Akademik, maupun Non-Akademik santri.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-5 font-mono text-xs text-slate-600 whitespace-nowrap tabular-nums">
                      {a.achievement_date}
                    </td>
                    <td className="py-4 px-5">
                      <div className="font-semibold text-slate-900">{a.santri_name}</div>
                      <div className="text-xs text-slate-400">
                        {a.santri_nis} · {a.class_grade} ({a.room_number})
                      </div>
                    </td>
                    <td className="py-4 px-5 font-semibold text-slate-900 max-w-xs">
                      {a.title}
                    </td>
                    <td className="py-4 px-5 text-xs font-semibold text-[#0F5132]">
                      {a.level}
                    </td>
                    <td className="py-4 px-5 text-xs text-slate-600">{a.reward}</td>
                    <td className="py-4 px-5 font-mono font-bold text-[#0F5132] tabular-nums">
                      +{a.points} Poin
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(a.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                        title="Hapus Prestasi"
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

      {/* Modal Tambah Prestasi */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-[#0F5132]" />
                <h3 className="text-base font-bold text-slate-900">Catat Prestasi Santri</h3>
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
                  Pilih Santri
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
                      {s.nis} — {s.full_name} ({s.room_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Prestasi / Capaian (Tahfidz, Akademik, Non-Akademik)
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Contoh: Juara 1 MHQ 10 Juz Tingkat Provinsi"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    value={formData.achievement_date}
                    onChange={(e) =>
                      setFormData({ ...formData, achievement_date: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tingkat
                  </label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  >
                    <option value="Internal Pesantren">Internal Pesantren</option>
                    <option value="Kabupaten/Kota">Kabupaten/Kota</option>
                    <option value="Provinsi">Provinsi</option>
                    <option value="Nasional">Nasional</option>
                    <option value="Internasional">Internasional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Poin Apresiasi
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={formData.points}
                    onChange={(e) =>
                      setFormData({ ...formData, points: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Penghargaan / Sertifikat / Beasiswa
                </label>
                <input
                  type="text"
                  value={formData.reward}
                  onChange={(e) => setFormData({ ...formData, reward: e.target.value })}
                  placeholder="Contoh: Piagam Penghargaan & Beasiswa SPP 2 Bulan"
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
                  {createMutation.isPending ? 'Menyimpan...' : 'Simpan Prestasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
