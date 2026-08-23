import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Shield, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  ActiveTab,
  UserRole,
  MasterMaterial,
  BOMRecipe,
  DailyProduction,
  StockTransaction,
  TransactionType,
} from './types/stock';
import {
  INITIAL_MATERIALS,
  INITIAL_RECIPES,
  INITIAL_DAILY_PRODUCTION,
  INITIAL_TRANSACTIONS,
} from './data/initialData';
import {
  generateMonthlySummary,
  calculateProductionRowTotals,
} from './utils/calculations';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
} from './services/auth';
import {
  createStockSpreadsheet,
  initializeSheetDataAndFormulas,
  fetchAllSheetData,
  appendTransactionToSheet,
  appendProductionToSheet,
} from './services/googleSheets';

// Components
import { Navbar } from './components/Navbar';
import { OverviewCards } from './components/OverviewCards';
import { MonthlyDashboardTab } from './components/MonthlyDashboardTab';
import { StaffPortalTab } from './components/StaffPortalTab';
import { MonthlySummaryTab } from './components/MonthlySummaryTab';
import { DailyProductionTab } from './components/DailyProductionTab';
import { StockTransactionsTab } from './components/StockTransactionsTab';
import { MasterMaterialsTab } from './components/MasterMaterialsTab';
import { BOMRecipeTab } from './components/BOMRecipeTab';
import { FormulaGuideModal } from './components/FormulaGuideModal';
import { GoogleSheetsSyncModal } from './components/GoogleSheetsSyncModal';
import { NewTransactionModal } from './components/NewTransactionModal';
import { NewProductionModal } from './components/NewProductionModal';
import { MaterialDetailModal } from './components/MaterialDetailModal';
import { OpeningStockModal } from './components/OpeningStockModal';
import { PhysicalStockCountModal } from './components/PhysicalStockCountModal';
import { ClearDataModal } from './components/ClearDataModal';
import { PopupBlockedModal } from './components/PopupBlockedModal';
import { AdminAuthModal } from './components/AdminAuthModal';
import { MonthlyStockCountRecord } from './types/stock';

