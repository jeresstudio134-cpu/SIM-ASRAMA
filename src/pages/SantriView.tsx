import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  FileText,
  Edit3,
  Trash2,
  Upload,
  Printer,
  X,
  AlertCircle,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';
import { apiClient, SantriItem, uploadMediaFile } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const SantriView: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('aktif');
  const [genderFilter, setGenderFilter] = useState('all');

  // Add / Edit Modal State
  const [formOpen, setFormOpen] = useState(false);
  const [editingSantri, setEditingSantri] = useState<SantriItem | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [formData, setFormData] = useState({
    nis: '',
    full_name: '',
    gender: 'L' as 'L' | 'P',
    birth_place: '',
    birth_date: '2009-01-01',
    room_number: 'A-101',
    building: 'Gedung A' as 'Gedung A' | 'Gedung B',
    class_grade: '10 IPA 1',
    parent_name: '',
    parent_phone: '',
    photo_url: '',
    status: 'aktif' as 'aktif' | 'alumni',
  });

  // Detail & Rapor Modal State
  const [selectedRaporId, setSelectedRaporId] = useState<number | null>(null);

  const canMutate = user?.role === 'admin' || user?.role === 'pembina';

  const { data: santriList = [], isLoading } = useQuery<SantriItem[]>({
    queryKey: ['santri', search, buildingFilter, statusFilter, genderFilter],
    queryFn: async () => {
      const res = await apiClient.get('/santri', {
        params: {
          q: search,
          building: buildingFilter,
          status: statusFilter,
          gender: genderFilter,
        },
      });
      return res.data;
    },
  });

  const { data: raporData, isLoading: raporLoading } = useQuery({
    queryKey: ['santri-rapor', selectedRaporId],
    enabled: selectedRaporId !== null,
    queryFn: async () => {
      const res = await apiClient.get(`/santri/${selectedRaporId}/rapor`);
      return res.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      if (editingSantri) {
        return apiClient.put(`/santri/${editingSantri.id}`, payload);
      }
      return apiClient.post('/santri', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['santri'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setFormOpen(false);
      setEditingSantri(null);
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message || 'Gagal menyimpan data santri.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.delete(`/santri/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['santri'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const openCreateModal = () => {
    const defaultBuilding =
      user?.role === 'pembina' && user.building_assignment === 'Gedung B'
        ? 'Gedung B'
        : 'Gedung A';

    setEditingSantri(null);
    setFormError(null);
    setFormData({
      nis: `20240100${santriList.length + 1}`,
      full_name: '',
      gender: defaultBuilding === 'Gedung B' ? 'P' : 'L',
      birth_place: '',
      birth_date: '2009-05-15',
      room_number: defaultBuilding === 'Gedung B' ? 'B-201' : 'A-101',
      building: defaultBuilding,
      class_grade: '10 IPA 1',
      parent_name: '',
      parent_phone: '',
      photo_url: '',
      status: 'aktif',
    });
    setFormOpen(true);
  };

  const openEditModal = (s: SantriItem) => {
    setEditingSantri(s);
    setFormError(null);
    setFormData({
      nis: s.nis,
      full_name: s.full_name,
      gender: s.gender,
      birth_place: s.birth_place,
      birth_date: s.birth_date,
      room_number: s.room_number,
      building: s.building,
      class_grade: s.class_grade,
      parent_name: s.parent_name,
      parent_phone: s.parent_phone,
      photo_url: s.photo_url || '',
      status: s.status,
    });
    setFormOpen(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setFormError(null);
    try {
      const uploaded = await uploadMediaFile(file, 'sim-asrama/santri');
      setFormData((prev) => ({ ...prev, photo_url: uploaded.url }));
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Gagal mengunggah foto santri.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <div className="space-y-5">
      {/* Top Search & Action Bar matching image.png */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 no-print">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari Santri (Nama / NIS)..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F5132] transition-colors"
            />
          </div>

          {user?.building_assignment === 'Semua' && (
            <select
              value={buildingFilter}
              onChange={(e) => setBuildingFilter(e.target.value)}
              className="px-3.5 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-[#0F5132]"
            >
              <option value="all">Semua Gedung</option>
              <option value="Gedung A">Gedung A (Putra)</option>
              <option value="Gedung B">Gedung B (Putri)</option>
            </select>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-[#0F5132]"
          >
            <option value="aktif">Status: Santri Aktif</option>
            <option value="alumni">Status: Alumni</option>
            <option value="all">Semua Status</option>
          </select>

          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="px-3.5 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-[#0F5132]"
          >
            <option value="all">Semua Gender</option>
            <option value="L">Laki-laki (Putra)</option>
            <option value="P">Perempuan (Putri)</option>
          </select>
        </div>

        {canMutate && (
          <button
            type="button"
            onClick={openCreateModal}
            className="px-5 py-2.5 bg-[#0F5132] hover:bg-[#0b3e26] text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Santri</span>
          </button>
        )}
      </div>

      {/* Main Santri Table matching image.png */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden no-print">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-700 bg-slate-50/60">
                <th className="py-4 px-5">NIS</th>
                <th className="py-4 px-5">Nama</th>
                <th className="py-4 px-5">Kelas</th>
                <th className="py-4 px-5">Kamar & Gedung</th>
                <th className="py-4 px-5">Poin Disiplin</th>
                <th className="py-4 px-5">Wali Santri</th>
                <th className="py-4 px-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                    Memuat database santri...
                  </td>
                </tr>
              ) : santriList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="text-sm font-semibold text-slate-700">
                      Tidak ada data santri yang sesuai dengan filter
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Ubah kata kunci pencarian atau tambahkan data santri baru.
                    </p>
                  </td>
                </tr>
              ) : (
                santriList.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-4 px-5 font-mono text-xs text-slate-600 tabular-nums">
                      {s.nis}
                    </td>

                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        {s.photo_url ? (
                          <img
                            src={s.photo_url}
                            alt={s.full_name}
                            referrerPolicy="no-referrer"
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200 text-[#0F5132] flex items-center justify-center text-xs font-bold shrink-0">
                            {s.full_name
                              .split(' ')
                              .slice(0, 2)
                              .map((w) => w[0])
                              .join('')
                              .toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-slate-900">{s.full_name}</div>
                          <div className="text-xs text-slate-400">
                            {s.gender === 'L' ? 'Putra' : 'Putri'} · {s.status === 'aktif' ? 'Aktif' : 'Alumni'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-5 text-slate-700">{s.class_grade}</td>

                    <td className="py-4 px-5">
                      <div className="font-semibold text-slate-900">{s.room_number}</div>
                      <div className="text-xs text-slate-400">{s.building}</div>
                    </td>

                    <td className="py-4 px-5">
                      <div
                        className={`font-bold tabular-nums ${
                          s.riskStatus === 'Bahaya/SP'
                            ? 'text-red-600'
                            : s.riskStatus === 'Waspada'
                            ? 'text-amber-600'
                            : 'text-[#0F5132]'
                        }`}
                      >
                        {s.netDisciplineScore}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Status: {s.riskStatus} ({s.totalViolationPoints} poin pelanggaran)
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <div className="text-xs font-medium text-slate-700">{s.parent_name}</div>
                      <div className="text-xs text-slate-400 font-mono tabular-nums">
                        ({s.parent_phone})
                      </div>
                    </td>

                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedRaporId(s.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#0F5132] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Lihat Profil & Cetak Rapor Santri"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Rapor</span>
                        </button>

                        {canMutate && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditModal(s)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                              title="Edit Data Santri"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteMutation.mutate(s.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                              title="Hapus Santri"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Edit Santri */}
      {formOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 shadow-xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingSantri ? `Edit Data Santri: ${editingSantri.full_name}` : 'Tambah Santri Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Upload Foto Santri via Cloudinary Backend */}
              <div className="flex items-center gap-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                {formData.photo_url ? (
                  <img
                    src={formData.photo_url}
                    alt="Preview Foto Santri"
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-full object-cover border border-emerald-300"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-[#0F5132] flex items-center justify-center font-bold text-sm">
                    FOTO
                  </div>
                )}
                <div className="flex-1">
                  <label className="text-xs font-semibold text-slate-800 block">
                    Foto Profil Santri (Integrasi Cloudinary SDK)
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Unggah foto formal santri (JPG/PNG, maks. 5MB).
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <label className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-[#0F5132] text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer">
                      <Upload className="w-3.5 h-3.5 text-[#0F5132]" />
                      <span>{uploadingPhoto ? 'Mengunggah...' : 'Pilih Berkas Foto'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                    {formData.photo_url && (
                      <span className="text-[11px] text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Foto siap disimpan
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor Induk Santri (NIS)
                  </label>
                  <input
                    type="text"
                    value={formData.nis}
                    onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Lengkap Santri
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value as 'L' | 'P' })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                  >
                    <option value="L">Laki-laki (Putra)</option>
                    <option value="P">Perempuan (Putri)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kelas / Tingkat Pendidikan
                  </label>
                  <input
                    type="text"
                    value={formData.class_grade}
                    onChange={(e) => setFormData({ ...formData, class_grade: e.target.value })}
                    placeholder="Contoh: 10 IPA 1"
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gedung Asrama
                  </label>
                  <select
                    value={formData.building}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        building: e.target.value as 'Gedung A' | 'Gedung B',
                      })
                    }
                    disabled={
                      user?.role === 'pembina' && user.building_assignment !== 'Semua'
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl disabled:bg-slate-100"
                  >
                    <option value="Gedung A">Gedung A (Asrama Putra)</option>
                    <option value="Gedung B">Gedung B (Asrama Putri)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nomor Kamar
                  </label>
                  <input
                    type="text"
                    value={formData.room_number}
                    onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                    placeholder="Contoh: A-101 atau B-204"
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tempat Lahir
                  </label>
                  <input
                    type="text"
                    value={formData.birth_place}
                    onChange={(e) => setFormData({ ...formData, birth_place: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Lahir
                  </label>
                  <input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Orang Tua / Wali Santri
                  </label>
                  <input
                    type="text"
                    value={formData.parent_name}
                    onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. Telepon / WhatsApp Wali
                  </label>
                  <input
                    type="text"
                    value={formData.parent_phone}
                    onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Keaktifan Santri
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as 'aktif' | 'alumni',
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                  >
                    <option value="aktif">Aktif</option>
                    <option value="alumni">Alumni</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending || uploadingPhoto}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#0F5132] hover:bg-[#0b3e26] rounded-xl cursor-pointer"
                >
                  {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Data Santri'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail & Rapor Santri (Siap Cetak / PDF) */}
      {selectedRaporId !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full p-6 sm:p-8 shadow-2xl my-8 max-h-[92vh] overflow-y-auto">
            {raporLoading || !raporData ? (
              <div className="py-12 text-center text-sm text-slate-500">
                Memuat Rapor Lengkap Santri...
              </div>
            ) : (
              <div>
                {/* Top Action Header (hidden when printing) */}
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 no-print">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#0F5132]">
                    <UserCheck className="w-5 h-5" />
                    <span>Profil Lengkap & Rapor Evaluasi Santri</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-4 py-2 rounded-xl bg-[#0F5132] hover:bg-[#0b3e26] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Cetak Rapor / PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRaporId(null)}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Kop Surat Rapor Asrama */}
                <div className="border-b-2 border-[#0F5132] pb-4 mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[#0F5132] uppercase tracking-wide">
                      PONDOK PESANTREN & ASRAMA TERPADU SIM-ASRAMA
                    </h2>
                    <p className="text-xs text-slate-600">
                      Laporan Evaluasi Kedisiplinan, Pembinaan, Prestasi, dan Keuangan Santri
                    </p>
                  </div>
                  <div className="text-right font-mono text-xs text-slate-500 tabular-nums">
                    <div>Tanggal Cetak: {new Date().toLocaleDateString('id-ID')}</div>
                    <div>NIS: {raporData.santri.nis}</div>
                  </div>
                </div>

                {/* Biodata & Ringkasan Poin */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="md:col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-y-2 text-xs">
                    <div>
                      <span className="text-slate-500">Nama Santri:</span>
                      <div className="font-bold text-slate-900 text-sm">
                        {raporData.santri.full_name}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Kamar & Gedung:</span>
                      <div className="font-semibold text-slate-900">
                        {raporData.santri.room_number} ({raporData.santri.building})
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Kelas / Jenjang:</span>
                      <div className="font-semibold text-slate-900">
                        {raporData.santri.class_grade}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Tempat, Tgl Lahir:</span>
                      <div className="font-semibold text-slate-900">
                        {raporData.santri.birth_place}, {raporData.santri.birth_date}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Nama Wali:</span>
                      <div className="font-semibold text-slate-900">
                        {raporData.santri.parent_name}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Kontak Wali:</span>
                      <div className="font-mono text-slate-900">
                        {raporData.santri.parent_phone}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col justify-between">
                    <div className="text-xs font-semibold text-emerald-950">
                      Skor Disiplin & Status Risiko
                    </div>
                    <div className="text-3xl font-bold text-[#0F5132] tabular-nums my-1">
                      {raporData.santri.netDisciplineScore}{' '}
                      <span className="text-xs font-normal text-slate-600">/ 100</span>
                    </div>
                    <div className="text-xs text-slate-700">
                      Status Risiko: <span className="font-bold">{raporData.santri.riskStatus}</span>
                      {' · '}Poin Pelanggaran: {raporData.santri.totalViolationPoints}
                    </div>
                  </div>
                </div>

                {/* Seksi 1: Catatan Pelanggaran & Prestasi */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      1. Riwayat Pelanggaran ({raporData.violations.length})
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">Tanggal</th>
                            <th className="p-2.5">Jenis & Sanksi</th>
                            <th className="p-2.5 text-right">Poin</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {raporData.violations.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="p-3 text-center text-slate-400">
                                Nihil (Tidak ada catatan pelanggaran)
                              </td>
                            </tr>
                          ) : (
                            raporData.violations.map((v: any) => (
                              <tr key={v.id}>
                                <td className="p-2.5 font-mono whitespace-nowrap">
                                  {v.violation_date}
                                </td>
                                <td className="p-2.5">
                                  <div className="font-semibold text-slate-800">
                                    {v.violation_type}
                                  </div>
                                  <div className="text-slate-500">Sanksi: {v.penalty}</div>
                                </td>
                                <td className="p-2.5 text-right font-mono font-bold text-red-600">
                                  +{v.points}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      2. Capaian Prestasi ({raporData.achievements.length})
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">Tanggal</th>
                            <th className="p-2.5">Prestasi & Tingkat</th>
                            <th className="p-2.5 text-right">Poin</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {raporData.achievements.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="p-3 text-center text-slate-400">
                                Belum ada catatan prestasi
                              </td>
                            </tr>
                          ) : (
                            raporData.achievements.map((a: any) => (
                              <tr key={a.id}>
                                <td className="p-2.5 font-mono whitespace-nowrap">
                                  {a.achievement_date}
                                </td>
                                <td className="p-2.5">
                                  <div className="font-semibold text-slate-800">{a.title}</div>
                                  <div className="text-slate-500">Tingkat: {a.level}</div>
                                </td>
                                <td className="p-2.5 text-right font-mono font-bold text-[#0F5132]">
                                  +{a.points}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Seksi 2: Bimbingan Konseling & Keuangan */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      3. Riwayat Bimbingan Konseling ({raporData.counseling.length})
                    </h4>
                    <div className="border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
                      {raporData.counseling.length === 0 ? (
                        <div className="text-slate-400 text-center py-2">
                          Belum ada catatan sesi bimbingan konseling
                        </div>
                      ) : (
                        raporData.counseling.map((c: any) => (
                          <div key={c.id} className="pb-2 border-b border-slate-100 last:border-none">
                            <div className="font-semibold text-slate-800">
                              {c.counseling_date} — {c.topic}
                            </div>
                            <div className="text-slate-600 mt-0.5">
                              Tindak Lanjut: {c.follow_up}
                            </div>
                            <div className="text-slate-400 text-[11px]">
                              Pembimbing: {c.counselor_name}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      4. Ringkasan Keuangan & Perizinan
                    </h4>
                    <div className="border border-slate-200 rounded-xl p-3.5 space-y-2.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Saldo Tabungan Uang Saku:</span>
                        <span className="font-mono font-bold text-[#0F5132]">
                          Rp {Number(raporData.pocketMoney.balance).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Status SPP Bulan Berjalan:</span>
                        <span className="font-semibold text-slate-900">
                          {raporData.spp[0]?.status === 'lunas' ? 'LUNAS' : 'TUNGGAKAN'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Riwayat Izin Pulang:</span>
                        <span className="font-mono font-semibold text-slate-900">
                          {raporData.permissions.length} Kali
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
