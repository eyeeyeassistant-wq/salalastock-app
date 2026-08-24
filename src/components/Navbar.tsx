import React, { useRef, useState, useEffect } from 'react';
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
  Cloud,
  ChevronLeft,
  ChevronRight,
  Menu,
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Check scroll boundary
  const updateScrollState = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    updateScrollState();
    window.addEventListener('resize', updateScrollState);
    return () => window.removeEventListener('resize', updateScrollState);
  }, [userRole, activeTab]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setTimeout(updateScrollState, 300);
    }
  };

  // Mouse wheel horizontal scroll support
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (scrollContainerRef.current) {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        return; // Natural horizontal trackpad
      }
      scrollContainerRef.current.scrollLeft += e.deltaY;
      updateScrollState();
    }
  };

  // Mouse drag-to-scroll support for desktop
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    updateScrollState();
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
    updateScrollState();
  };

  const handleAdminRoleClick = () => {
    if (isAdminAuthenticated) {
      setUserRole('admin');
    } else {
      onRequestAdminAuth();
    }
  };

  const tabItems = [
    {
      id: 'staff-portal' as ActiveTab,
      name: 'พอร์ทัลพนักงาน',
      sub: 'บันทึกประจำวัน',
      icon: UserCheck,
      color: 'text-emerald-400',
      badge: null,
      adminOnly: false,
    },
    {
      id: 'dashboard' as ActiveTab,
      name: 'แดชบอร์ดสรุปรายเดือน',
      sub: 'Monthly Dashboard',
      icon: BarChart3,
      color: 'text-blue-400',
      badge: null,
      adminOnly: false,
    },
    {
      id: 'production' as ActiveTab,
      name: '1. บันทึกผลิต & ส่งสาขา',
      sub: 'Daily Production',
      icon: CalendarCheck,
      color: 'text-sky-400',
      badge: null,
      adminOnly: false,
    },
    {
      id: 'transactions' as ActiveTab,
      name: '2. เบิก/รับสต็อก',
      sub: 'Stock Transactions',
      icon: ArrowLeftRight,
      color: 'text-cyan-400',
      badge: null,
      adminOnly: false,
    },
    {
      id: 'summary' as ActiveTab,
      name: '3. สรุปสต็อก & ผลต่าง',
      sub: 'Variance Analysis',
      icon: Layers,
      color: 'text-indigo-400',
      badge: lowStockCount > 0 ? `${lowStockCount} เตือน` : null,
      badgeColor: 'bg-rose-500 text-white',
      adminOnly: false,
    },
    ...(userRole === 'admin'
      ? [
          {
            id: 'materials' as ActiveTab,
            name: '4. ทะเบียนวัตถุดิบ',
            sub: 'Master Materials',
            icon: Package,
            color: 'text-amber-400',
            badge: null,
            adminOnly: true,
          },
          {
            id: 'recipes' as ActiveTab,
            name: '5. สูตรมาตรฐานต่อชิ้น',
            sub: 'BOM Recipe',
            icon: Sparkles,
            color: 'text-amber-400',
            badge: null,
            adminOnly: true,
          },
          {
            id: 'formulas' as ActiveTab,
            name: 'สูตร Google Sheets',
            sub: 'Formula Guide',
            icon: BookOpen,
            color: 'text-purple-400',
            badge: null,
            adminOnly: true,
          },
        ]
      : []),
  ];

  return (
    <header className="bg-[#0f172a] text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Top Header Row */}
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo & App Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-sm sm:text-base md:text-lg font-bold text-slate-100 tracking-tight truncate">
                  ระบบจัดการสต๊อก & Variance
                </h1>
                <span className="text-[10px] sm:text-[11px] bg-blue-500/20 text-blue-300 font-semibold px-2 py-0.5 rounded-full border border-blue-500/30 uppercase tracking-wider hidden md:inline shrink-0">
                  Stock & Variance
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate hidden xs:block">
                ตัดสต็อกอัตโนมัติ • คำนวณ Waste • ซิงค์ Google Sheets
              </p>
            </div>
          </div>

          {/* Action Buttons & Role Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Role Switcher Toggle */}
            <div className="flex items-center bg-slate-800/95 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => {
                  setUserRole('staff');
                  if (activeTab === 'materials' || activeTab === 'recipes' || activeTab === 'formulas') {
                    setActiveTab('staff-portal');
                  }
                }}
                id="btn-role-staff"
                className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[36px] ${
                  userRole === 'staff'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="โหมดพนักงาน: สำหรับกรอกยอดผลิต จัดส่ง ของเหลือ และเบิกรับวัตถุดิบ"
              >
                <UserCheck className="w-3.5 h-3.5 text-blue-300" />
                <span>พนักงาน</span>
              </button>

              <button
                onClick={handleAdminRoleClick}
                id="btn-role-admin"
                className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[36px] ${
                  userRole === 'admin'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={isAdminAuthenticated ? "โหมดผู้ดูแลระบบ: จัดการสูตร BOM, ทะเบียนวัตถุดิบ/สินค้า และสรุป Variance" : "ต้องยืนยันตัวตน Admin เพื่อเข้าใช้งาน"}
              >
                <Shield className="w-3.5 h-3.5 text-amber-200" />
                <span>Admin</span>
                {!isAdminAuthenticated && (
                  <Lock className="w-3 h-3 text-amber-400" />
                )}
              </button>
            </div>

            {/* If Admin is authenticated and in admin mode, offer quick lock */}
            {userRole === 'admin' && isAdminAuthenticated && (
              <button
                onClick={onLockAdmin}
                className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors min-h-[36px]"
                title="ล็อคสิทธิ์ Admin และกลับสู่โหมดพนักงาน"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>ล็อค</span>
              </button>
            )}

            {/* Quick Action in Header for Admin */}
            {userRole === 'admin' && (
              <button
                onClick={onOpenClearDataModal}
                id="btn-clear-sample-data"
                className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/70 transition-colors min-h-[36px]"
                title="เคลียร์ข้อมูลตัวอย่างเพื่อกรอกข้อมูลจริง"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>เคลียร์ข้อมูล</span>
              </button>
            )}

            {/* Cloud Persistence Badge */}
            <div
              className="hidden lg:inline-flex items-center gap-1.5 bg-sky-950/70 border border-sky-600/40 rounded-lg px-2.5 py-1.5 text-xs text-sky-200"
              title="ข้อมูลและประวัติทั้งหมดได้รับการบันทึกบน Cloud Firestore แบบถาวร เปิดจากเครื่องไหนหรือผ่านไปกี่วันข้อมูลก็ไม่หาย"
            >
              <Cloud className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-medium text-[11px]">Cloud Database</span>
            </div>

            {/* Google Sheets Connection Badge / Button */}
            {webhookUrl || spreadsheetId ? (
              <div className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-500/50 rounded-lg px-2 sm:px-2.5 py-1.5 text-xs text-emerald-200 min-h-[36px]">
                <span className={`w-2 h-2 rounded-full shrink-0 ${autoSyncEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="hidden sm:inline font-semibold text-xs">
                  {autoSyncEnabled ? 'ซิงค์ Sheets' : 'ต่อ Sheets แล้ว'}
                </span>
                <button
                  onClick={onSyncNow}
                  disabled={isSyncing}
                  title="กดเพื่อส่งข้อมูลบนเว็บขึ้นอัปเดตใน Google Sheet ทันที"
                  className="hover:text-emerald-100 p-1 transition-transform touch-manipulation"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
                </button>
                {spreadsheetUrl && (
                  <a
                    href={spreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="เปิดดูใน Google Sheets"
                    className="hover:text-white p-1 text-emerald-400 hover:text-emerald-200"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                {userRole === 'admin' && (
                  <button
                    onClick={onOpenSyncModal}
                    title="ตั้งค่าการเชื่อมต่อ Google Sheets"
                    className="text-[11px] text-emerald-300 hover:underline ml-0.5"
                  >
                    ตั้งค่า
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenSyncModal}
                id="btn-connect-sheets"
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30 transition-all min-h-[36px]"
                title="กดเพื่อเชื่อมต่อและตั้งค่า Google Sheet สำหรับเก็บข้อมูลอัตโนมัติ"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="font-semibold text-xs">เชื่อมต่อ Sheets</span>
              </button>
            )}

            {/* User Account / Google Sign In */}
            {user ? (
              <div className="flex items-center gap-1.5 pl-1 sm:pl-2 border-l border-slate-700">
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
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-800 hover:bg-slate-100 shadow-xs transition-colors min-h-[36px]"
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

        {/* Tab Navigation Bar with Desktop Scroll Chevrons & Wheel Drag */}
        <div className="relative border-t border-slate-800/90 py-1.5">
          {/* Left Scroll Button (Desktop & Tablet) */}
          {canScrollLeft && (
            <button
              onClick={() => handleScroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-slate-900/90 text-slate-200 border border-slate-700 shadow-lg flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all backdrop-blur-xs"
              title="เลื่อนซ้าย"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Right Scroll Button (Desktop & Tablet) */}
          {canScrollRight && (
            <button
              onClick={() => handleScroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-slate-900/90 text-slate-200 border border-slate-700 shadow-lg flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all backdrop-blur-xs"
              title="เลื่อนขวา"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {/* Scrollable Tabs Track */}
          <div
            ref={scrollContainerRef}
            onScroll={updateScrollState}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            className={`flex items-center space-x-1.5 sm:space-x-2 overflow-x-auto dark-scrollbar py-1 px-1 text-xs sm:text-sm select-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {tabItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  id={`tab-${item.id}`}
                  className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all touch-manipulation min-h-[42px] shrink-0 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md font-semibold ring-1 ring-blue-400/40'
                      : 'text-slate-300 hover:bg-slate-800/90 hover:text-white bg-slate-900/60 border border-slate-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.color}`} />
                  <span className="text-xs sm:text-sm font-medium">{item.name}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        item.badgeColor || 'bg-blue-500 text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Lock button when staff mode */}
            {userRole === 'staff' && (
              <button
                onClick={onRequestAdminAuth}
                className="flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-100 font-medium px-3.5 py-2.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 whitespace-nowrap transition-colors min-h-[42px] shrink-0"
                title="กดเพื่อปลดล็อคเข้าสู่ระบบผู้ดูแลระบบ (Admin)"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>สูตร BOM & วัตถุดิบ (ปลดล็อค Admin)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