export default function App() {
  const [userRole, setUserRole] = useState<UserRole>('staff');
  const [activeTab, setActiveTab] = useState<ActiveTab>('staff-portal');
  const [activeFilter, setActiveFilter] = useState<'all' | 'lowStock' | 'overused'>('all');

  // Admin Auth Gate State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('stock_admin_auth') === 'true';
  });
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);
  const [adminPin, setAdminPin] = useState<string>(() => {
    return localStorage.getItem('stock_admin_pin') || '8888';
  });

  // Core Data State (Saved to localStorage or synced with Google Sheets)
  const [materials, setMaterials] = useState<MasterMaterial[]>(() => {
    const saved = localStorage.getItem('stock_materials');
    return saved ? JSON.parse(saved) : INITIAL_MATERIALS;
  });

  const [recipes, setRecipes] = useState<BOMRecipe[]>(() => {
    const saved = localStorage.getItem('stock_recipes');
    return saved ? JSON.parse(saved) : INITIAL_RECIPES;
  });

  const [productions, setProductions] = useState<DailyProduction[]>(() => {
    const saved = localStorage.getItem('stock_productions');
    return saved ? JSON.parse(saved) : INITIAL_DAILY_PRODUCTION;
  });

  const [transactions, setTransactions] = useState<StockTransaction[]>(() => {
    const saved = localStorage.getItem('stock_transactions');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [stockCountRecords, setStockCountRecords] = useState<MonthlyStockCountRecord[]>(() => {
    const saved = localStorage.getItem('stock_count_records');
    return saved ? JSON.parse(saved) : [];
  });

  // Auth & Google Sheets State
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(() => {
    return localStorage.getItem('stock_spreadsheet_id') || null;
  });
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(() => {
    return localStorage.getItem('stock_spreadsheet_url') || null;
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Modal Visibility State
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);
  const [isNewTxModalOpen, setIsNewTxModalOpen] = useState(false);
  const [initialTxType, setInitialTxType] = useState<TransactionType>('Receive');
  const [editingTransaction, setEditingTransaction] = useState<{
    data: StockTransaction;
    index: number;
  } | null>(null);
  const [isNewProdModalOpen, setIsNewProdModalOpen] = useState(false);
  const [editingProduction, setEditingProduction] = useState<{
    data: DailyProduction;
    index: number;
  } | null>(null);
  const [isOpeningStockModalOpen, setIsOpeningStockModalOpen] = useState(false);
  const [isStockCountModalOpen, setIsStockCountModalOpen] = useState(false);
  const [isClearDataModalOpen, setIsClearDataModalOpen] = useState(false);
  const [isPopupBlockedModalOpen, setIsPopupBlockedModalOpen] = useState(false);
  const [selectedMaterialDetail, setSelectedMaterialDetail] = useState<string | null>(null);

  // Stock count handler (physical count roll-over)
  const handleSaveStockCount = (record: MonthlyStockCountRecord, applyAsOpeningStock: boolean) => {
    setStockCountRecords((prev) => {
      const filtered = prev.filter((r) => r.id !== record.id && r.Month !== record.Month);
      const updated = [...filtered, record];
      localStorage.setItem('stock_count_records', JSON.stringify(updated));
      return updated;
    });

    if (applyAsOpeningStock) {
      setMaterials((prev) => {
        const updated = prev.map((m) => {
          const matchedItem = record.Items.find((it) => it.RM_Code === m.RM_Code);
          if (matchedItem) {
            return { ...m, Opening_Stock: matchedItem.Counted_Qty };
          }
          return m;
        });
        localStorage.setItem('stock_materials', JSON.stringify(updated));
        return updated;
      });
      showNotification(`✅ บันทึกยอดตรวจนับจริงประจำเดือน ${record.Month} และยกยอดไปเป็นสต็อกต้นเดือนถัดไปเรียบร้อยแล้ว`);
    } else {
      showNotification(`✅ บันทึกผลการตรวจนับจริงประจำเดือน ${record.Month} เรียบร้อยแล้ว`);
    }
  };

  // Clear data handler
  const handleConfirmClearData = (options: {
    clearTransactions: boolean;
    clearProductions: boolean;
    clearMaterials: boolean;
    clearRecipes: boolean;
  }) => {
    if (options.clearTransactions) {
      setTransactions([]);
      localStorage.removeItem('stock_transactions');
    }
    if (options.clearProductions) {
      setProductions([]);
      localStorage.removeItem('stock_productions');
    }
    if (options.clearMaterials) {
      setMaterials([]);
      localStorage.removeItem('stock_materials');
    }
    if (options.clearRecipes) {
      setRecipes([]);
      localStorage.removeItem('stock_recipes');
    }
    showNotification('🗑️ เคลียร์ข้อมูลที่เลือกเรียบร้อยแล้ว พร้อมกรอกข้อมูลจริง');
  };

  // Restore sample data handler
  const handleRestoreSampleData = () => {
    setMaterials(INITIAL_MATERIALS);
    setRecipes(INITIAL_RECIPES);
    setProductions(INITIAL_DAILY_PRODUCTION);
    setTransactions(INITIAL_TRANSACTIONS);
    showNotification('✨ โหลดข้อมูลตัวอย่างกลับมาเรียบร้อยแล้ว');
  };

  // Single item deletion handlers
  const handleDeleteMaterial = (rmCode: string) => {
    setMaterials((prev) => prev.filter((m) => m.RM_Code !== rmCode));
    setRecipes((prev) => prev.filter((r) => r.RM_Code !== rmCode));
    showNotification(`ลบวัตถุดิบ ${rmCode} เรียบร้อยแล้ว`);
  };

  const handleDeleteRecipeItem = (productCode: string, rmCode: string) => {
    setRecipes((prev) =>
      prev.filter((r) => !(r.Product_Code === productCode && r.RM_Code === rmCode))
    );
    showNotification(`ลบส่วนผสม ${rmCode} ออกจากสูตร ${productCode} เรียบร้อยแล้ว`);
  };

  const handleDeleteProduction = (index: number) => {
    setProductions((prev) => prev.filter((_, idx) => idx !== index));
    showNotification('ลบรายการผลิตเรียบร้อยแล้ว');
  };

  const handleDeleteTransaction = (index: number) => {
    setTransactions((prev) => prev.filter((_, idx) => idx !== index));
    showNotification('ลบรายการประวัติสต๊อกเรียบร้อยแล้ว');
  };

  const handleSaveOpeningStocks = (updated: { RM_Code: string; Opening_Stock: number }[]) => {
    setMaterials((prev) =>
      prev.map((m) => {
        const match = updated.find((u) => u.RM_Code === m.RM_Code);
        return match ? { ...m, Opening_Stock: match.Opening_Stock } : m;
      })
    );
    showNotification('✅ บันทึกยอดยกมาต้นเดือนเรียบร้อยแล้ว');
  };

  // Save to localStorage whenever core data changes
  useEffect(() => {
    localStorage.setItem('stock_materials', JSON.stringify(materials));
  }, [materials]);

  useEffect(() => {
    localStorage.setItem('stock_recipes', JSON.stringify(recipes));
  }, [recipes]);

  useEffect(() => {
    localStorage.setItem('stock_productions', JSON.stringify(productions));
  }, [productions]);

  useEffect(() => {
    localStorage.setItem('stock_transactions', JSON.stringify(transactions));
  }, [transactions]);

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        if (currentUser) {
          setIsAdminAuthenticated(true);
          sessionStorage.setItem('stock_admin_auth', 'true');
        }
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleAdminAuthSuccess = () => {
    setIsAdminAuthenticated(true);
    sessionStorage.setItem('stock_admin_auth', 'true');
    setUserRole('admin');
    setIsAdminAuthModalOpen(false);
    showNotification('🔓 ปลดล็อคสิทธิ์ผู้ดูแลระบบ (Admin) สำเร็จ');
  };

  const handleLockAdmin = () => {
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem('stock_admin_auth');
    setUserRole('staff');
    if (activeTab === 'materials' || activeTab === 'recipes' || activeTab === 'formulas') {
      setActiveTab('staff-portal');
    }
    showNotification('🔒 ล็อคสิทธิ์ Admin และกลับสู่โหมดพนักงาน');
  };

  const handleRequestAdminAuth = () => {
    setIsAdminAuthModalOpen(true);
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Google Sign In
  const handleSignIn = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        setIsAdminAuthenticated(true);
        sessionStorage.setItem('stock_admin_auth', 'true');
        showNotification(`ยินดีต้อนรับคุณ ${res.user.displayName || res.user.email} (สิทธิ์ Admin)`);
      }
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-blocked' ||
        err?.message === 'POPUP_BLOCKED' ||
        err?.message?.includes('popup-blocked')
      ) {
        setIsPopupBlockedModalOpen(true);
      } else if (err?.code !== 'auth/popup-closed-by-user') {
        showNotification(`⚠️ เข้าสู่ระบบไม่สำเร็จ: ${err.message || 'กรุณาลองใหม่อีกครั้ง'}`);
      }
    }
  };

  // Google Sign Out
  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem('stock_admin_auth');
    setUserRole('staff');
    if (activeTab === 'materials' || activeTab === 'recipes' || activeTab === 'formulas') {
      setActiveTab('staff-portal');
    }
    showNotification('ออกจากระบบเรียบร้อย');
  };

  // Create New Spreadsheet in user's Drive
  const handleCreateNewSheet = async () => {
    let currentToken = token || (await getAccessToken());
    if (!currentToken) {
      const res = await googleSignIn();
      if (!res) throw new Error('กรุณาเข้าสู่ระบบ Google เพื่อสร้าง Sheet');
      currentToken = res.accessToken;
      setUser(res.user);
      setToken(res.accessToken);
    }

    setIsSyncing(true);
    try {
      const sheetInfo = await createStockSpreadsheet(
        currentToken,
        'ระบบสต๊อกและคำนวณวัตถุดิบ (Stock & Variance Tracking)'
      );

      await initializeSheetDataAndFormulas(
        currentToken,
        sheetInfo.spreadsheetId,
        materials,
        recipes,
        productions,
        transactions
      );

      setSpreadsheetId(sheetInfo.spreadsheetId);
      setSpreadsheetUrl(sheetInfo.spreadsheetUrl);
      localStorage.setItem('stock_spreadsheet_id', sheetInfo.spreadsheetId);
      localStorage.setItem('stock_spreadsheet_url', sheetInfo.spreadsheetUrl);

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
      });

      showNotification('✨ สร้าง Google Sheet พร้อมทั้ง 5 Tab และสูตรสำเร็จแล้ว!');
    } catch (err: any) {
      console.error(err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  // Link Existing Spreadsheet (Export Web Data to Existing Sheet)
  const handleLinkExistingSheet = async (sheetId: string) => {
    let currentToken = token || (await getAccessToken());
    if (!currentToken) {
      const res = await googleSignIn();
      if (!res) throw new Error('กรุณาเข้าสู่ระบบ Google');
      currentToken = res.accessToken;
      setUser(res.user);
      setToken(res.accessToken);
    }

    setIsSyncing(true);
    try {
      // Connect and push existing web data into this sheet (One-way export)
      await initializeSheetDataAndFormulas(
        currentToken,
        sheetId,
        materials,
        recipes,
        productions,
        transactions
      );

      setSpreadsheetId(sheetId);
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
      setSpreadsheetUrl(url);
      localStorage.setItem('stock_spreadsheet_id', sheetId);
      localStorage.setItem('stock_spreadsheet_url', url);

      showNotification('✅ เชื่อมต่อและส่งข้อมูลขึ้น Google Sheet สำเร็จแล้ว!');
    } catch (err: any) {
      console.error(err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  // Push local data up to Google Sheets (One-Way Export to Google Drive)
  const handlePushAllToSheet = async () => {
    if (!spreadsheetId) {
      setIsSyncModalOpen(true);
      return;
    }

    let currentToken = token || (await getAccessToken());
    if (!currentToken) {
      const res = await googleSignIn();
      if (!res) return;
      currentToken = res.accessToken;
      setUser(res.user);
      setToken(res.accessToken);
    }

    setIsSyncing(true);
    try {
      await initializeSheetDataAndFormulas(
        currentToken,
        spreadsheetId,
        materials,
        recipes,
        productions,
        transactions
      );
      showNotification('✅ ส่งข้อมูลจริงทั้งหมดขึ้น Google Sheet สำเร็จแล้ว!');
    } catch (err: any) {
      console.error(err);
      alert(`การส่งข้อมูลขึ้น Google Sheet ล้มเหลว: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Disconnect Sheet
  const handleDisconnectSheet = () => {
    if (window.confirm('คุณต้องการยกเลิกการเชื่อมต่อกับ Google Sheet นี้ใช่หรือไม่? (ข้อมูลในเว็บและในชีทจะไม่ถูกลบ)')) {
      setSpreadsheetId(null);
      setSpreadsheetUrl(null);
      localStorage.removeItem('stock_spreadsheet_id');
      localStorage.removeItem('stock_spreadsheet_url');
      showNotification('ยกเลิกการเชื่อมต่อกับ Google Sheet เรียบร้อย');
    }
  };

  // 1. Add Material
  const handleAddMaterial = (mat: MasterMaterial) => {
    setMaterials((prev) => [...prev, mat]);
    showNotification(`เพิ่มวัตถุดิบ ${mat.RM_Name} เรียบร้อยแล้ว`);
  };

  // 2. Update Material
  const handleUpdateMaterial = (mat: MasterMaterial) => {
    setMaterials((prev) =>
      prev.map((item) => (item.RM_Code === mat.RM_Code ? mat : item))
    );
    showNotification(`อัปเดตข้อมูล ${mat.RM_Name} สำเร็จ`);
  };

  // 3. Add Recipe Item
  const handleAddRecipe = (recipe: BOMRecipe) => {
    setRecipes((prev) => [...prev, recipe]);
    showNotification(`เพิ่มสูตรสำหรับสินค้า ${recipe.Product_Name} เรียบร้อย`);
  };

  // 4. Save/Edit Transaction
  const handleSaveTransaction = async (tx: StockTransaction) => {
    if (editingTransaction !== null) {
      const editIdx = editingTransaction.index;
      setTransactions((prev) => {
        const next = [...prev];
        next[editIdx] = tx;
        return next;
      });
      setEditingTransaction(null);
      showNotification(`แก้ไขข้อมูล ${tx.Type} (${tx.RM_Code}) เรียบร้อยแล้ว`);
    } else {
      setTransactions((prev) => [tx, ...prev]);
      showNotification(`บันทึก ${tx.Type} สำหรับ ${tx.RM_Code} สำเร็จ`);

      // Sync to Google Sheet if connected
      if (spreadsheetId) {
        try {
          const currentToken = token || (await getAccessToken());
          if (currentToken) {
            await appendTransactionToSheet(currentToken, spreadsheetId, tx);
          }
        } catch (err) {
          console.warn('Could not append row to Google Sheets:', err);
        }
      }
    }
  };

  const handleEditTransaction = (tx: StockTransaction, index: number) => {
    setEditingTransaction({ data: tx, index });
    setInitialTxType(tx.Type);
    setIsNewTxModalOpen(true);
  };

  // 5. Save/Edit Daily Production (with optional Auto-Deduct)
  const handleSaveProduction = async (prod: DailyProduction, autoDeduct: boolean) => {
    const fullProd = calculateProductionRowTotals(prod);

    if (editingProduction !== null) {
      const editIdx = editingProduction.index;
      setProductions((prev) => {
        const next = [...prev];
        next[editIdx] = fullProd;
        return next;
      });
      setEditingProduction(null);
      showNotification(`แก้ไขข้อมูลการผลิต ${fullProd.Product_Code} วันที่ ${fullProd.Date} สำเร็จ`);
    } else {
      setProductions((prev) => [fullProd, ...prev]);

      // If auto-deduct is enabled: generate Actual Usage transactions for all recipe ingredients
      if (autoDeduct) {
        const productRecipes = recipes.filter((r) => r.Product_Code === prod.Product_Code);
        const newAutoTxs: StockTransaction[] = productRecipes.map((r) => ({
          Date: prod.Date,
          Type: 'Actual Usage',
          RM_Code: r.RM_Code,
          Qty: Number((r.Standard_Qty * prod.Produced_Qty).toFixed(3)),
          Recorder: 'ระบบตัดสต็อกอัตโนมัติ (Auto BOM)',
          Note: `ตัดสต็อกตามยอดผลิต ${prod.Product_Code} (${prod.Produced_Qty} ชิ้น)`,
        }));

        if (newAutoTxs.length > 0) {
          setTransactions((prev) => [...newAutoTxs, ...prev]);
        }
        showNotification(
          `บันทึกยอดผลิต ${prod.Product_Code} (${prod.Produced_Qty} ชิ้น) และตัดสต็อกวัตถุดิบ ${newAutoTxs.length} รายการอัตโนมัติ!`
        );
      } else {
        showNotification(`บันทึกยอดผลิต ${prod.Product_Code} (${prod.Produced_Qty} ชิ้น) เรียบร้อย`);
      }

      // Sync to Google Sheet if connected
      if (spreadsheetId) {
        try {
          const currentToken = token || (await getAccessToken());
          if (currentToken) {
            await appendProductionToSheet(currentToken, spreadsheetId, fullProd);
          }
        } catch (err) {
          console.warn('Could not append production row to Google Sheets:', err);
        }
      }
    }
  };

  const handleEditProduction = (prod: DailyProduction, index: number) => {
    setEditingProduction({ data: prod, index });
    setIsNewProdModalOpen(true);
  };

  // 6. Manual trigger to Auto-Deduct batch
  const handleAutoDeductBatch = (prod: DailyProduction) => {
    const productRecipes = recipes.filter((r) => r.Product_Code === prod.Product_Code);
    if (productRecipes.length === 0) {
      alert(`ไม่พบสูตร BOM สำหรับสินค้ารหัส ${prod.Product_Code}`);
      return;
    }

    const newAutoTxs: StockTransaction[] = productRecipes.map((r) => ({
      Date: prod.Date,
      Type: 'Actual Usage',
      RM_Code: r.RM_Code,
      Qty: Number((r.Standard_Qty * prod.Produced_Qty).toFixed(3)),
      Recorder: 'ระบบตัดสต็อกอัตโนมัติ (Auto-deduct Batch)',
      Note: `ตัดสต็อกย้อนหลังจากยอดผลิต ${prod.Product_Code} วันที่ ${prod.Date}`,
    }));

    setTransactions((prev) => [...newAutoTxs, ...prev]);
    showNotification(`ตัดสต็อกวัตถุดิบ ${newAutoTxs.length} รายการตามสูตร BOM เรียบร้อยแล้ว!`);
  };

  // Calculate live summaries
  const summaries = generateMonthlySummary(materials, recipes, productions, transactions);
  const lowStockCount = summaries.filter((s) => s.isLowStock).length;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-xs sm:text-sm font-medium border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>{notification}</span>
        </div>
      )}

      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={userRole}
        setUserRole={setUserRole}
        isAdminAuthenticated={isAdminAuthenticated}
        onRequestAdminAuth={handleRequestAdminAuth}
        onLockAdmin={handleLockAdmin}
        user={user}
        spreadsheetId={spreadsheetId}
        spreadsheetUrl={spreadsheetUrl}
        isSyncing={isSyncing}
        onOpenSyncModal={() => {
          if (!isAdminAuthenticated) {
            handleRequestAdminAuth();
          } else {
            setIsSyncModalOpen(true);
          }
        }}
        onOpenFormulaModal={() => setIsFormulaModalOpen(true)}
        onOpenNewTxModal={(type = 'Receive') => {
          setInitialTxType(type);
          setIsNewTxModalOpen(true);
        }}
        onOpenNewProdModal={() => setIsNewProdModalOpen(true)}
        onOpenOpeningStockModal={() => setIsOpeningStockModalOpen(true)}
        onOpenClearDataModal={() => {
          if (!isAdminAuthenticated) {
            handleRequestAdminAuth();
          } else {
            setIsClearDataModalOpen(true);
          }
        }}
        onSyncNow={handlePushAllToSheet}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        lowStockCount={lowStockCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* KPI Overview Cards (hidden on dashboard and staff-portal to keep views clean) */}
        {activeTab !== 'dashboard' && activeTab !== 'staff-portal' && (
          <OverviewCards
            summaries={summaries}
            productions={productions}
            onSelectFilter={(f) => {
              setActiveFilter(f);
              if (activeTab !== 'summary') setActiveTab('summary');
            }}
            activeFilter={activeFilter}
          />
        )}

        {/* Tab Views */}
        {activeTab === 'dashboard' && (
          <MonthlyDashboardTab
            materials={materials}
            recipes={recipes}
            productions={productions}
            transactions={transactions}
            spreadsheetId={spreadsheetId}
            spreadsheetUrl={spreadsheetUrl}
            onOpenSyncModal={() => setIsSyncModalOpen(true)}
            onOpenFormulaGuide={() => setIsFormulaModalOpen(true)}
            onSelectMaterialDetail={(code) => setSelectedMaterialDetail(code)}
            onNavigateToTab={(tabName) => setActiveTab(tabName)}
          />
        )}

        {activeTab === 'staff-portal' && (
          <StaffPortalTab
            materials={materials}
            recipes={recipes}
            productions={productions}
            transactions={transactions}
            stockCountRecords={stockCountRecords}
            onOpenNewProdModal={() => {
              setEditingProduction(null);
              setIsNewProdModalOpen(true);
            }}
            onOpenNewTxModal={(type = 'Receive') => {
              setEditingTransaction(null);
              setInitialTxType(type);
              setIsNewTxModalOpen(true);
            }}
            onOpenOpeningStockModal={() => setIsOpeningStockModalOpen(true)}
            onOpenStockCountModal={() => setIsStockCountModalOpen(true)}
            onViewMaterialDetail={(code) => setSelectedMaterialDetail(code)}
            onEditProduction={handleEditProduction}
            onDeleteProduction={handleDeleteProduction}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}

        {activeTab === 'summary' && (
          <MonthlySummaryTab
            summaries={summaries}
            materials={materials}
            recipes={recipes}
            productions={productions}
            transactions={transactions}
            stockCountRecords={stockCountRecords}
            onOpenFormulaGuide={() => setIsFormulaModalOpen(true)}
            onOpenStockCountModal={() => setIsStockCountModalOpen(true)}
            onSelectMaterialDetail={(code) => setSelectedMaterialDetail(code)}
          />
        )}

        {activeTab === 'production' && (
          <DailyProductionTab
            productions={productions}
            recipes={recipes}
            materials={materials}
            onAddProduction={(p) => handleSaveProduction(p, false)}
            onAutoDeductBatch={handleAutoDeductBatch}
            onOpenNewProdModal={() => {
              setEditingProduction(null);
              setIsNewProdModalOpen(true);
            }}
            onEditProduction={handleEditProduction}
            onDeleteProduction={handleDeleteProduction}
          />
        )}

        {activeTab === 'transactions' && (
          <StockTransactionsTab
            transactions={transactions}
            materials={materials}
            onOpenNewTxModal={(type = 'Receive') => {
              setEditingTransaction(null);
              setInitialTxType(type);
              setIsNewTxModalOpen(true);
            }}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}

        {activeTab === 'materials' && (
          userRole === 'admin' ? (
            <MasterMaterialsTab
              materials={materials}
              summaries={summaries}
              onAddMaterial={handleAddMaterial}
              onUpdateMaterial={handleUpdateMaterial}
              onDeleteMaterial={handleDeleteMaterial}
            />
          ) : (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center max-w-md mx-auto my-12">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">
                ทะเบียนวัตถุดิบ (Master Materials)
              </h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                หน้านี้สงวนสิทธิ์เฉพาะผู้ดูแลระบบ (Admin) เพื่อป้องกันการแก้ไขรหัสวัตถุดิบ ราคาต่อหน่วย หรือสต็อกขั้นต่ำโดยไม่ได้รับอนุญาต
              </p>
              <button
                onClick={handleRequestAdminAuth}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>ยืนยันสิทธิ์ Admin เพื่อเข้าใช้งาน</span>
              </button>
            </div>
          )
        )}

        {activeTab === 'recipes' && (
          userRole === 'admin' ? (
            <BOMRecipeTab
              recipes={recipes}
              materials={materials}
              onAddRecipe={handleAddRecipe}
              onDeleteRecipeItem={handleDeleteRecipeItem}
            />
          ) : (
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center max-w-md mx-auto my-12">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">
                สูตรมาตรฐานต่อชิ้น (BOM Recipes)
              </h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                หน้านี้สงวนสิทธิ์เฉพาะผู้ดูแลระบบ (Admin) ในการจัดการสูตรคำนวณและอัตราการใช้วัตถุดิบต่อหน่วยผลิต
              </p>
              <button
                onClick={handleRequestAdminAuth}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>ยืนยันสิทธิ์ Admin เพื่อเข้าใช้งาน</span>
              </button>
            </div>
          )
        )}

        {activeTab === 'formulas' && (
          <FormulaGuideModal isInlineTab={true} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            ระบบจัดการสต๊อกสินค้าและเปรียบเทียบการใช้วัตถุดิบ (Stock & Variance Tracking System)
          </div>
          <div className="flex items-center gap-4">
            <span>เชื่อมโยงสูตรอัตโนมัติ 5 Tab</span>
            <button
              onClick={() => setIsFormulaModalOpen(true)}
              className="text-blue-600 hover:underline font-medium"
            >
              ดูสูตร Google Sheets
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AdminAuthModal
        isOpen={isAdminAuthModalOpen}
        onClose={() => setIsAdminAuthModalOpen(false)}
        onSuccess={handleAdminAuthSuccess}
        onGoogleSignIn={handleSignIn}
        user={user}
        adminPin={adminPin}
      />

      <ClearDataModal
        isOpen={isClearDataModalOpen}
        onClose={() => setIsClearDataModalOpen(false)}
        onConfirmClear={handleConfirmClearData}
        onRestoreSampleData={handleRestoreSampleData}
        counts={{
          materials: materials.length,
          recipes: recipes.length,
          productions: productions.length,
          transactions: transactions.length,
        }}
      />
      <GoogleSheetsSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        user={user}
        spreadsheetId={spreadsheetId}
        spreadsheetUrl={spreadsheetUrl}
        isSyncing={isSyncing}
        onSignIn={handleSignIn}
        onCreateNewSheet={handleCreateNewSheet}
        onLinkExistingSheet={handleLinkExistingSheet}
        onPushAllToSheet={handlePushAllToSheet}
        onDisconnectSheet={handleDisconnectSheet}
      />

      <FormulaGuideModal
        isOpen={isFormulaModalOpen}
        onClose={() => setIsFormulaModalOpen(false)}
      />

      <NewTransactionModal
        isOpen={isNewTxModalOpen}
        onClose={() => {
          setIsNewTxModalOpen(false);
          setEditingTransaction(null);
        }}
        materials={materials}
        summaries={summaries}
        initialType={initialTxType}
        initialData={editingTransaction?.data || null}
        onSave={handleSaveTransaction}
      />

      <NewProductionModal
        isOpen={isNewProdModalOpen}
        onClose={() => {
          setIsNewProdModalOpen(false);
          setEditingProduction(null);
        }}
        recipes={recipes}
        materials={materials}
        initialData={editingProduction?.data || null}
        onSave={handleSaveProduction}
      />

      <OpeningStockModal
        isOpen={isOpeningStockModalOpen}
        onClose={() => setIsOpeningStockModalOpen(false)}
        materials={materials}
        onSaveOpeningStocks={handleSaveOpeningStocks}
      />

      <PhysicalStockCountModal
        isOpen={isStockCountModalOpen}
        onClose={() => setIsStockCountModalOpen(false)}
        materials={materials}
        recipes={recipes}
        productions={productions}
        transactions={transactions}
        onSaveStockCount={handleSaveStockCount}
        onRestoreSampleData={handleRestoreSampleData}
      />

      <MaterialDetailModal
        rmCode={selectedMaterialDetail}
        onClose={() => setSelectedMaterialDetail(null)}
        materials={materials}
        recipes={recipes}
        productions={productions}
        transactions={transactions}
        summaries={summaries}
      />

      <PopupBlockedModal
        isOpen={isPopupBlockedModalOpen}
        onClose={() => setIsPopupBlockedModalOpen(false)}
        onRetry={() => {
          setIsPopupBlockedModalOpen(false);
          handleSignIn();
        }}
      />
    </div>
  );
}
