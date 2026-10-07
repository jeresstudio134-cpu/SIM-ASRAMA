import React from 'react';
import { X, Terminal, Database, Cloud, ShieldCheck } from 'lucide-react';

interface SetupGuideModalProps {
  open: boolean;
  onClose: () => void;
}

export const SetupGuideModal: React.FC<SetupGuideModalProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full p-6 sm:p-7 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#0F5132]">
              Panduan Teknis: Drizzle ORM, PostgreSQL, Seed Data & Cloudinary
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Dokumentasi langkah demi langkah instalasi, migrasi database, dan konfigurasi environment
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5 text-xs text-slate-700 leading-relaxed">
          {/* 1. Variabel .env */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-2">
              <Cloud className="w-4 h-4 text-[#0F5132]" />
              <span>1. Konfigurasi Variabel Environment (.env)</span>
            </div>
            <pre className="font-mono text-[11px] bg-slate-900 text-emerald-300 p-3.5 rounded-xl overflow-x-auto">
{`# Database PostgreSQL Connection
SQL_HOST="localhost"
SQL_DB_NAME="sim_asrama_db"
SQL_USER="sim_asrama_app"
SQL_PASSWORD="secret_password"
SQL_ADMIN_USER="postgres"
SQL_ADMIN_PASSWORD="admin_password"

# JWT & Session Inactivity Timeout
JWT_SECRET="sim_asrama_super_secret_jwt_key_2026"
INACTIVITY_TIMEOUT_MINUTES="30"

# Cloudinary SDK Media Storage
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_cloudinary_api_key"
CLOUDINARY_API_SECRET="your_cloudinary_api_secret"`}
            </pre>
          </div>

          {/* 2. Drizzle ORM Migration & Seed */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-2">
              <Database className="w-4 h-4 text-[#0F5132]" />
              <span>2. Perintah Migrasi Drizzle ORM & Menjalankan Seed Data Awal</span>
            </div>
            <pre className="font-mono text-[11px] bg-slate-900 text-slate-100 p-3.5 rounded-xl overflow-x-auto">
{`# 1. Instal dependensi proyek
npm install

# 2. Generate & Push Skema Drizzle ORM ke PostgreSQL
npx drizzle-kit generate
npx drizzle-kit push

# 3. Jalankan Seeder Data Awal (Akun Admin, Pembina A/B, Bendahara & Santri)
npx tsx backend/src/db/seed.ts

# 4. Jalankan Fullstack Server (Express API + React Vite di Port 3000)
npm run dev`}
            </pre>
          </div>

          {/* 3. Ringkasan RBAC */}
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
            <div className="flex items-center gap-2 font-bold text-[#0F5132] text-sm mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span>3. Matriks Hak Akses Role-Based Access Control (RBAC)</span>
            </div>
            <ul className="space-y-1.5 list-disc list-inside text-slate-700">
              <li>
                <strong>Admin (admin / admin123):</strong> Akses penuh seluruh modul, gedung, log aktivitas, dan Manajemen Pengguna (dilengkapi proteksi tidak dapat menghapus/menonaktifkan diri sendiri atau Admin aktif terakhir).
              </li>
              <li>
                <strong>Pembina Gedung A/B (pembina / pembina123):</strong> Hanya mengakses Santri, Pelanggaran, Konseling, Prestasi, Kamar & Perizinan yang terfilter otomatis pada gedung penugasannya.
              </li>
              <li>
                <strong>Bendahara (bendahara / bendahara123):</strong> Mengelola SPP Bulanan, Tabungan Uang Saku, Kas Operasional Asrama, serta melihat daftar Santri (Read-Only).
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#0F5132] hover:bg-[#0b3e26] text-white text-xs font-semibold rounded-xl cursor-pointer"
          >
            Mengerti & Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
};
