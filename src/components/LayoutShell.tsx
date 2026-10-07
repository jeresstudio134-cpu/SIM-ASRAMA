import React, { useState, useRef, useEffect } from 'react';
import {
  Home,
  Users,
  AlertTriangle,
  MessageSquare,
  Award,
  DollarSign,
  Layers,
  FileText,
  Shield,
  ChevronDown,
  KeyRound,
  LogOut,
  Menu,
  X,
  BookOpen,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient, UserRole } from '../services/api';

export type NavTabId =
  | 'dashboard'
  | 'santri'
  | 'violations'
  | 'counseling'
  | 'achievements'
  | 'finance'
  | 'rooms'
  | 'reports'
  | 'users';

interface NavItem {
  id: NavTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles: UserRole[];
  adminBadge?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    allowedRoles: ['admin', 'pembina', 'bendahara'],
  },
  {
    id: 'santri',
    label: 'Database Santri',
    icon: Users,
    allowedRoles: ['admin', 'pembina', 'bendahara'],
  },
  {
    id: 'violations',
    label: 'Pelanggaran & Poin',
    icon: AlertTriangle,
    allowedRoles: ['admin', 'pembina'],
  },
  {
    id: 'counseling',
    label: 'Bimbingan Konseling',
    icon: MessageSquare,
    allowedRoles: ['admin', 'pembina'],
  },
  {
    id: 'achievements',
    label: 'Prestasi Santri',
    icon: Award,
    allowedRoles: ['admin', 'pembina'],
  },
  {
    id: 'finance',
    label: 'Keuangan & SPP',
    icon: DollarSign,
    allowedRoles: ['admin', 'bendahara'],
  },
  {
    id: 'rooms',
    label: 'Kamar & Perizinan',
    icon: Layers,
    allowedRoles: ['admin', 'pembina'],
  },
  {
    id: 'reports',
    label: 'Cetak Laporan',
    icon: FileText,
    allowedRoles: ['admin', 'pembina', 'bendahara'],
  },
  {
    id: 'users',
    label: 'Manajemen Pengguna',
    icon: Shield,
    allowedRoles: ['admin'],
    adminBadge: true,
  },
];

function getInitials(fullName: string): string {
  const cleaned = fullName
    .replace(/^(Ustadz|Ustadzah|H\.|Hj\.|Drs\.|Dr\.|Ir\.)\s+/gi, '')
    .trim();
  const parts = cleaned.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase() || 'UA';
}

function getRoleDisplayLabel(role: UserRole, building: string): string {
  if (role === 'admin') return 'Administrator';
  if (role === 'pembina') return `Pembina (${building})`;
  return 'Bendahara Asrama';
}

interface LayoutShellProps {
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  onOpenDocsModal: () => void;
  children: React.ReactNode;
}

