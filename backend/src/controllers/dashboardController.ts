import { Response } from 'express';
import { db } from '../config/db.ts';
import { AuthenticatedRequest } from '../middlewares/auth.ts';
import { filterSantriByBuildingRole } from '../middlewares/rbac.ts';
import { uploadBufferToCloudinary, isCloudinaryConfigured } from '../config/cloudinary.ts';

export function getDashboardSummary(req: AuthenticatedRequest, res: Response) {
  const state = db.getState();
  const user = req.user!;

  const visibleSantri = filterSantriByBuildingRole(state.santri, user);
  const visibleIds = new Set(visibleSantri.map((s) => s.id));

  const activeSantriCount = visibleSantri.filter((s) => s.status === 'aktif').length;
  const alumniSantriCount = visibleSantri.filter((s) => s.status === 'alumni').length;

  const visibleViolations = state.violations.filter((v) => visibleIds.has(v.santri_id));
  const visibleAchievements = state.achievements.filter((a) => visibleIds.has(a.santri_id));
  const visiblePermissions = state.permissions.filter((p) => visibleIds.has(p.santri_id));

  // Saldo Kas Operasional Asrama
  const totalKasMasuk = state.operational_cash
    .filter((c) => c.type === 'masuk')
    .reduce((acc, c) => acc + Number(c.amount), 0);
  const totalKasKeluar = state.operational_cash
    .filter((c) => c.type === 'keluar')
    .reduce((acc, c) => acc + Number(c.amount), 0);
  const saldoKas = totalKasMasuk - totalKasKeluar;

  // SPP Stats
  const sppLunasCount = state.financial_spp.filter((s) => s.status === 'lunas').length;
  const sppTunggakanCount = state.financial_spp.filter((s) => s.status === 'tunggakan').length;

  // Risk distribution
  let amanCount = 0;
  let waspadaCount = 0;
  let bahayaCount = 0;

  for (const s of visibleSantri.filter((st) => st.status === 'aktif')) {
    const stats = db.getSantriDisciplineStats(s.id);
    if (stats.riskStatus === 'Bahaya/SP') bahayaCount++;
    else if (stats.riskStatus === 'Waspada') waspadaCount++;
    else amanCount++;
  }

  // Monthly Trend: Pelanggaran vs Prestasi (Mei - Oktober 2026)
  const months = [
    { key: '2026-05', label: 'Mei' },
    { key: '2026-06', label: 'Jun' },
    { key: '2026-07', label: 'Jul' },
    { key: '2026-08', label: 'Agu' },
    { key: '2026-09', label: 'Sep' },
    { key: '2026-10', label: 'Okt' },
  ];

  // Baseline historical counts + live database records
  const baseTrend: Record<string, { pelanggaran: number; prestasi: number; pemasukan: number; pengeluaran: number }> = {
    '2026-05': { pelanggaran: 4, prestasi: 3, pemasukan: 16500000, pengeluaran: 9200000 },
    '2026-06': { pelanggaran: 3, prestasi: 5, pemasukan: 17200000, pengeluaran: 8800000 },
    '2026-07': { pelanggaran: 5, prestasi: 4, pemasukan: 19000000, pengeluaran: 11400000 },
    '2026-08': { pelanggaran: 2, prestasi: 6, pemasukan: 18100000, pengeluaran: 9700000 },
    '2026-09': { pelanggaran: 0, prestasi: 0, pemasukan: 17850000, pengeluaran: 9100000 },
    '2026-10': { pelanggaran: 0, prestasi: 0, pemasukan: 0, pengeluaran: 0 },
  };

  for (const v of visibleViolations) {
    const ym = v.violation_date.slice(0, 7);
    if (baseTrend[ym]) baseTrend[ym].pelanggaran += 1;
  }

  for (const a of visibleAchievements) {
    const ym = a.achievement_date.slice(0, 7);
    if (baseTrend[ym]) baseTrend[ym].prestasi += 1;
  }

  for (const c of state.operational_cash) {
    const ym = c.transaction_date.slice(0, 7);
    if (baseTrend[ym]) {
      if (c.type === 'masuk') baseTrend[ym].pemasukan += Number(c.amount);
      else baseTrend[ym].pengeluaran += Number(c.amount);
    }
  }

  const disciplineTrend = months.map((m) => ({
    bulan: m.label,
    pelanggaran: baseTrend[m.key].pelanggaran,
    prestasi: baseTrend[m.key].prestasi,
  }));

  const financeTrend = months.map((m) => ({
    bulan: m.label,
    pemasukan: Math.round(baseTrend[m.key].pemasukan / 1000000 * 10) / 10, // Juta Rupiah
    pengeluaran: Math.round(baseTrend[m.key].pengeluaran / 1000000 * 10) / 10,
    pemasukanRaw: baseTrend[m.key].pemasukan,
    pengeluaranRaw: baseTrend[m.key].pengeluaran,
  }));

  return res.json({
    stats: {
      totalSantriAktif: activeSantriCount,
      totalAlumni: alumniSantriCount,
      totalPelanggaran: visibleViolations.length,
      totalPrestasi: visibleAchievements.length,
      saldoKas,
      totalKasMasuk,
      totalKasKeluar,
      sppLunasCount,
      sppTunggakanCount,
      izinAktifCount: visiblePermissions.filter((p) => p.status === 'disetujui').length,
      izinMenungguCount: visiblePermissions.filter((p) => p.status === 'diproses').length,
    },
    riskDistribution: {
      aman: amanCount,
      waspada: waspadaCount,
      bahaya: bahayaCount,
    },
    disciplineTrend,
    financeTrend,
    recentLogs: state.activity_logs.slice(0, 8),
    cloudinaryReady: isCloudinaryConfigured,
  });
}

export async function handleFileUpload(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Tidak ada berkas gambar yang diunggah.' });
    }

    const folder = String(req.body?.folder || 'sim-asrama/santri');
    const result = await uploadBufferToCloudinary(req.file.buffer, req.file.mimetype, folder);

    db.logActivity(
      req.user!.id,
      req.user!.full_name,
      'Unggah Media',
      `Mengunggah berkas foto (${req.file.originalname}) melalui layanan ${result.provider === 'cloudinary' ? 'Cloudinary' : 'Media Penyimpanan Lokal'}`
    );

    return res.json({
      message: 'Berkas berhasil diunggah.',
      url: result.url,
      provider: result.provider,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return res.status(500).json({
      message: error?.message || 'Gagal mengunggah berkas gambar.',
    });
  }
}
