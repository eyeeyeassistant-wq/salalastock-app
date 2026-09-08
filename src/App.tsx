import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  MonthlyStockCountRecord,
} from './types/stock';
import {
  INITIAL_MATERIALS,
  INITIAL_RECIPES,
  INITIAL_DAILY_PRODUCTION,
  INITIAL_TRANSACTIONS,
  DEMO_MATERIALS,
  DEMO_RECIPES,
  DEMO_DAILY_PRODUCTION,
  DEMO_TRANSACTIONS,
} from './data/initialData';
import {
  generateMonthlySummary,
  calculateProductionRowTotals,
  sanitizeMaterials,
  sanitizeRecipes,
  sanitizeProductions,
  sanitizeTransactions,
} from './utils/calculations';
import {
  initAuth,
  googleSignIn,
  logout,
} from './services/auth';
import {
  testSupabaseConnection,
  fetchMasterMaterials,
  upsertMasterMaterial,
  deleteMasterMaterial,
  updateMaterialOpeningStock,
  fetchBOMRecipes,
  upsertBOMRecipe,
  deleteBOMRecipe,
  fetchDailyProductions,
  saveDailyProduction,
  deleteDailyProduction,
  fetchStockTransactions,
  saveStockTransaction,
  deleteStockTransaction,
  deleteTransactionsForProduction,
  fetchMonthlyStockCounts,
  fetchMonthlyStockCountRecords,
  closeMonthlyStockReconciliation,
  seedInitialDataToSupabase,
  clearSupabaseTable,
} from './services/supabase';
import {
  getLineNotifyToken,
  sendLowStockAlertNotification,
} from './services/lineNotify';

// Components
import { Navbar } from './components/Navbar';
import { OverviewCards } from './components/OverviewCards';
import { MonthlyDashboardTab } from './components/MonthlyDashboardTab';
import { MonthlySummaryTab } from './components/MonthlySummaryTab';
import { DailyProductionTab } from './components/DailyProductionTab';
import { StockTransactionsTab } from './components/StockTransactionsTab';
import { MasterMaterialsTab } from './components/MasterMaterialsTab';
import { BOMRecipeTab } from './components/BOMRecipeTab';
import { FormulaGuideModal } from './components/FormulaGuideModal';
import { SupabaseSyncModal } from './components/SupabaseSyncModal';
import { LineNotifyModal } from './components/LineNotifyModal';
import { NewTransactionModal } from './components/NewTransactionModal';
import { NewProductionModal } from './components/NewProductionModal';
import { MaterialDetailModal } from './components/MaterialDetailModal';
import { OpeningStockModal } from './components/OpeningStockModal';
import { PhysicalStockCountTab } from './components/PhysicalStockCountTab';
import { ClearDataModal } from './components/ClearDataModal';
import { AdminAuthModal } from './components/AdminAuthModal';

