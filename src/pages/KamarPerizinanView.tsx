import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layers,
  Plus,
  Printer,
  CheckCircle2,
  XCircle,
  Trash2,
  X,
  AlertCircle,
  BedDouble,
} from 'lucide-react';
import { apiClient, SantriItem } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const KamarPerizinanView: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [printPermission, setPrintPermission] = useState<any | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    santri_id: '',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
    reason: '',
    status: 'disetujui',
  });

  const { data: rooms = [], isLoading: roomsLoading } = useQuery<any[]>({
    queryKey: ['rooms-summary'],
    queryFn: async () => {
      const res = await apiClient.get('/rooms');
      return res.data;
    },
  });

  const { data: permissions = [], isLoading: permsLoading } = useQuery<any[]>({
    queryKey: ['permissions'],
    queryFn: async () => {
      const res = await apiClient.get('/permissions');
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
      return apiClient.post('/permissions', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setModalOpen(false);
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message || 'Gagal membuat surat izin pulang.');
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiClient.patch(`/permissions/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.delete(`/permissions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
  });

  const openModal = () => {
    setFormError(null);
    setFormData({
      santri_id: santriList[0]?.id ? String(santriList[0].id) : '',
      start_date: new Date().toISOString().slice(0, 10),
      end_date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
      reason: '',
      status: 'disetujui',
    });
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Seksi 1: Visualisasi Kapasitas Kamar & Penghuni */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Visualisasi Kapasitas Kamar & Penghuni ({user?.building_assignment})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Monitoring ketersediaan tempat tidur dan distribusi santri aktif per kamar asrama
            </p>
          </div>
        </div>

        {roomsLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Memuat denah kapasitas kamar...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {rooms.map((room) => {
              const pct = Math.min(100, Math.round((room.occupied / room.capacity) * 100));
              return (
                <div
                  key={room.room_number}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BedDouble className="w-4 h-4 text-[#0F5132]" />
                        <span className="text-sm font-bold text-slate-900">
                          Kamar {room.room_number}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-semibold text-slate-600 tabular-nums">
                        {room.occupied}/{room.capacity} Bed
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {room.building} · Asrama {room.gender}
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mt-3">
                      <div
                        className={`h-full rounded-full ${
                          pct >= 100 ? 'bg-amber-600' : 'bg-[#0F5132]'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    {/* Daftar Penghuni */}
                    <div className="mt-3 space-y-1">
                      {room.occupants.length === 0 ? (
                        <div className="text-[11px] text-slate-400 italic">
                          Kamar kosong (Tersedia {room.capacity} bed)
                        </div>
                      ) : (
                        room.occupants.map((occ: any) => (
                          <div
                            key={occ.id}
                            className="text-xs text-slate-700 flex items-center justify-between"
                          >
                            <span className="truncate font-medium">{occ.full_name}</span>
                            <span className="text-[11px] text-slate-400 font-mono shrink-0">
                              {occ.class_grade}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Sisa Kuota:</span>
                    <span className="font-semibold text-[#0F5132] tabular-nums">
                      {room.available} Santri
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Seksi 2: Daftar Perizinan Pulang & Cetak Surat Jalan */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden no-print">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Buku Perizinan Pulang & Surat Jalan Santri
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola pengajuan izin keluar/pulang asrama dan cetak Surat Jalan (Pass Perizinan)
            </p>
          </div>

          <button
            type="button"
            onClick={openModal}
            className="px-4 py-2.5 bg-[#0F5132] hover:bg-[#0b3e26] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Surat Izin Pulang</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-700 bg-slate-50/60">
                <th className="py-4 px-5">Santri & Kamar</th>
                <th className="py-4 px-5">Rentang Tanggal Izin</th>
                <th className="py-4 px-5">Keperluan / Alasan</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5">Penyetuju</th>
                <th className="py-4 px-5 text-right">Aksi & Cetak Pass</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {permsLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    Memuat data perizinan...
                  </td>
                </tr>
              ) : permissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    Belum ada data perizinan pulang santri.
                  </td>
                </tr>
              ) : (
                permissions.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80">
                    <td className="py-4 px-5">
                      <div className="font-semibold text-slate-900">{p.santri_name}</div>
                      <div className="text-xs text-slate-400 font-mono">
                        {p.santri_nis} · {p.room_number} ({p.building})
                      </div>
                    </td>
                    <td className="py-4 px-5 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                      {p.start_date} s/d {p.end_date}
                    </td>
                    <td className="py-4 px-5 text-xs text-slate-700 max-w-xs">{p.reason}</td>
                    <td className="py-4 px-5 text-xs font-bold">
                      {p.status === 'disetujui' ? (
                        <span className="text-emerald-700">DISETUJUI</span>
                      ) : p.status === 'ditolak' ? (
                        <span className="text-red-600">DITOLAK</span>
                      ) : (
                        <span className="text-amber-600">DIPROSES</span>
                      )}
                    </td>
                    <td className="py-4 px-5 text-xs text-slate-600">{p.approved_by}</td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {p.status === 'diproses' && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                statusMutation.mutate({ id: p.id, status: 'disetujui' })
                              }
                              className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                              title="Setujui Izin"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                statusMutation.mutate({ id: p.id, status: 'ditolak' })
                              }
                              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
                              title="Tolak Izin"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => setPrintPermission(p)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#0F5132] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          title="Cetak Surat Jalan / Pass Perizinan"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Surat Jalan</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteMutation.mutate(p.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                          title="Hapus Izin"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Buat Surat Izin Pulang */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#0F5132]" />
                <h3 className="text-base font-bold text-slate-900">
                  Formulir Surat Izin Pulang / Keluar Asrama
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
                    Tanggal Mulai Keluar
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Wajib Kembali
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan / Keperluan Izin Pulang
                </label>
                <textarea
                  rows={2}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Contoh: Pemeriksaan medis di rumah sakit / Acara keluarga"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status Persetujuan
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                >
                  <option value="disetujui">Langsung Disetujui (Terbitkan Surat Jalan)</option>
                  <option value="diproses">Menunggu Verifikasi (Diproses)</option>
                </select>
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
                  Terbitkan Izin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cetak Surat Jalan / Pass Perizinan */}
      {printPermission && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-7 shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-5 border-b border-slate-200 no-print">
              <span className="text-sm font-bold text-[#0F5132]">
                Pratinjau Cetak Surat Jalan / Pass Perizinan
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-[#0F5132] hover:bg-[#0b3e26] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Surat Jalan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintPermission(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Dokumen Surat Jalan Resmi */}
            <div className="border-2 border-[#0F5132] rounded-xl p-6">
              <div className="text-center border-b border-slate-300 pb-4 mb-4">
                <h2 className="text-base font-bold text-[#0F5132] uppercase">
                  SURAT JALAN & PASS PERIZINAN SANTRI
                </h2>
                <p className="text-xs text-slate-600">
                  PENGURUS KEAMANAN & PEMBINAAN SIM-ASRAMA
                </p>
                <p className="text-[11px] font-mono text-slate-500 mt-1">
                  Nomor: SJ/ASR/{printPermission.id}/X/2026
                </p>
              </div>

              <p className="text-xs text-slate-700 mb-4 leading-relaxed">
                Diberikan izin keluar / pulang sementara dari lingkungan asrama kepada santri berikut:
              </p>

              <div className="space-y-2 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
                <div className="grid grid-cols-3">
                  <span className="text-slate-500">Nama Lengkap</span>
                  <span className="col-span-2 font-bold text-slate-900">
                    : {printPermission.santri_name}
                  </span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="text-slate-500">Nomor Induk (NIS)</span>
                  <span className="col-span-2 font-mono text-slate-800">
                    : {printPermission.santri_nis}
                  </span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="text-slate-500">Kelas / Kamar</span>
                  <span className="col-span-2 font-semibold text-slate-800">
                    : {printPermission.class_grade} / {printPermission.room_number} ({printPermission.building})
                  </span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="text-slate-500">Wali Santri</span>
                  <span className="col-span-2 text-slate-800">
                    : {printPermission.parent_name} ({printPermission.parent_phone})
                  </span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="text-slate-500">Berlaku Tanggal</span>
                  <span className="col-span-2 font-mono font-bold text-[#0F5132]">
                    : {printPermission.start_date} s/d {printPermission.end_date}
                  </span>
                </div>
                <div className="grid grid-cols-3">
                  <span className="text-slate-500">Keperluan Izin</span>
                  <span className="col-span-2 text-slate-800">: {printPermission.reason}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center text-xs mt-6 pt-2">
                <div>
                  <div className="text-slate-500">Orang Tua / Wali Penjemput</div>
                  <div className="h-14" />
                  <div className="font-semibold text-slate-800 border-t border-slate-300 pt-1 mx-4">
                    {printPermission.parent_name}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Pembina / Keamanan Asrama</div>
                  <div className="h-14" />
                  <div className="font-semibold text-slate-800 border-t border-slate-300 pt-1 mx-4">
                    {printPermission.approved_by !== '-'
                      ? printPermission.approved_by
                      : user?.full_name}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
