import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  Plus,
  Search,
  Trash2,
  X,
  Calendar,
  UserCheck,
  AlertCircle,
} from 'lucide-react';
import { apiClient, SantriItem } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const KonselingView: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    santri_id: '',
    counseling_date: new Date().toISOString().slice(0, 10),
    topic: '',
    follow_up: '',
    counselor_name: user?.full_name || '',
  });

  const { data: counselingList = [], isLoading } = useQuery<any[]>({
    queryKey: ['counseling'],
    queryFn: async () => {
      const res = await apiClient.get('/counseling');
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
      return apiClient.post('/counseling', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counseling'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setModalOpen(false);
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message || 'Gagal menyimpan catatan konseling.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.delete(`/counseling/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counseling'] });
    },
  });

  const filtered = counselingList.filter(
    (c) =>
      !search.trim() ||
      c.santri_name.toLowerCase().includes(search.toLowerCase()) ||
      c.topic.toLowerCase().includes(search.toLowerCase()) ||
      c.counselor_name.toLowerCase().includes(search.toLowerCase())
  );

  const openModal = () => {
    setFormError(null);
    setFormData({
      santri_id: santriList[0]?.id ? String(santriList[0].id) : '',
      counseling_date: new Date().toISOString().slice(0, 10),
      topic: '',
      follow_up: '',
      counselor_name: user?.full_name || '',
    });
    setModalOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Top Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama santri, topik konseling, atau pembimbing..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F5132]"
          />
        </div>

        <button
          type="button"
          onClick={openModal}
          className="px-5 py-2.5 bg-[#0F5132] hover:bg-[#0b3e26] text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Catatan Konseling</span>
        </button>
      </div>

      {/* Timeline Bimbingan & Konseling */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Timeline Bimbingan & Konseling Santri
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Rekam jejak pendampingan akademik, adab, psikologis, dan evaluasi disiplin santri
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 tabular-nums">
            Total: {filtered.length} Sesi
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Memuat timeline bimbingan konseling...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-sm font-semibold text-slate-700">
              Belum ada catatan bimbingan konseling
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Tambahkan sesi konseling baru untuk memantau perkembangan santri.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 border-l-2 border-emerald-700/30 space-y-6">
            {filtered.map((item) => (
              <div key={item.id} className="relative group">
                <div className="w-3.5 h-3.5 rounded-full bg-[#0F5132] border-2 border-white shadow-xs absolute -left-[31px] top-1.5" />
                <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/90 hover:border-slate-300 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200/70">
                    <div>
                      <span className="text-sm font-bold text-slate-900">{item.santri_name}</span>
                      <span className="text-xs text-slate-500 ml-2 font-mono">
                        ({item.santri_nis} · {item.room_number} - {item.building})
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-500 flex items-center gap-1 tabular-nums">
                        <Calendar className="w-3.5 h-3.5 text-[#0F5132]" />
                        {item.counseling_date}
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(item.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded-lg cursor-pointer"
                        title="Hapus Catatan Konseling"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2 text-xs">
                    <div>
                      <span className="font-semibold text-slate-700">Topik Bimbingan: </span>
                      <span className="text-slate-800">{item.topic}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-[#0F5132]">
                        Rencana Tindak Lanjut (Follow-Up):{' '}
                      </span>
                      <span className="text-slate-700">{item.follow_up}</span>
                    </div>
                    <div className="pt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                      <UserCheck className="w-3.5 h-3.5 text-[#0F5132]" />
                      <span>Konselor / Pembina: {item.counselor_name}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Tambah Konseling */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#0F5132]" />
                <h3 className="text-base font-bold text-slate-900">
                  Tambah Catatan Bimbingan Konseling
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
                      {s.nis} — {s.full_name} ({s.room_number} / {s.building})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Sesi
                  </label>
                  <input
                    type="date"
                    value={formData.counseling_date}
                    onChange={(e) =>
                      setFormData({ ...formData, counseling_date: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Pembimbing
                  </label>
                  <input
                    type="text"
                    value={formData.counselor_name}
                    onChange={(e) =>
                      setFormData({ ...formData, counselor_name: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Topik / Permasalahan Konseling
                </label>
                <input
                  type="text"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  placeholder="Contoh: Evaluasi target hafalan Al-Quran & motivasi belajar"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rencana Tindak Lanjut (Follow-Up)
                </label>
                <textarea
                  rows={3}
                  value={formData.follow_up}
                  onChange={(e) => setFormData({ ...formData, follow_up: e.target.value })}
                  placeholder="Contoh: Pendampingan halaqah tambahan setiap ba'da Ashar"
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
                  {createMutation.isPending ? 'Menyimpan...' : 'Simpan Sesi Konseling'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
