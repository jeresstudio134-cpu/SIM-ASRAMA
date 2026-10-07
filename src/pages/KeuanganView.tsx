import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign,
  Plus,
  CheckCircle2,
  Clock,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  Upload,
  X,
  AlertCircle,
} from 'lucide-react';
import { apiClient, SantriItem, uploadMediaFile } from '../services/api';

type FinanceSubTab = 'spp' | 'pocket' | 'cash';

export const KeuanganView: React.FC = () => {
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState<FinanceSubTab>('spp');

  // SPP State
  const [sppStatusFilter, setSppStatusFilter] = useState('all');
  const [sppModalOpen, setSppModalOpen] = useState(false);
  const [sppUploading, setSppUploading] = useState(false);
  const [sppForm, setSppForm] = useState({
    santri_id: '',
    month: 'Oktober',
    year: 2026,
    amount: 850000,
    status: 'lunas',
    proof_url: '',
  });

  // Pocket Money State
  const [pocketModalOpen, setPocketModalOpen] = useState(false);
  const [pocketForm, setPocketForm] = useState({
    santri_id: '',
    transaction_type: 'masuk' as 'masuk' | 'keluar',
    amount: 200000,
    description: '',
    transaction_date: new Date().toISOString().slice(0, 10),
  });

  // Operational Cash State
  const [cashModalOpen, setCashModalOpen] = useState(false);
  const [cashForm, setCashForm] = useState({
    type: 'masuk' as 'masuk' | 'keluar',
    category: 'Penerimaan SPP',
    amount: 1000000,
    description: '',
    transaction_date: new Date().toISOString().slice(0, 10),
  });

  const [formError, setFormError] = useState<string | null>(null);

  // Queries
  const { data: santriList = [] } = useQuery<SantriItem[]>({
    queryKey: ['santri-active-options'],
    queryFn: async () => {
      const res = await apiClient.get('/santri', { params: { status: 'aktif' } });
      return res.data;
    },
  });

  const { data: sppList = [], isLoading: sppLoading } = useQuery<any[]>({
    queryKey: ['finance-spp', sppStatusFilter],
    queryFn: async () => {
      const res = await apiClient.get('/finance/spp', {
        params: { status: sppStatusFilter },
      });
      return res.data;
    },
  });

  const { data: pocketData, isLoading: pocketLoading } = useQuery<{
    balances: any[];
    transactions: any[];
  }>({
    queryKey: ['finance-pocket'],
    queryFn: async () => {
      const res = await apiClient.get('/finance/pocket-money');
      return res.data;
    },
  });

  const { data: cashData, isLoading: cashLoading } = useQuery<{
    summary: { totalMasuk: number; totalKeluar: number; saldoAkhir: number };
    transactions: any[];
  }>({
    queryKey: ['finance-cash'],
    queryFn: async () => {
      const res = await apiClient.get('/finance/operational-cash');
      return res.data;
    },
  });

  // Mutations
  const toggleSppMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.patch(`/finance/spp/${id}/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-spp'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const createSppMutation = useMutation({
    mutationFn: async (payload: typeof sppForm) => {
      return apiClient.post('/finance/spp', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-spp'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setSppModalOpen(false);
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message || 'Gagal menyimpan data SPP.');
    },
  });

  const createPocketMutation = useMutation({
    mutationFn: async (payload: typeof pocketForm) => {
      return apiClient.post('/finance/pocket-money', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-pocket'] });
      setPocketModalOpen(false);
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message || 'Gagal mencatat transaksi uang saku.');
    },
  });

  const createCashMutation = useMutation({
    mutationFn: async (payload: typeof cashForm) => {
      return apiClient.post('/finance/operational-cash', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-cash'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setCashModalOpen(false);
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message || 'Gagal mencatat kas operasional.');
    },
  });

  const deleteCashMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.delete(`/finance/operational-cash/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-cash'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSppUploading(true);
    try {
      const uploaded = await uploadMediaFile(file, 'sim-asrama/spp');
      setSppForm((prev) => ({ ...prev, proof_url: uploaded.url }));
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Gagal mengunggah bukti pembayaran.');
    } finally {
      setSppUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Sub-navigation Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setSubTab('spp')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              subTab === 'spp'
                ? 'bg-[#0F5132] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1. SPP / Iuran Bulanan
          </button>
          <button
            type="button"
            onClick={() => setSubTab('pocket')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              subTab === 'pocket'
                ? 'bg-[#0F5132] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2. Tabungan / Uang Saku Santri
          </button>
          <button
            type="button"
            onClick={() => setSubTab('cash')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              subTab === 'cash'
                ? 'bg-[#0F5132] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            3. Kas Operasional Asrama
          </button>
        </div>

        {subTab === 'spp' && (
          <div className="flex items-center gap-2">
            <select
              value={sppStatusFilter}
              onChange={(e) => setSppStatusFilter(e.target.value)}
              className="px-3.5 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
            >
              <option value="all">Semua Status SPP</option>
              <option value="lunas">Status: Lunas</option>
              <option value="tunggakan">Status: Tunggakan</option>
            </select>
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setSppForm({
                  santri_id: santriList[0]?.id ? String(santriList[0].id) : '',
                  month: 'Oktober',
                  year: 2026,
                  amount: 850000,
                  status: 'lunas',
                  proof_url: '',
                });
                setSppModalOpen(true);
              }}
              className="px-4 py-2 bg-[#0F5132] hover:bg-[#0b3e26] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Input SPP Baru</span>
            </button>
          </div>
        )}

        {subTab === 'pocket' && (
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setPocketForm({
                santri_id: santriList[0]?.id ? String(santriList[0].id) : '',
                transaction_type: 'masuk',
                amount: 250000,
                description: '',
                transaction_date: new Date().toISOString().slice(0, 10),
              });
              setPocketModalOpen(true);
            }}
            className="px-4 py-2 bg-[#0F5132] hover:bg-[#0b3e26] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Setor / Tarik Uang Saku</span>
          </button>
        )}

        {subTab === 'cash' && (
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setCashModalOpen(true);
            }}
            className="px-4 py-2 bg-[#0F5132] hover:bg-[#0b3e26] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Transaksi Kas</span>
          </button>
        )}
      </div>

      {/* TAB 1: SPP / IURAN BULANAN */}
      {subTab === 'spp' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold text-slate-700 bg-slate-50/60">
                  <th className="py-4 px-5">NIS & Nama Santri</th>
                  <th className="py-4 px-5">Kamar & Kelas</th>
                  <th className="py-4 px-5">Periode Tagihan</th>
                  <th className="py-4 px-5">Nominal SPP</th>
                  <th className="py-4 px-5">Status Pembayaran</th>
                  <th className="py-4 px-5">Waktu Pelunasan</th>
                  <th className="py-4 px-5 text-right">Aksi Toggle Bayar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {sppLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                      Memuat data SPP santri...
                    </td>
                  </tr>
                ) : sppList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                      Tidak ada data SPP yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  sppList.map((item) => {
                    const isLunas = item.status === 'lunas';
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-5">
                          <div className="font-semibold text-slate-900">{item.santri_name}</div>
                          <div className="text-xs text-slate-400 font-mono">{item.santri_nis}</div>
                        </td>
                        <td className="py-4 px-5 text-xs text-slate-600">
                          <div className="font-semibold text-slate-800">{item.room_number}</div>
                          <div>{item.class_grade}</div>
                        </td>
                        <td className="py-4 px-5 text-xs font-semibold text-slate-800">
                          {item.month} {item.year}
                        </td>
                        <td className="py-4 px-5 font-mono font-semibold text-slate-900 tabular-nums">
                          Rp {Number(item.amount).toLocaleString('id-ID')}
                        </td>
                        <td className="py-4 px-5">
                          {isLunas ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                              <CheckCircle2 className="w-4 h-4" />
                              LUNAS
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600">
                              <Clock className="w-4 h-4" />
                              TUNGGAKAN
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-5 text-xs font-mono text-slate-500 tabular-nums">
                          {item.paid_at
                            ? new Date(item.paid_at).toLocaleDateString('id-ID')
                            : 'Belum dibayar'}
                        </td>
                        <td className="py-4 px-5 text-right">
                          <button
                            type="button"
                            onClick={() => toggleSppMutation.mutate(item.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                              isLunas
                                ? 'bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-800'
                                : 'bg-[#0F5132] hover:bg-[#0b3e26] text-white'
                            }`}
                          >
                            {isLunas ? 'Tandai Tunggakan' : 'Verifikasi Lunas'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TABUNGAN / UANG SAKU SANTRI */}
      {subTab === 'pocket' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Saldo Uang Saku per Santri */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Rekap Saldo Uang Saku Santri
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Posisi saldo tabungan masing-masing santri aktif
            </p>

            {pocketLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Memuat saldo...</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pocketData?.balances.map((b) => (
                  <div
                    key={b.santri_id}
                    className="py-3 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-900">{b.santri_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {b.santri_nis} · {b.room_number}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold font-mono text-[#0F5132] tabular-nums">
                        Rp {Number(b.balance).toLocaleString('id-ID')}
                      </div>
                      <div className="text-[10px] text-slate-400 tabular-nums">
                        +{Number(b.total_masuk / 1000)}k / -{Number(b.total_keluar / 1000)}k
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Riwayat Mutasi Setor & Tarik Uang Saku */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Riwayat Mutasi Setor & Tarik Uang Saku
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Seluruh transaksi penitipan dan penarikan uang saku santri
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-bold text-slate-700 bg-slate-50/60">
                    <th className="py-3.5 px-5">Tanggal</th>
                    <th className="py-3.5 px-5">Santri</th>
                    <th className="py-3.5 px-5">Tipe</th>
                    <th className="py-3.5 px-5">Keterangan</th>
                    <th className="py-3.5 px-5 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {pocketData?.transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80">
                      <td className="py-3.5 px-5 font-mono text-slate-500 tabular-nums">
                        {t.transaction_date}
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-slate-900">{t.santri_name}</div>
                        <div className="text-slate-400 font-mono">{t.room_number}</div>
                      </td>
                      <td className="py-3.5 px-5">
                        {t.transaction_type === 'masuk' ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                            <ArrowDownLeft className="w-3.5 h-3.5" /> SETOR
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-700">
                            <ArrowUpRight className="w-3.5 h-3.5" /> TARIK
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-slate-600">{t.description}</td>
                      <td
                        className={`py-3.5 px-5 text-right font-mono font-bold tabular-nums ${
                          t.transaction_type === 'masuk' ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {t.transaction_type === 'masuk' ? '+' : '-'}Rp{' '}
                        {Number(t.amount).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: KAS OPERASIONAL ASRAMA */}
      {subTab === 'cash' && (
        <div className="space-y-5">
          {/* 3 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5">
              <div className="text-xs font-semibold text-slate-500">TOTAL PEMASUKAN KAS</div>
              <div className="text-2xl font-bold text-emerald-700 mt-1.5 font-mono tabular-nums">
                Rp {Number(cashData?.summary.totalMasuk || 0).toLocaleString('id-ID')}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-5">
              <div className="text-xs font-semibold text-slate-500">TOTAL PENGELUARAN KAS</div>
              <div className="text-2xl font-bold text-amber-700 mt-1.5 font-mono tabular-nums">
                Rp {Number(cashData?.summary.totalKeluar || 0).toLocaleString('id-ID')}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>SALDO AKHIR KAS ASRAMA</span>
                <Wallet className="w-4 h-4 text-[#0F5132]" />
              </div>
              <div className="text-2xl font-bold text-[#0F5132] mt-1.5 font-mono tabular-nums">
                Rp {Number(cashData?.summary.saldoAkhir || 0).toLocaleString('id-ID')}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-bold text-slate-700 bg-slate-50/60">
                    <th className="py-4 px-5">Tanggal</th>
                    <th className="py-4 px-5">Kategori</th>
                    <th className="py-4 px-5">Uraian Transaksi</th>
                    <th className="py-4 px-5">Jenis Arus</th>
                    <th className="py-4 px-5">Dicatat Oleh</th>
                    <th className="py-4 px-5 text-right">Nominal</th>
                    <th className="py-4 px-5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {cashLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                        Memuat buku kas operasional...
                      </td>
                    </tr>
                  ) : (
                    cashData?.transactions.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80">
                        <td className="py-4 px-5 font-mono text-xs text-slate-500 tabular-nums">
                          {c.transaction_date}
                        </td>
                        <td className="py-4 px-5 text-xs font-semibold text-slate-800">
                          {c.category}
                        </td>
                        <td className="py-4 px-5 text-xs text-slate-600">{c.description}</td>
                        <td className="py-4 px-5 text-xs font-bold">
                          {c.type === 'masuk' ? (
                            <span className="text-emerald-700">PEMASUKAN</span>
                          ) : (
                            <span className="text-amber-700">PENGELUARAN</span>
                          )}
                        </td>
                        <td className="py-4 px-5 text-xs text-slate-500">{c.recorded_by}</td>
                        <td
                          className={`py-4 px-5 text-right font-mono font-bold tabular-nums ${
                            c.type === 'masuk' ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {c.type === 'masuk' ? '+' : '-'}Rp{' '}
                          {Number(c.amount).toLocaleString('id-ID')}
                        </td>
                        <td className="py-4 px-5 text-right">
                          <button
                            type="button"
                            onClick={() => deleteCashMutation.mutate(c.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                            title="Hapus Transaksi Kas"
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
        </div>
      )}

      {/* MODAL INPUT SPP */}
      {sppModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#0F5132]" />
                <h3 className="text-base font-bold text-slate-900">Input Tagihan / Pembayaran SPP</h3>
              </div>
              <button
                type="button"
                onClick={() => setSppModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createSppMutation.mutate(sppForm);
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
                  value={sppForm.santri_id}
                  onChange={(e) => setSppForm({ ...sppForm, santri_id: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                  required
                >
                  <option value="" disabled>
                    -- Pilih Santri --
                  </option>
                  {santriList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nis} — {s.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bulan</label>
                  <select
                    value={sppForm.month}
                    onChange={(e) => setSppForm({ ...sppForm, month: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                  >
                    {[
                      'Januari',
                      'Februari',
                      'Maret',
                      'April',
                      'Mei',
                      'Juni',
                      'Juli',
                      'Agustus',
                      'September',
                      'Oktober',
                      'November',
                      'Desember',
                    ].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tahun</label>
                  <input
                    type="number"
                    value={sppForm.year}
                    onChange={(e) => setSppForm({ ...sppForm, year: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nominal (Rp)
                  </label>
                  <input
                    type="number"
                    value={sppForm.amount}
                    onChange={(e) => setSppForm({ ...sppForm, amount: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Awal
                  </label>
                  <select
                    value={sppForm.status}
                    onChange={(e) => setSppForm({ ...sppForm, status: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                  >
                    <option value="lunas">Lunas</option>
                    <option value="tunggakan">Tunggakan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bukti Pembayaran (Opsional - Cloudinary)
                </label>
                <label className="px-3.5 py-2 rounded-xl border border-slate-200 hover:border-[#0F5132] text-xs font-medium text-slate-700 inline-flex items-center gap-2 cursor-pointer">
                  <Upload className="w-4 h-4 text-[#0F5132]" />
                  <span>{sppUploading ? 'Mengunggah...' : 'Unggah Bukti Transfer'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProofUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSppModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createSppMutation.isPending}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#0F5132] hover:bg-[#0b3e26] rounded-xl cursor-pointer"
                >
                  Simpan Data SPP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TRANSAKSI UANG SAKU */}
      {pocketModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Catat Setor / Tarik Uang Saku Santri
              </h3>
              <button
                type="button"
                onClick={() => setPocketModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createPocketMutation.mutate(pocketForm);
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
                  value={pocketForm.santri_id}
                  onChange={(e) => setPocketForm({ ...pocketForm, santri_id: e.target.value })}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jenis Transaksi
                  </label>
                  <select
                    value={pocketForm.transaction_type}
                    onChange={(e) =>
                      setPocketForm({
                        ...pocketForm,
                        transaction_type: e.target.value as 'masuk' | 'keluar',
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                  >
                    <option value="masuk">Setor Tabungan (Masuk)</option>
                    <option value="keluar">Tarik Uang Saku (Keluar)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nominal (Rp)
                  </label>
                  <input
                    type="number"
                    min={1000}
                    value={pocketForm.amount}
                    onChange={(e) =>
                      setPocketForm({ ...pocketForm, amount: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan Transaksi
                </label>
                <input
                  type="text"
                  value={pocketForm.description}
                  onChange={(e) => setPocketForm({ ...pocketForm, description: e.target.value })}
                  placeholder="Contoh: Setoran orang tua / Penarikan jajan mingguan"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPocketModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createPocketMutation.isPending}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#0F5132] hover:bg-[#0b3e26] rounded-xl cursor-pointer"
                >
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KAS OPERASIONAL */}
      {cashModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Catat Transaksi Kas Operasional Asrama
              </h3>
              <button
                type="button"
                onClick={() => setCashModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createCashMutation.mutate(cashForm);
              }}
              className="mt-4 space-y-4"
            >
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jenis Arus Kas
                  </label>
                  <select
                    value={cashForm.type}
                    onChange={(e) =>
                      setCashForm({ ...cashForm, type: e.target.value as 'masuk' | 'keluar' })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                  >
                    <option value="masuk">Pemasukan Kas</option>
                    <option value="keluar">Pengeluaran Kas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    value={cashForm.transaction_date}
                    onChange={(e) =>
                      setCashForm({ ...cashForm, transaction_date: e.target.value })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori Kas
                  </label>
                  <input
                    type="text"
                    value={cashForm.category}
                    onChange={(e) => setCashForm({ ...cashForm, category: e.target.value })}
                    placeholder="Contoh: Konsumsi / Utilitas"
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nominal (Rp)
                  </label>
                  <input
                    type="number"
                    min={1000}
                    value={cashForm.amount}
                    onChange={(e) =>
                      setCashForm({ ...cashForm, amount: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Uraian Lengkap Transaksi
                </label>
                <textarea
                  rows={2}
                  value={cashForm.description}
                  onChange={(e) => setCashForm({ ...cashForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCashModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createCashMutation.isPending}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#0F5132] hover:bg-[#0b3e26] rounded-xl cursor-pointer"
                >
                  Simpan Kas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