export default function App() {
  const [userRole, setUserRole] = useState<UserRole>('staff');
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [activeFilter, setActiveFilter] = useState<'all' | 'lowStock' | 'overused'>('all');

  // Admin Auth Gate State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('stock_admin_auth') === 'true';
  });
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);
  const [adminPin, setAdminPin] = useState<string>(() => {
    return localStorage.getItem('stock_admin_pin') || '8888';
  });

  // Core Data State (Saved to Supabase PostgreSQL & localStorage fallback)
  const [materials, setMaterials] = useState<MasterMaterial[]>(() => {
    // One-time purge of previously loaded sample data in browser cache
    const samplePurged = localStorage.getItem('stock_sample_cleaned_v2');
    if (!samplePurged) {
      localStorage.setItem('stock_materials', JSON.stringify([]));
      localStorage.setItem('stock_recipes', JSON.stringify([]));
      localStorage.setItem('stock_productions', JSON.stringify([]));
      localStorage.setItem('stock_transactions', JSON.stringify([]));
      localStorage.setItem('stock_count_records', JSON.stringify([]));
      localStorage.setItem('stock_sample_cleaned_v2', 'true');
      return [];
    }

    const saved = localStorage.getItem('stock_materials');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sanitizeMaterials(parsed);
        }
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [recipes, setRecipes] = useState<BOMRecipe[]>(() => {
    const saved = localStorage.getItem('stock_recipes');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sanitizeRecipes(parsed);
        }
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [productions, setProductions] = useState<DailyProduction[]>(() => {
    const saved = localStorage.getItem('stock_productions');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sanitizeProductions(parsed);
        }
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [transactions, setTransactions] = useState<StockTransaction[]>(() => {
    const saved = localStorage.getItem('stock_transactions');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sanitizeTransactions(parsed);
        }
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [stockCountRecords, setStockCountRecords] = useState<MonthlyStockCountRecord[]>(() => {
    const saved = localStorage.getItem('stock_count_records');
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // Supabase Database Connection & Status
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isLineNotifyModalOpen, setIsLineNotifyModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    return localStorage.getItem('stock_last_sync') || '';
  });
  const [notification, setNotification] = useState<string | null>(null);
  const isInitialLoadDoneRef = useRef(false);

  // Auth State
  const [user, setUser] = useState<User | null>(null);

  // Load initial data from Supabase (PostgreSQL)
  const loadFromSupabase = async (notify: boolean = false) => {
    setIsSyncing(true);
    try {
      const connRes = await testSupabaseConnection();
      setIsSupabaseConnected(connRes.success);

      if (connRes.success) {
        const [mats, recs, prods, txs, counts] = await Promise.all([
          fetchMasterMaterials(),
          fetchBOMRecipes(),
          fetchDailyProductions(),
          fetchStockTransactions(),
          fetchMonthlyStockCountRecords(),
        ]);

        if (mats.length > 0 || recs.length > 0 || prods.length > 0 || txs.length > 0) {
          // Check if existing data is the default bakery sample dataset
          const isOldSampleData =
            mats &&
            mats.length <= 8 &&
            mats.some(
              (m) =>
                m.RM_Code === 'RM001' &&
                (m.RM_Name.includes('แป้งสาลี') || m.RM_Name.includes('Flour'))
            );

          const dbSamplePurged = localStorage.getItem('stock_cloud_sample_purged_v2');

          if (isOldSampleData && !dbSamplePurged) {
            // Purge sample data from cloud database as requested
            await Promise.allSettled([
              clearSupabaseTable('stock_transactions'),
              clearSupabaseTable('daily_production'),
              clearSupabaseTable('bom_recipe'),
              clearSupabaseTable('master_materials'),
              clearSupabaseTable('monthly_stock_counts'),
            ]);
            localStorage.setItem('stock_cloud_sample_purged_v2', 'true');
            setMaterials([]);
            setRecipes([]);
            setProductions([]);
            setTransactions([]);
            setStockCountRecords([]);
            localStorage.setItem('stock_materials', JSON.stringify([]));
            localStorage.setItem('stock_recipes', JSON.stringify([]));
            localStorage.setItem('stock_productions', JSON.stringify([]));
            localStorage.setItem('stock_transactions', JSON.stringify([]));
            localStorage.setItem('stock_count_records', JSON.stringify([]));
            if (notify) {
              showNotification('🧹 ลบข้อมูลตัวอย่างออกจากระบบเรียบร้อย พร้อมใช้งาน');
            }
            return;
          }

          setMaterials(mats);
          setRecipes(recs);
          setProductions(prods);
          setTransactions(txs);
          setStockCountRecords(counts);
          localStorage.setItem('stock_materials', JSON.stringify(mats));
          localStorage.setItem('stock_recipes', JSON.stringify(recs));
          localStorage.setItem('stock_productions', JSON.stringify(prods));
          localStorage.setItem('stock_transactions', JSON.stringify(txs));
          localStorage.setItem('stock_count_records', JSON.stringify(counts));
          if (notify) {
            showNotification('🟢 โหลดข้อมูลล่าสุดจากฐานข้อมูลกลางสำเร็จ');
          }
        } else {
          // Database tables are empty and clean - keep them empty
          setMaterials([]);
          setRecipes([]);
          setProductions([]);
          setTransactions([]);
          localStorage.setItem('stock_materials', JSON.stringify([]));
          localStorage.setItem('stock_recipes', JSON.stringify([]));
          localStorage.setItem('stock_productions', JSON.stringify([]));
          localStorage.setItem('stock_transactions', JSON.stringify([]));
        }
      } else {
        if (notify) {
          showNotification('⚠️ ยังไม่ได้เชื่อมต่อฐานข้อมูลกลาง ใช้ข้อมูลแคชในเครื่อง');
        }
      }
    } catch (err: any) {
      console.warn('Supabase initial fetch note:', err);
      setIsSupabaseConnected(false);
    } finally {
      setIsSyncing(false);
      isInitialLoadDoneRef.current = true;
    }
  };

  useEffect(() => {
    loadFromSupabase(true);
  }, []);

  // Modal Visibility State
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
  const [isClearDataModalOpen, setIsClearDataModalOpen] = useState(false);
  const [selectedMaterialDetail, setSelectedMaterialDetail] = useState<string | null>(null);

  // Centralized local state persistence & status updater
  const triggerAutoSync = (patch?: {
    materials?: MasterMaterial[];
    recipes?: BOMRecipe[];
    productions?: DailyProduction[];
    transactions?: StockTransaction[];
    stockCountRecords?: MonthlyStockCountRecord[];
  }) => {
    if (patch?.materials) localStorage.setItem('stock_materials', JSON.stringify(patch.materials));
    if (patch?.recipes) localStorage.setItem('stock_recipes', JSON.stringify(patch.recipes));
    if (patch?.productions) localStorage.setItem('stock_productions', JSON.stringify(patch.productions));
    if (patch?.transactions) localStorage.setItem('stock_transactions', JSON.stringify(patch.transactions));
    if (patch?.stockCountRecords) localStorage.setItem('stock_count_records', JSON.stringify(patch.stockCountRecords));

    const nowStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
    setLastSyncTime(nowStr);
    localStorage.setItem('stock_last_sync', nowStr);
  };

  // Stock count handler (physical count roll-over)
  const handleSaveStockCount = async (record: MonthlyStockCountRecord, applyAsOpeningStock: boolean) => {
    let nextStockCounts: MonthlyStockCountRecord[] = [];
    setStockCountRecords((prev) => {
      const filtered = prev.filter((r) => r.id !== record.id && r.Month !== record.Month);
      const updated = [...filtered, record];
      nextStockCounts = updated;
      localStorage.setItem('stock_count_records', JSON.stringify(updated));
      return updated;
    });

    let nextMats = materials;
    if (applyAsOpeningStock) {
      setMaterials((prev) => {
        const updated = prev.map((m) => {
          const matchedItem = record.Items.find((it) => it.RM_Code === m.RM_Code);
          if (matchedItem) {
            return { ...m, Opening_Stock: matchedItem.Counted_Qty };
          }
          return m;
        });
        nextMats = updated;
        localStorage.setItem('stock_materials', JSON.stringify(updated));
        return updated;
      });
      showNotification(`✅ บันทึกยอดตรวจนับจริงประจำเดือน ${record.Month} และยกยอดไปเป็นสต็อกต้นเดือนถัดไปเรียบร้อยแล้ว`);
    } else {
      showNotification(`✅ บันทึกผลการตรวจนับจริงประจำเดือน ${record.Month} เรียบร้อยแล้ว`);
    }

    triggerAutoSync({ stockCountRecords: nextStockCounts, materials: nextMats });

    // Save to Supabase (PostgreSQL)
    try {
      await closeMonthlyStockReconciliation({
        countDate: record.Count_Date || `${record.Month}-01`,
        recorder: record.Counted_By || 'ผู้ตรวจนับ',
        note: record.Note,
        items: record.Items,
      });
    } catch (e: any) {
      console.warn('Supabase stock count save notice:', e);
    }
  };

  // Clear data handler
  const handleConfirmClearData = (options: {
    clearTransactions: boolean;
    clearProductions: boolean;
    clearMaterials: boolean;
    clearRecipes: boolean;
  }) => {
    let nextTxs = transactions;
    let nextProds = productions;
    let nextMats = materials;
    let nextRecipes = recipes;

    localStorage.setItem('stock_data_initialized', 'true');

    if (options.clearTransactions) {
      nextTxs = [];
      setTransactions([]);
      localStorage.setItem('stock_transactions', JSON.stringify([]));
      clearSupabaseTable('stock_transactions').catch(console.warn);
    }
    if (options.clearProductions) {
      nextProds = [];
      setProductions([]);
      localStorage.setItem('stock_productions', JSON.stringify([]));
      clearSupabaseTable('daily_production').catch(console.warn);
    }
    if (options.clearMaterials) {
      nextMats = [];
      setMaterials([]);
      localStorage.setItem('stock_materials', JSON.stringify([]));
      clearSupabaseTable('master_materials').catch(console.warn);
    }
    if (options.clearRecipes) {
      nextRecipes = [];
      setRecipes([]);
      localStorage.setItem('stock_recipes', JSON.stringify([]));
      clearSupabaseTable('bom_recipe').catch(console.warn);
    }
    showNotification('🗑️ เคลียร์ข้อมูลที่เลือกเรียบร้อยแล้ว พร้อมกรอกข้อมูลจริง');
    triggerAutoSync({
      materials: nextMats,
      recipes: nextRecipes,
      productions: nextProds,
      transactions: nextTxs,
    });
  };

  // Restore sample data handler (optional test data)
  const handleRestoreSampleData = () => {
    setMaterials(DEMO_MATERIALS);
    setRecipes(DEMO_RECIPES);
    setProductions(DEMO_DAILY_PRODUCTION);
    setTransactions(DEMO_TRANSACTIONS);
    localStorage.setItem('stock_materials', JSON.stringify(DEMO_MATERIALS));
    localStorage.setItem('stock_recipes', JSON.stringify(DEMO_RECIPES));
    localStorage.setItem('stock_productions', JSON.stringify(DEMO_DAILY_PRODUCTION));
    localStorage.setItem('stock_transactions', JSON.stringify(DEMO_TRANSACTIONS));
    localStorage.setItem('stock_sample_cleaned_v2', 'true');
    showNotification('✨ โหลดชุดข้อมูลตัวอย่างทดสอบเรียบร้อยแล้ว');
    triggerAutoSync({
      materials: DEMO_MATERIALS,
      recipes: DEMO_RECIPES,
      productions: DEMO_DAILY_PRODUCTION,
      transactions: DEMO_TRANSACTIONS,
    });
    seedInitialDataToSupabase(DEMO_MATERIALS, DEMO_RECIPES, DEMO_DAILY_PRODUCTION, DEMO_TRANSACTIONS).catch(console.warn);
  };

  // Import Excel / Sheets Data
  const handleImportExcelData = (imported: Partial<{
    materials: MasterMaterial[];
    recipes: BOMRecipe[];
    productions: DailyProduction[];
    transactions: StockTransaction[];
  }>) => {
    let nextMats = materials;
    let nextRecipes = recipes;
    let nextProds = productions;
    let nextTxs = transactions;

    if (imported.materials && imported.materials.length > 0) {
      nextMats = imported.materials;
      setMaterials(nextMats);
      localStorage.setItem('stock_materials', JSON.stringify(nextMats));
    }
    if (imported.recipes && imported.recipes.length > 0) {
      nextRecipes = imported.recipes;
      setRecipes(nextRecipes);
      localStorage.setItem('stock_recipes', JSON.stringify(nextRecipes));
    }
    if (imported.productions && imported.productions.length > 0) {
      nextProds = imported.productions;
      setProductions(nextProds);
      localStorage.setItem('stock_productions', JSON.stringify(nextProds));
    }
    if (imported.transactions && imported.transactions.length > 0) {
      nextTxs = imported.transactions;
      setTransactions(nextTxs);
      localStorage.setItem('stock_transactions', JSON.stringify(nextTxs));
    }

    localStorage.setItem('stock_data_initialized', 'true');
    showNotification('✨ นำเข้าข้อมูลและบันทึกสู่ระบบถาวรเรียบร้อยแล้ว!');
    triggerAutoSync({
      materials: nextMats,
      recipes: nextRecipes,
      productions: nextProds,
      transactions: nextTxs,
    });
    seedInitialDataToSupabase(nextMats, nextRecipes, nextProds, nextTxs).catch(console.warn);
  };

  // Single item deletion handlers
  const handleDeleteMaterial = (rmCode: string) => {
    const code = (rmCode || '').trim().toUpperCase();
    const nextMats = materials.filter((m) => (m.RM_Code || '').trim().toUpperCase() !== code);
    const nextRecipes = recipes.filter((r) => (r.RM_Code || '').trim().toUpperCase() !== code);
    setMaterials(nextMats);
    setRecipes(nextRecipes);
    localStorage.setItem('stock_materials', JSON.stringify(nextMats));
    localStorage.setItem('stock_recipes', JSON.stringify(nextRecipes));
    showNotification(`🗑️ ลบวัตถุดิบ ${code} เรียบร้อยแล้ว`);
    triggerAutoSync({ materials: nextMats, recipes: nextRecipes });
    deleteMasterMaterial(code).catch(console.warn);
  };

  const handleDeleteRecipeItem = (productCode: string, rmCode: string) => {
    const pCode = (productCode || '').trim().toUpperCase();
    const rCode = (rmCode || '').trim().toUpperCase();
    const nextRecipes = recipes.filter(
      (r) => !((r.Product_Code || '').trim().toUpperCase() === pCode && (r.RM_Code || '').trim().toUpperCase() === rCode)
    );
    setRecipes(nextRecipes);
    localStorage.setItem('stock_recipes', JSON.stringify(nextRecipes));
    showNotification(`🗑️ ลบส่วนผสม ${rCode} ออกจากสูตร ${pCode} เรียบร้อยแล้ว`);
    triggerAutoSync({ recipes: nextRecipes });
    deleteBOMRecipe(pCode, rCode).catch(console.warn);
  };

  const handleDeleteProduction = (
    target: number | string | DailyProduction,
    deleteLinkedStockTxs: boolean = true
  ) => {
    let targetProd: DailyProduction | undefined;
    let targetIdx = -1;

    if (typeof target === 'number') {
      targetIdx = target;
      targetProd = productions[target];
    } else if (typeof target === 'string') {
      targetIdx = productions.findIndex((p) => p.id === target);
      if (targetIdx !== -1) targetProd = productions[targetIdx];
    } else if (target) {
      if (target.id) {
        targetIdx = productions.findIndex((p) => p.id === target.id);
      }
      if (targetIdx === -1) {
        targetIdx = productions.findIndex(
          (p) =>
            p.Date === target.Date &&
            (p.Product_Code || '').trim().toUpperCase() === (target.Product_Code || '').trim().toUpperCase() &&
            Number(p.Produced_Qty) === Number(target.Produced_Qty)
        );
      }
      if (targetIdx !== -1) {
        targetProd = productions[targetIdx];
      } else {
        targetProd = target;
      }
    }

    let nextProds: DailyProduction[];
    if (targetIdx >= 0 && targetIdx < productions.length) {
      nextProds = productions.filter((_, idx) => idx !== targetIdx);
    } else if (targetProd) {
      nextProds = productions.filter((p) => {
        if (targetProd!.id && p.id) return p.id !== targetProd!.id;
        return !(
          p.Date === targetProd!.Date &&
          (p.Product_Code || '').trim().toUpperCase() === (targetProd!.Product_Code || '').trim().toUpperCase() &&
          Number(p.Produced_Qty) === Number(targetProd!.Produced_Qty)
        );
      });
    } else {
      nextProds = [...productions];
    }

    let nextTxs = [...transactions];
    let removedTxCount = 0;

    if (deleteLinkedStockTxs && targetProd) {
      const prodId = targetProd.id;
      const pCode = (targetProd.Product_Code || '').trim().toUpperCase();
      const prodDate = targetProd.Date;

      // Find recipe ingredients for this product to ensure all auto-deductions are matched
      const prodRecipes = recipes.filter(
        (r) => (r.Product_Code || '').trim().toUpperCase() === pCode
      );
      const recipeRmCodes = new Set(prodRecipes.map((r) => (r.RM_Code || '').trim().toUpperCase()));

      nextTxs = transactions.filter((t) => {
        // 1. Direct match by productionId
        if (prodId && t.productionId === prodId) {
          removedTxCount++;
          if (t.id) deleteStockTransaction(t.id).catch(console.warn);
          return false;
        }

        // 2. Match by signature (auto-deducted usage on same date with matching product/recipe)
        const isDateMatch = t.Date === prodDate;
        const isUsage = t.Type === 'Actual Usage';
        const isAutoDeduct =
          (t.Recorder && (t.Recorder.toLowerCase().includes('auto') || t.Recorder.includes('อัตโนมัติ'))) ||
          (t.Note && (t.Note.includes('ตัดสต็อก') || t.Note.includes('BOM') || t.Note.includes(pCode) || (targetProd && targetProd.Product_Code && t.Note.includes(targetProd.Product_Code))));
        const isRmMatch = recipeRmCodes.size > 0 && recipeRmCodes.has((t.RM_Code || '').trim().toUpperCase());

        if (isDateMatch && isUsage && (isAutoDeduct || (isRmMatch && isAutoDeduct))) {
          removedTxCount++;
          if (t.id) deleteStockTransaction(t.id).catch(console.warn);
          return false;
        }

        return true;
      });
    }

    // Delete production row in Supabase
    if (targetProd?.id) {
      deleteDailyProduction(targetProd.id).catch(console.warn);
    }

    // Update state and persistence immediately
    setProductions(nextProds);
    localStorage.setItem('stock_productions', JSON.stringify(nextProds));
    setTransactions(nextTxs);
    localStorage.setItem('stock_transactions', JSON.stringify(nextTxs));

    if (removedTxCount > 0) {
      showNotification(`🗑️ ลบยอดผลิตและยกเลิกการตัดสต็อกวัตถุดิบ ${removedTxCount} รายการเรียบร้อยแล้ว`);
    } else {
      showNotification('🗑️ ลบรายการผลิตเรียบร้อยแล้ว');
    }

    triggerAutoSync({ productions: nextProds, transactions: nextTxs });
  };

  const handleDeleteTransaction = (target: number | string | StockTransaction) => {
    let nextTxs: StockTransaction[];
    let targetIdToDelete: string | null = null;

    if (typeof target === 'number') {
      targetIdToDelete = transactions[target]?.id || null;
      nextTxs = transactions.filter((_, idx) => idx !== target);
    } else if (typeof target === 'string') {
      targetIdToDelete = target;
      nextTxs = transactions.filter((t) => t.id !== target);
    } else if (target) {
      if (target.id) {
        targetIdToDelete = target.id;
        nextTxs = transactions.filter((t) => t.id !== target.id);
      } else {
        const targetIdx = transactions.findIndex(
          (t) =>
            t.Date === target.Date &&
            t.Type === target.Type &&
            (t.RM_Code || '').trim().toUpperCase() === (target.RM_Code || '').trim().toUpperCase() &&
            Number(t.Qty) === Number(target.Qty)
        );
        if (targetIdx !== -1) {
          targetIdToDelete = transactions[targetIdx]?.id || null;
          nextTxs = transactions.filter((_, idx) => idx !== targetIdx);
        } else {
          nextTxs = transactions.filter((t) => t !== target);
        }
      }
    } else {
      nextTxs = [...transactions];
    }

    if (targetIdToDelete) {
      deleteStockTransaction(targetIdToDelete).catch(console.warn);
    }

    setTransactions(nextTxs);
    localStorage.setItem('stock_transactions', JSON.stringify(nextTxs));
    showNotification('🗑️ ลบรายการประวัติสต๊อกเรียบร้อยแล้ว');
    triggerAutoSync({ transactions: nextTxs });
  };

  const handleSaveOpeningStocks = async (updated: { RM_Code: string; Opening_Stock: number }[]) => {
    const nextMats = materials.map((m) => {
      const match = updated.find((u) => u.RM_Code === m.RM_Code);
      return match ? { ...m, Opening_Stock: match.Opening_Stock } : m;
    });
    setMaterials(nextMats);
    localStorage.setItem('stock_materials', JSON.stringify(nextMats));
    showNotification('✅ บันทึกยอดยกมาต้นเดือนเรียบร้อยแล้ว');
    try {
      await Promise.all(
        updated.map((u) => updateMaterialOpeningStock(u.RM_Code, u.Opening_Stock))
      );
    } catch (e) {
      console.warn('Supabase opening stock update notice:', e);
    }
  };

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          setIsAdminAuthenticated(true);
          sessionStorage.setItem('stock_admin_auth', 'true');
        }
      },
      () => {
        setUser(null);
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
      setActiveTab('dashboard');
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
        showNotification('⚠️ เบราว์เซอร์บล็อคหน้าต่างป็อปอัป สามารถใช้รหัส PIN 8888 เพื่อเข้าใช้งานได้ทันที');
      } else if (err?.code !== 'auth/popup-closed-by-user') {
        showNotification(`⚠️ เข้าสู่ระบบไม่สำเร็จ: ${err.message || 'กรุณาลองใหม่อีกครั้ง'}`);
      }
    }
  };

  // Google Sign Out
  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem('stock_admin_auth');
    setUserRole('staff');
    if (activeTab === 'materials' || activeTab === 'recipes' || activeTab === 'formulas') {
      setActiveTab('dashboard');
    }
    showNotification('ออกจากระบบเรียบร้อย');
  };

  // Supabase Manual Sync Handler
  const handleSyncSupabase = async () => {
    await loadFromSupabase(true);
  };

  // Push current local data into Supabase
  const handlePushAllToSupabase = async () => {
    setIsSyncing(true);
    try {
      await seedInitialDataToSupabase(materials, recipes, productions, transactions);
      showNotification('✅ บันทึกและซิงค์ข้อมูลทั้งหมดขึ้นฐานข้อมูลกลางเรียบร้อย!');
      confetti({
        particleCount: 50,
        spread: 45,
        origin: { y: 0.7 },
      });
    } catch (e: any) {
      showNotification(`⚠️ เกิดข้อผิดพลาดในการบันทึกไปที่ฐานข้อมูล: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // LINE Notify alert handler
  const handleSendLineNotifyAlert = async () => {
    const token = getLineNotifyToken();
    if (!token) {
      setIsLineNotifyModalOpen(true);
      return;
    }
    const currentSummaries = generateMonthlySummary(materials, recipes, productions, transactions);
    const lowStockItems = currentSummaries
      .filter((s) => s.isLowStock)
      .map((s) => {
        const mat = materials.find((m) => m.RM_Code === s.RM_Code);
        return {
          ...s,
          Safety_Stock: mat?.Safety_Stock || 0,
        };
      });

    if (lowStockItems.length === 0) {
      showNotification('✅ สต๊อกวัตถุดิบทุกรายการยังอยู่ในเกณฑ์ปลอดภัย ไม่มียอดวิกฤต');
      return;
    }

    try {
      const res = await sendLowStockAlertNotification(lowStockItems, token);
      if (res.success) {
        showNotification(`📲 ส่งการแจ้งเตือนเตือนสต๊อกต่ำ ${lowStockItems.length} รายการเข้า LINE เรียบร้อยแล้ว`);
      } else {
        showNotification(`⚠️ ไม่สามารถส่ง LINE Notify ได้: ${res.message}`);
      }
    } catch (err: any) {
      showNotification(`⚠️ ไม่สามารถส่ง LINE Notify ได้: ${err.message}`);
    }
  };

  // 1. Add Material
  const handleAddMaterial = (mat: MasterMaterial) => {
    const code = mat.RM_Code.trim().toUpperCase();
    const sanitizedMat = { ...mat, RM_Code: code };
    let nextMats: MasterMaterial[];
    if (materials.some((m) => m.RM_Code.trim().toUpperCase() === code)) {
      nextMats = materials.map((m) =>
        m.RM_Code.trim().toUpperCase() === code ? sanitizedMat : m
      );
      showNotification(`อัปเดตข้อมูลวัตถุดิบ ${mat.RM_Name} (${code}) เรียบร้อยแล้ว`);
    } else {
      nextMats = [...materials, sanitizedMat];
      showNotification(`เพิ่มวัตถุดิบ ${mat.RM_Name} (${code}) เรียบร้อยแล้ว`);
    }
    nextMats = sanitizeMaterials(nextMats);
    setMaterials(nextMats);
    triggerAutoSync({ materials: nextMats });
    upsertMasterMaterial(sanitizedMat).catch(console.warn);
  };

  // 2. Update Material
  const handleUpdateMaterial = (mat: MasterMaterial) => {
    const code = mat.RM_Code.trim().toUpperCase();
    const sanitizedMat = { ...mat, RM_Code: code };
    const nextMats = sanitizeMaterials(
      materials.map((item) => (item.RM_Code.trim().toUpperCase() === code ? sanitizedMat : item))
    );
    setMaterials(nextMats);
    showNotification(`อัปเดตข้อมูล ${mat.RM_Name} สำเร็จ`);
    triggerAutoSync({ materials: nextMats });
    upsertMasterMaterial(sanitizedMat).catch(console.warn);
  };

  // 3. Add Recipe Item
  const handleAddRecipe = (recipe: BOMRecipe) => {
    const pCode = recipe.Product_Code.trim().toUpperCase();
    const rmCode = recipe.RM_Code.trim().toUpperCase();
    const sanitizedRecipe = { ...recipe, Product_Code: pCode, RM_Code: rmCode };
    let nextRecipes: BOMRecipe[];
    const exists = recipes.some(
      (r) => r.Product_Code.trim().toUpperCase() === pCode && r.RM_Code.trim().toUpperCase() === rmCode
    );
    if (exists) {
      nextRecipes = recipes.map((r) =>
        r.Product_Code.trim().toUpperCase() === pCode && r.RM_Code.trim().toUpperCase() === rmCode
          ? sanitizedRecipe
          : r
      );
    } else {
      nextRecipes = [...recipes, sanitizedRecipe];
    }
    nextRecipes = sanitizeRecipes(nextRecipes);
    setRecipes(nextRecipes);
    showNotification(`บันทึกสูตร ${recipe.Product_Code} (${recipe.RM_Code}) เรียบร้อย`);
    triggerAutoSync({ recipes: nextRecipes });
    upsertBOMRecipe(sanitizedRecipe).catch(console.warn);
  };

  // 4. Save/Edit Transaction
  const handleSaveTransaction = async (tx: StockTransaction) => {
    const fullTx: StockTransaction = {
      ...tx,
      id: tx.id || `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    };
    let nextTxs = [...transactions];
    if (editingTransaction !== null) {
      const editIdx = editingTransaction.index;
      const oldTx = editingTransaction.data || transactions[editIdx];
      const targetIdx = nextTxs.findIndex((t, idx) =>
        oldTx?.id && t.id ? t.id === oldTx.id : idx === editIdx
      );
      if (targetIdx !== -1) {
        nextTxs[targetIdx] = { ...fullTx, id: oldTx?.id || fullTx.id };
      } else {
        nextTxs.unshift(fullTx);
      }
      setEditingTransaction(null);
      showNotification(`แก้ไขข้อมูล ${fullTx.Type} (${fullTx.RM_Code}) เรียบร้อยแล้ว`);
    } else {
      nextTxs = [fullTx, ...nextTxs];
      showNotification(`บันทึก ${fullTx.Type} สำหรับ ${fullTx.RM_Code} สำเร็จ`);
    }

    setTransactions(nextTxs);
    localStorage.setItem('stock_transactions', JSON.stringify(nextTxs));
    triggerAutoSync({ transactions: nextTxs });
    saveStockTransaction(fullTx).catch(console.warn);
  };

  const handleEditTransaction = (tx: StockTransaction, index: number) => {
    setEditingTransaction({ data: tx, index });
    setInitialTxType(tx.Type);
    setIsNewTxModalOpen(true);
  };

  // 5. Save/Edit Daily Production (with optional Auto-Deduct & Auto-Update on Edit)
  const handleSaveProduction = async (prod: DailyProduction, autoDeduct: boolean) => {
    const fullProd = calculateProductionRowTotals(prod);
    if (!fullProd.id) {
      fullProd.id = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    }
    let nextProds = [...productions];
    let nextTxs = [...transactions];

    const pCode = (fullProd.Product_Code || '').trim().toUpperCase();
    const productRecipes = recipes.filter(
      (r) => (r.Product_Code || '').trim().toUpperCase() === pCode
    );

    if (editingProduction !== null) {
      const editIdx = editingProduction.index;
      const oldProd = editingProduction.data || productions[editIdx];
      const oldCode = (oldProd?.Product_Code || '').trim().toUpperCase();

      const targetIdx = nextProds.findIndex((p, idx) =>
        oldProd?.id && p.id ? p.id === oldProd.id : idx === editIdx
      );

      if (targetIdx !== -1) {
        nextProds[targetIdx] = { ...fullProd, id: oldProd?.id || fullProd.id };
      } else {
        nextProds.unshift(fullProd);
      }
      setEditingProduction(null);

      // If autoDeduct is enabled on edit:
      // Remove previously auto-deducted transactions for this batch and replace with new calculated usage
      if (autoDeduct && oldProd) {
        const filteredTxs = nextTxs.filter((t) => {
          const isOldAuto =
            t.Date === oldProd.Date &&
            t.Type === 'Actual Usage' &&
            (t.Recorder?.includes('Auto') || t.Note?.includes('ตัดสต็อก')) &&
            (t.Note?.includes(oldCode) || t.Note?.includes(oldProd.Product_Code));
          return !isOldAuto;
        });

        const newAutoTxs: StockTransaction[] = productRecipes.map((r) => ({
          id: `tx_auto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          productionId: fullProd.id,
          Date: fullProd.Date,
          Type: 'Actual Usage',
          RM_Code: r.RM_Code,
          Qty: Number(((Number(r.Standard_Qty) || 0) * (Number(fullProd.Produced_Qty) || 0)).toFixed(3)),
          Recorder: 'ระบบตัดสต็อกอัตโนมัติ (Auto BOM)',
          Note: `ตัดสต็อกตามยอดผลิต ${fullProd.Product_Code} (${fullProd.Produced_Qty} ชิ้น)`,
        }));

        nextTxs = [...newAutoTxs, ...filteredTxs];
        setTransactions(nextTxs);
        localStorage.setItem('stock_transactions', JSON.stringify(nextTxs));
        newAutoTxs.forEach((atx) => saveStockTransaction(atx).catch(console.warn));
        showNotification(
          `✅ แก้ไขยอดผลิต ${fullProd.Product_Code} (${fullProd.Produced_Qty} ชิ้น) และปรับยอดตัดสต็อกวัตถุดิบ ${newAutoTxs.length} รายการให้อัตโนมัติ!`
        );
      } else {
        showNotification(`✅ แก้ไขข้อมูลการผลิต ${fullProd.Product_Code} วันที่ ${fullProd.Date} สำเร็จ`);
      }
    } else {
      nextProds = [fullProd, ...nextProds];

      if (autoDeduct) {
        const newAutoTxs: StockTransaction[] = productRecipes.map((r) => ({
          id: `tx_auto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          productionId: fullProd.id,
          Date: fullProd.Date,
          Type: 'Actual Usage',
          RM_Code: r.RM_Code,
          Qty: Number(((Number(r.Standard_Qty) || 0) * (Number(fullProd.Produced_Qty) || 0)).toFixed(3)),
          Recorder: 'ระบบตัดสต็อกอัตโนมัติ (Auto BOM)',
          Note: `ตัดสต็อกตามยอดผลิต ${fullProd.Product_Code} (${fullProd.Produced_Qty} ชิ้น)`,
        }));

        if (newAutoTxs.length > 0) {
          nextTxs = [...newAutoTxs, ...nextTxs];
          setTransactions(nextTxs);
          localStorage.setItem('stock_transactions', JSON.stringify(nextTxs));
          newAutoTxs.forEach((atx) => saveStockTransaction(atx).catch(console.warn));
        }
        showNotification(
          `✅ บันทึกยอดผลิต ${fullProd.Product_Code} (${fullProd.Produced_Qty} ชิ้น) และตัดสต็อกวัตถุดิบ ${newAutoTxs.length} รายการอัตโนมัติ!`
        );
      } else {
        showNotification(`✅ บันทึกยอดผลิต ${fullProd.Product_Code} (${fullProd.Produced_Qty} ชิ้น) เรียบร้อย`);
      }
    }

    setProductions(nextProds);
    localStorage.setItem('stock_productions', JSON.stringify(nextProds));
    triggerAutoSync({ productions: nextProds, transactions: nextTxs });
    saveDailyProduction(fullProd).catch(console.warn);
  };

  const handleEditProduction = (prod: DailyProduction, index: number) => {
    setEditingProduction({ data: prod, index });
    setIsNewProdModalOpen(true);
  };

  // 6. Manual trigger to Auto-Deduct batch (with duplicate protection)
  const handleAutoDeductBatch = (prod: DailyProduction) => {
    const pCode = (prod.Product_Code || '').trim().toUpperCase();
    const productRecipes = recipes.filter(
      (r) => (r.Product_Code || '').trim().toUpperCase() === pCode
    );
    if (productRecipes.length === 0) {
      alert(`ไม่พบสูตร BOM สำหรับสินค้ารหัส ${prod.Product_Code}`);
      return;
    }

    // Filter out previous auto-deductions for this batch to prevent double counting
    const filteredTxs = transactions.filter((t) => {
      if (prod.id && t.productionId === prod.id) return false;
      const isOldAuto =
        t.Date === prod.Date &&
        t.Type === 'Actual Usage' &&
        (t.Recorder?.includes('Auto') || t.Note?.includes('ตัดสต็อก')) &&
        (t.Note?.includes(pCode) || t.Note?.includes(prod.Product_Code));
      return !isOldAuto;
    });

    const newAutoTxs: StockTransaction[] = productRecipes.map((r) => ({
      id: `tx_auto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      productionId: prod.id,
      Date: prod.Date,
      Type: 'Actual Usage',
      RM_Code: r.RM_Code,
      Qty: Number(((Number(r.Standard_Qty) || 0) * (Number(prod.Produced_Qty) || 0)).toFixed(3)),
      Recorder: 'ระบบตัดสต็อกอัตโนมัติ (Auto BOM)',
      Note: `ตัดสต็อกตามยอดผลิต ${prod.Product_Code} (${prod.Produced_Qty} ชิ้น)`,
    }));

    const nextTxs = [...newAutoTxs, ...filteredTxs];
    setTransactions(nextTxs);
    newAutoTxs.forEach((atx) => saveStockTransaction(atx).catch(console.warn));
    showNotification(`⚡ ตัดสต็อกวัตถุดิบ ${newAutoTxs.length} รายการตามสูตร BOM x ยอดผลิต ${prod.Produced_Qty} ชิ้น เรียบร้อยแล้ว!`);
    triggerAutoSync({ transactions: nextTxs });
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
        isSupabaseConnected={isSupabaseConnected}
        isSyncing={isSyncing}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onOpenLineNotifyModal={() => setIsLineNotifyModalOpen(true)}
        onOpenFormulaModal={() => setIsFormulaModalOpen(true)}
        onOpenNewTxModal={() => {
          setInitialTxType('Receive');
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
        onSyncNow={handleSyncSupabase}
        lowStockCount={lowStockCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* KPI Overview Cards (hidden on dashboard to keep views clean) */}
        {activeTab !== 'dashboard' && (
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
            isSupabaseConnected={isSupabaseConnected}
            onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
            onOpenLineNotifyModal={() => setIsLineNotifyModalOpen(true)}
            onOpenFormulaGuide={() => setIsFormulaModalOpen(true)}
            onSelectMaterialDetail={(code) => setSelectedMaterialDetail(code)}
            onNavigateToTab={(tabName) => setActiveTab(tabName)}
          />
        )}

        {activeTab === 'stock-count' && (
          <PhysicalStockCountTab
            materials={materials}
            recipes={recipes}
            productions={productions}
            transactions={transactions}
            stockCountRecords={stockCountRecords}
            onSaveStockCount={handleSaveStockCount}
            onBackToDashboard={() => setActiveTab('dashboard')}
            onRestoreSampleData={handleRestoreSampleData}
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
            onOpenStockCountModal={() => setActiveTab('stock-count')}
            onSelectMaterialDetail={(code) => setSelectedMaterialDetail(code)}
          />
        )}

        {activeTab === 'production' && (
          <DailyProductionTab
            productions={productions}
            recipes={recipes}
            materials={materials}
            transactions={transactions}
            onAddProduction={(p) => handleSaveProduction(p, false)}
            onAutoDeductBatch={handleAutoDeductBatch}
            onOpenNewProdModal={() => {
              setEditingProduction(null);
              setIsNewProdModalOpen(true);
            }}
            onEditProduction={handleEditProduction}
            onDeleteProduction={(target, deleteLinked) =>
              handleDeleteProduction(target, deleteLinked !== false)
            }
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

      <MaterialDetailModal
        rmCode={selectedMaterialDetail}
        onClose={() => setSelectedMaterialDetail(null)}
        materials={materials}
        recipes={recipes}
        productions={productions}
        transactions={transactions}
        summaries={summaries}
      />

      <SupabaseSyncModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onRefreshData={handleSyncSupabase}
        onShowNotification={showNotification}
        materials={materials}
        recipes={recipes}
        productions={productions}
        transactions={transactions}
      />

      <LineNotifyModal
        isOpen={isLineNotifyModalOpen}
        onClose={() => setIsLineNotifyModalOpen(false)}
        summaries={summaries}
        onShowNotification={showNotification}
      />
    </div>
  );
}
