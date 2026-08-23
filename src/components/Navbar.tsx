import React from 'react';
import {
  Package,
  FileSpreadsheet,
  Layers,
  CalendarCheck,
  ArrowLeftRight,
  BookOpen,
  Plus,
  RefreshCw,
  ExternalLink,
  LogOut,
  AlertTriangle,
  Sparkles,
  UserCheck,
  Shield,
  Lock,
  Trash2,
  BarChart3,
} from 'lucide-react';
import { ActiveTab, UserRole } from '../types/stock';
import { User } from 'firebase/auth';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  isAdminAuthenticated: boolean;
  onRequestAdminAuth: () => void;
  onLockAdmin: () => void;
  user: User | null;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  webhookUrl: string | null;
  autoSyncEnabled: boolean;
  lastSyncTime: string | null;
  isSyncing: boolean;
  onOpenSyncModal: () => void;
  onOpenFormulaModal: () => void;
  onOpenNewTxModal: () => void;
  onOpenNewProdModal: () => void;
  onOpenOpeningStockModal: () => void;
  onOpenClearDataModal: () => void;
  onSyncNow: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  lowStockCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  setUserRole,
  isAdminAuthenticated,
  onRequestAdminAuth,
  onLockAdmin,
  user,
  spreadsheetId,
  spreadsheetUrl,
  webhookUrl,
  autoSyncEnabled,
  lastSyncTime,
  isSyncing,
  onOpenSyncModal,
  onOpenFormulaModal,
  onOpenNewTxModal,
  onOpenNewProdModal,
  onOpenOpeningStockModal,
  onOpenClearDataModal,
  onSyncNow,
  onSignIn,
  onSignOut,
  lowStockCount,
}) => {
  const handleAdminRoleClick = () => {
    if (isAdminAuthenticated) {
      setUserRole('admin');
    } else {
      onRequestAdminAuth();
    }
  };
  return (
    <header className="bg-[#0f172a] text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Header Row */}
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
                  ระบบจัดการสต๊อก & คำนวณผลต่างวัตถุดิบ
                </h1>
                <span className="text-[11px] bg-blue-500/20 text-blue-300 font-semibold px-2.5 py-0.5 rounded-full border border-blue-500/30 uppercase tracking-wider hidden sm:inline">
                  Stock & Variance
                </span>
              </div>
              <p className="text-xs text-slate-400">
                แยกสิทธิ์ หน้าบ้าน (พนักงานกรอกยอด) vs หลังบ้าน (เจ้าของจัดการสูตร & วัตถุดิบ)
              </p>
            </div>
          </div>

          {/* Action Buttons & Auth */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Role Switcher Toggle */}
            <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => {
                  setUserRole('staff');
                  if (activeTab === 'materials' || activeTab === 'recipes' || activeTab === 'formulas') {
                    setActiveTab('staff-portal');
                  }
                }}
                id="btn-role-staff"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  userRole === 'staff'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="โหมดพนักงาน: สำหรับกรอกยอดผลิต จัดส่ง ของเหลือ และเบิกรับวัตถุดิบ"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>หน้าบ้าน (พนักงาน)</span>
              </button>

              <button
                onClick={handleAdminRoleClick}
                id="btn-role-admin"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  userRole === 'admin'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={isAdminAuthenticated ? "โหมดผู้ดูแลระบบ: จัดการสูตร BOM, ทะเบียนวัตถุดิบ/สินค้า และสรุป Variance" : "ต้องยืนยันตัวตน Admin เพื่อเข้าใช้งาน"}
              >
                <Shield className="w-3.5 h-3.5 text-amber-200" />
                <span>หลังบ้าน (Admin)</span>
                {!isAdminAuthenticated && (
                  <Lock className="w-3 h-3 text-amber-400" />
                )}
              </button>
            </div>

            {/* If Admin is authenticated and in admin mode, offer quick lock */}
            {userRole === 'admin' && isAdminAuthenticated && (
              <button
                onClick={onLockAdmin}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                title="ล็อคสิทธิ์ Admin และกลับสู่โหมดพนักงาน"
              >
                <Lock className="w-3 h-3 text-amber-400" />
                <span>ล็อค Admin</span>
              </button>
            )}

            {/* Quick Action in Header */}
            {userRole === 'staff' ? (
              <button
                onClick={onOpenOpeningStockModal}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-xs transition-colors"
                title="กรอกยอดยกมาต้นเดือน"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>กรอกยอดยกมา</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onOpenFormulaModal}
                  id="btn-open-formula-guide"
                  className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                  title="ดูสูตร Google Sheets และวิธีตั้งค่า"
                >
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  <span>คู่มือสูตร Sheets</span>
                </button>

                <button
                  onClick={onOpenClearDataModal}
                  id="btn-clear-sample-data"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/70 transition-colors"
                  title="เคลียร์ข้อมูลตัวอย่างเพื่อกรอกข้อมูลจริง"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>เคลียร์ข้อมูลตัวอย่าง</span>
                </button>
              </div>
            )}

            {/* Google Sheets Connection Badge / Button */}
            {webhookUrl || spreadsheetId ? (
              <div className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/50 rounded-lg px-2.5 py-1.5 text-xs text-emerald-200">
                <span className={`w-2 h-2 rounded-full ${autoSyncEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline font-semibold">
                  {autoSyncEnabled ? 'ซิงค์ Sheets อัตโนมัติ' : 'เชื่อมต่อ Sheets แล้ว'}
                  {lastSyncTime && <span className="text-[10px] text-emerald-300/80 font-normal ml-1">({lastSyncTime})</span>}
                </span>
                <button
                  onClick={onSyncNow}
                  disabled={isSyncing}
                  title="กดเพื่อส่งข้อมูลบนเว็บขึ้นอัปเดตใน Google Sheet ทันที"
                  className="hover:text-emerald-100 p-0.5 transition-transform"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
                </button>
                {spreadsheetUrl && (
                  <a
                    href={spreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="เปิดดูใน Google Sheets"
                    className="hover:text-white p-0.5 text-emerald-400 hover:text-emerald-200"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {userRole === 'admin' && (
                  <button
                    onClick={onOpenSyncModal}
                    title="ตั้งค่าการเชื่อมต่อ Google Sheets"
                    className="text-[10px] text-emerald-300 hover:underline ml-1"
                  >
                    ตั้งค่า
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenSyncModal}
                id="btn-connect-sheets"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30 transition-all hover:scale-105"
                title="กดเพื่อเชื่อมต่อและตั้งค่า Google Sheet สำหรับเก็บข้อมูลอัตโนมัติ"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="font-semibold">เชื่อมต่อ Sheets (Auto-Sync)</span>
              </button>
            )}

            {/* User Account / Google Sign In */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-7 h-7 rounded-full border border-slate-600"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                    {user.email?.[0].toUpperCase() || 'U'}
                  </div>
                )}
                <button
                  onClick={onSignOut}
                  title="ออกจากระบบ"
                  className="text-slate-400 hover:text-slate-200 p-1 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onSignIn}
                id="btn-google-sign-in"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-800 hover:bg-slate-100 shadow-sm transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.02 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span className="hidden sm:inline">เข้าสู่ระบบ</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation Bar - Role Adapted */}
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-2 border-t border-slate-800 scrollbar-none text-xs sm:text-sm">
          {/* Monthly Dashboard Tab */}
          <button
            onClick={() => setActiveTab('dashboard')}
            id="tab-monthly-dashboard"
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-blue-400" />
            <span>📊 แดชบอร์ดสรุปรายเดือน (Monthly Dashboard)</span>
          </button>

          {/* Staff Tab / Portal */}
          <button
            onClick={() => setActiveTab('staff-portal')}
            id="tab-staff-portal"
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
              activeTab === 'staff-portal'
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>📱 พอร์ทัลพนักงาน (Staff Operations)</span>
          </button>

          {/* Daily Production */}
          <button
            onClick={() => setActiveTab('production')}
            id="tab-daily-production"
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
              activeTab === 'production'
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>1. บันทึกผลิต & ส่งสาขา & ของเหลือ (Daily Production)</span>
          </button>

          {/* Transactions */}
          <button
            onClick={() => setActiveTab('transactions')}
            id="tab-stock-transactions"
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
              activeTab === 'transactions'
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>2. บันทึกเบิก/รับวัตถุดิบ (Stock Transactions)</span>
          </button>

          {/* Summary Tab (Variance Analysis) */}
          <button
            onClick={() => setActiveTab('summary')}
            id="tab-monthly-summary"
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
              activeTab === 'summary'
                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>3. สรุปสต๊อก & ผลต่าง (Monthly Summary)</span>
            {lowStockCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full ml-1">
                {lowStockCount}
              </span>
            )}
          </button>

          {/* Backend / Admin Only Tabs */}
          {userRole === 'admin' ? (
            <>
              <button
                onClick={() => setActiveTab('materials')}
                id="tab-master-materials"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                  activeTab === 'materials'
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>4. ทะเบียนวัตถุดิบ (Master Materials)</span>
              </button>

              <button
                onClick={() => setActiveTab('recipes')}
                id="tab-bom-recipes"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                  activeTab === 'recipes'
                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>5. สูตรมาตรฐานต่อชิ้น (BOM Recipe)</span>
              </button>

              <button
                onClick={() => setActiveTab('formulas')}
                id="tab-formula-guide"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                  activeTab === 'formulas'
                    ? 'bg-slate-700 text-white shadow-xs font-semibold'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <BookOpen className="w-4 h-4 text-blue-400" />
                <span>สูตร Google Sheets</span>
              </button>
            </>
          ) : (
            <button
              onClick={onRequestAdminAuth}
              className="flex items-center gap-1.5 text-[11px] text-amber-300 hover:text-amber-100 font-medium px-3 py-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/60 whitespace-nowrap transition-colors"
              title="กดเพื่อปลดล็อคเข้าสู่ระบบผู้ดูแลระบบ (Admin)"
            >
              <Lock className="w-3 h-3 text-amber-400" />
              <span>สูตร BOM & ทะเบียนสินค้า (คลิกเพื่อปลดล็อค Admin)</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