export const LayoutShell: React.FC<LayoutShellProps> = ({
  activeTab,
  onSelectTab,
  onOpenDocsModal,
  children,
}) => {
  const { user, logout, remainingSeconds } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  // Change password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const visibleNavItems = NAV_ITEMS.filter((item) => item.allowedRoles.includes(user.role));
  const initials = user.username === 'admin' ? 'UA' : getInitials(user.full_name);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);

    if (!currentPassword || !newPassword) {
      setPwError('Password lama dan password baru wajib diisi.');
      return;
    }
    if (newPassword.length < 6) {
      setPwError('Password baru minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Konfirmasi password baru tidak cocok.');
      return;
    }

    setPwLoading(true);
    try {
      await apiClient.put('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setPwSuccess('Kata sandi berhasil diperbarui.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwError(err?.response?.data?.message || 'Gagal mengganti password.');
    } finally {
      setPwLoading(false);
    }
  };

  const minutesLeft = Math.floor(remainingSeconds / 60);

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex flex-col">
      {/* Top Islamic Green Header matching screenshot */}
      <header className="bg-[#0F5132] text-white shadow-sm sticky top-0 z-30 no-print">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
          {/* Brand Left */}
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="lg:hidden p-2 rounded-xl bg-emerald-800/60 hover:bg-emerald-800 text-white"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="w-11 h-11 rounded-xl bg-[#196943] border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Home className="w-5 h-5 text-white" />
            </div>

            <div>
              <div className="text-lg sm:text-xl font-bold tracking-tight leading-tight">
                SIM-ASRAMA
              </div>
              <div className="text-xs text-emerald-100/85 hidden sm:block">
                Sistem Informasi Manajemen Santri & Asrama
              </div>
            </div>
          </div>

          {/* Right User Profile Pill & Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-full bg-[#125d3a] hover:bg-[#166942] border border-emerald-400/30 transition-colors cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full bg-[#1f8a58] border border-emerald-300/40 flex items-center justify-center text-xs font-bold tracking-wide text-white shrink-0">
                {initials}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs sm:text-sm font-semibold text-white leading-tight">
                  {user.full_name}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-200 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  <span>{getRoleDisplayLabel(user.role, user.building_assignment)}</span>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-emerald-200 ml-1" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white text-slate-800 rounded-2xl shadow-lg border border-slate-200 py-2 z-50">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <div className="text-xs font-semibold text-slate-900">{user.full_name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    @{user.username} · {getRoleDisplayLabel(user.role, user.building_assignment)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 tabular-nums">
                    Sesi aktif: {minutesLeft} mnt tersisa (Auto-timeout 30m)
                  </div>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      setPasswordModalOpen(true);
                    }}
                    className="w-full px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4 text-slate-500" />
                    <span>Ganti Password</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenDocsModal();
                    }}
                    className="w-full px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-[#0F5132]" />
                    <span>Panduan Setup & Drizzle ORM</span>
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                    }}
                    className="w-full px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2.5 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Keluar (Logout)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Container */}
      <div className="max-w-[1440px] w-full mx-auto flex-1 flex items-start gap-6 px-4 sm:px-6 py-6">
        {/* Left Navigation Card (Desktop & Mobile Drawer) */}
        <aside
          className={`${
            mobileMenuOpen ? 'fixed inset-0 z-40 bg-slate-900/50 flex lg:static lg:bg-transparent' : 'hidden lg:block'
          } w-64 shrink-0 no-print`}
        >
          <div className="w-64 bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs h-fit">
            <div className="flex items-center justify-between px-3 pt-1 pb-3">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                MENU UTAMA ({user.role.toUpperCase()})
              </span>
              {mobileMenuOpen && (
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="lg:hidden text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <nav className="space-y-1">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#0F5132] text-white font-semibold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-white' : 'text-slate-500'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.adminBadge && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                          isActive
                            ? 'bg-emerald-900/60 text-emerald-100'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        Admin
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {user.role === 'pembina' && user.building_assignment !== 'Semua' && (
              <div className="mt-5 pt-4 border-t border-slate-100 px-3">
                <div className="text-[11px] font-semibold text-slate-500">Wilayah Penugasan</div>
                <div className="text-xs font-bold text-[#0F5132] mt-0.5">
                  Khusus {user.building_assignment}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Data santri & pembinaan otomatis difilter untuk {user.building_assignment}.
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* Main Viewport */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {/* Modal Ganti Password */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Ganti Password Akun</h3>
              <button
                type="button"
                onClick={() => {
                  setPasswordModalOpen(false);
                  setPwError(null);
                  setPwSuccess(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePasswordChange} className="mt-4 space-y-4">
              {pwError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pwError}</span>
                </div>
              )}
              {pwSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{pwSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password Saat Ini
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F5132]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password Baru (Min. 6 Karakter)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F5132]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Konfirmasi Password Baru
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F5132]"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0F5132] hover:bg-[#0b3e26] rounded-xl cursor-pointer"
                >
                  {pwLoading ? 'Menyimpan...' : 'Simpan Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
