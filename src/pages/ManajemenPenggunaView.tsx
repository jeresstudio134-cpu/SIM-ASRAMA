import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  Plus,
  Search,
  Edit3,
  Trash2,
  KeyRound,
  Power,
  Clock,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { apiClient, BuildingAssignment, UserRole } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const ManajemenPenggunaView: React.FC = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'users' | 'logs'>('users');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Modal Tambah/Edit Pengguna
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'pembina' as UserRole,
    building_assignment: 'Gedung A' as BuildingAssignment,
    phone_number: '',
    is_active: true,
  });

  // Modal Reset Password
  const [resetUserTarget, setResetUserTarget] = useState<any | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');

  const { data: usersList = [], isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ['users', roleFilter, statusFilter, search],
    queryFn: async () => {
      const res = await apiClient.get('/users', {
        params: {
          role: roleFilter,
          status: statusFilter,
          q: search,
        },
      });
      return res.data;
    },
  });

  const { data: activityLogs = [], isLoading: logsLoading } = useQuery<any[]>({
    queryKey: ['activity-logs'],
    queryFn: async () => {
      const res = await apiClient.get('/activity-logs');
      return res.data;
    },
  });

  const saveUserMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      if (editingUser) {
        return apiClient.put(`/users/${editingUser.id}`, payload);
      }
      return apiClient.post('/users', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      setModalOpen(false);
      setEditingUser(null);
      setFormError(null);
      setFeedbackNotice('Data pengguna berhasil disimpan.');
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message || 'Gagal menyimpan data pengguna.');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.patch(`/users/${id}/toggle-active`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      setFeedbackNotice('Status keaktifan akun berhasil diperbarui.');
    },
    onError: (err: any) => {
      setFeedbackNotice(err?.response?.data?.message || 'Gagal mengubah status akun.');
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, newPassword }: { id: number; newPassword: string }) => {
      return apiClient.patch(`/users/${id}/reset-password`, { newPassword });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      setResetUserTarget(null);
      setNewResetPassword('');
      setFeedbackNotice(res.data?.message || 'Password berhasil direset.');
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message || 'Gagal mereset password.');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
      setFeedbackNotice('Akun pengguna berhasil dihapus.');
    },
    onError: (err: any) => {
      setFeedbackNotice(err?.response?.data?.message || 'Gagal menghapus pengguna.');
    },
  });

  const openCreateModal = () => {
    setEditingUser(null);
    setFormError(null);
    setFormData({
      username: '',
      password: '',
      full_name: '',
      role: 'pembina',
      building_assignment: 'Gedung A',
      phone_number: '',
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (u: any) => {
    setEditingUser(u);
    setFormError(null);
    setFormData({
      username: u.username,
      password: '',
      full_name: u.full_name,
      role: u.role,
      building_assignment: u.building_assignment,
      phone_number: u.phone_number,
      is_active: u.is_active,
    });
    setModalOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Sub-navigation Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'users'
                ? 'bg-[#0F5132] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Daftar Akun Pengguna ({usersList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-[#0F5132] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Log Aktivitas Sistem ({activityLogs.length})</span>
          </button>
        </div>

        {activeTab === 'users' && (
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 bg-[#0F5132] hover:bg-[#0b3e26] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Pengguna Baru</span>
          </button>
        )}
      </div>

      {feedbackNotice && (
        <div className="bg-white rounded-xl border border-emerald-200 p-3.5 flex items-center justify-between text-xs text-slate-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#0F5132]" />
            <span>{feedbackNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackNotice(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {activeTab === 'users' ? (
        <>
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama pengguna, username, atau nomor telepon..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F5132]"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3.5 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
            >
              <option value="all">Semua Role</option>
              <option value="admin">Role: Admin</option>
              <option value="pembina">Role: Pembina</option>
              <option value="bendahara">Role: Bendahara</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
            >
              <option value="all">Semua Status</option>
              <option value="aktif">Status: Aktif</option>
              <option value="nonaktif">Status: Nonaktif</option>
            </select>
          </div>

          {/* Tabel Pengguna */}
          <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-bold text-slate-700 bg-slate-50/60">
                    <th className="py-4 px-5">Nama & Username</th>
                    <th className="py-4 px-5">Peran (Role)</th>
                    <th className="py-4 px-5">Penugasan Gedung</th>
                    <th className="py-4 px-5">No. Telepon</th>
                    <th className="py-4 px-5">Status Akun</th>
                    <th className="py-4 px-5 text-right">Aksi Manajemen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {usersLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                        Memuat daftar pengguna...
                      </td>
                    </tr>
                  ) : (
                    usersList.map((u) => {
                      const isSelf = u.id === currentUser?.id;
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/80">
                          <td className="py-4 px-5">
                            <div className="font-semibold text-slate-900">
                              {u.full_name}{' '}
                              {isSelf && (
                                <span className="text-[11px] font-normal text-[#0F5132]">
                                  (Akun Anda)
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-mono text-slate-400">@{u.username}</div>
                          </td>
                          <td className="py-4 px-5 text-xs font-bold uppercase text-slate-800">
                            {u.role}
                          </td>
                          <td className="py-4 px-5 text-xs font-semibold text-[#0F5132]">
                            {u.building_assignment}
                          </td>
                          <td className="py-4 px-5 font-mono text-xs text-slate-600 tabular-nums">
                            {u.phone_number}
                          </td>
                          <td className="py-4 px-5 text-xs font-bold">
                            {u.is_active ? (
                              <span className="text-emerald-700">AKTIF</span>
                            ) : (
                              <span className="text-slate-400">NONAKTIF</span>
                            )}
                          </td>
                          <td className="py-4 px-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setFormError(null);
                                  setNewResetPassword('');
                                  setResetUserTarget(u);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                title="Reset Password Pengguna"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                                <span>Reset Sandi</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => openEditModal(u)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                                title="Edit Pengguna"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                disabled={isSelf}
                                onClick={() => toggleActiveMutation.mutate(u.id)}
                                className={`p-1.5 rounded-lg cursor-pointer disabled:opacity-30 ${
                                  u.is_active
                                    ? 'text-amber-600 hover:bg-amber-50'
                                    : 'text-emerald-700 hover:bg-emerald-50'
                                }`}
                                title={
                                  isSelf
                                    ? 'Tidak dapat menonaktifkan akun sendiri'
                                    : u.is_active
                                    ? 'Nonaktifkan Akun'
                                    : 'Aktifkan Akun'
                                }
                              >
                                <Power className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                disabled={isSelf}
                                onClick={() => deleteUserMutation.mutate(u.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer disabled:opacity-30"
                                title={
                                  isSelf
                                    ? 'Tidak dapat menghapus akun sendiri'
                                    : 'Hapus Akun Pengguna'
                                }
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* TAB 2: LOG AKTIVITAS SISTEM */
        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              Rekam Jejak Audit & Log Aktivitas Sistem
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Memantau penambahan, perubahan, dan penghapusan data pengguna maupun operasional beserta stempel waktu
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold text-slate-700 bg-slate-50/60">
                  <th className="py-3.5 px-5">Waktu (Timestamp)</th>
                  <th className="py-3.5 px-5">Pelaksana</th>
                  <th className="py-3.5 px-5">Aksi</th>
                  <th className="py-3.5 px-5">Rincian Aktivitas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {logsLoading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      Memuat log aktivitas...
                    </td>
                  </tr>
                ) : (
                  activityLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80">
                      <td className="py-3.5 px-5 font-mono text-slate-500 whitespace-nowrap tabular-nums">
                        {new Date(log.timestamp).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-5 font-semibold text-slate-900">
                        {log.user_name}
                      </td>
                      <td className="py-3.5 px-5 font-bold text-[#0F5132]">{log.action}</td>
                      <td className="py-3.5 px-5 text-slate-600">{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Pengguna */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingUser ? `Edit Pengguna: ${editingUser.full_name}` : 'Tambah Pengguna Baru'}
              </h3>
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
                saveUserMutation.mutate(formData);
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
                  Nama Lengkap & Gelar
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Username Login
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. Telepon / WA
                  </label>
                  <input
                    type="text"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl font-mono"
                    required
                  />
                </div>
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password Awal (Min. 6 Karakter)
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Role / Hak Akses
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => {
                      const nextRole = e.target.value as UserRole;
                      setFormData({
                        ...formData,
                        role: nextRole,
                        building_assignment:
                          nextRole === 'admin' || nextRole === 'bendahara'
                            ? 'Semua'
                            : formData.building_assignment,
                      });
                    }}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                  >
                    <option value="admin">Admin</option>
                    <option value="pembina">Pembina Asrama</option>
                    <option value="bendahara">Bendahara</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Penugasan Lokasi Gedung
                  </label>
                  <select
                    value={formData.building_assignment}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        building_assignment: e.target.value as BuildingAssignment,
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                  >
                    <option value="Semua">Semua Gedung</option>
                    <option value="Gedung A">Gedung A (Putra)</option>
                    <option value="Gedung B">Gedung B (Putri)</option>
                  </select>
                </div>
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
                  disabled={saveUserMutation.isPending}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#0F5132] hover:bg-[#0b3e26] rounded-xl cursor-pointer"
                >
                  Simpan Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reset Password Pengguna */}
      {resetUserTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Reset Password Pengguna</h3>
              <button
                type="button"
                onClick={() => setResetUserTarget(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                resetPasswordMutation.mutate({
                  id: resetUserTarget.id,
                  newPassword: newResetPassword,
                });
              }}
              className="mt-4 space-y-4"
            >
              <p className="text-xs text-slate-600">
                Tetapkan kata sandi baru untuk akun{' '}
                <span className="font-bold text-slate-900">{resetUserTarget.full_name}</span> (@
                {resetUserTarget.username}):
              </p>

              {formError && (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password Baru (Min. 6 Karakter)
                </label>
                <input
                  type="password"
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetUserTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={resetPasswordMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0F5132] hover:bg-[#0b3e26] rounded-xl cursor-pointer"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
