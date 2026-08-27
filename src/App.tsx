import React, { useState, useEffect, useRef } from 'react';
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
  sanitizeMaterials,
  sanitizeRecipes,
  sanitizeProductions,
  sanitizeTransactions,
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
  syncViaWebhook,
  fetchDataFromGoogleSheet,
} from './services/googleSheets';
import {
  testFirestoreConnection,
  loadCloudData,
  loadCloudSettings,
  saveCloudDataDebounced,
  saveCloudSettings,
  subscribeToCloudChanges,
} from './services/firestore';

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
import { GoogleSheetsSyncModal } from './components/GoogleSheetsSyncModal';
import { NewTransactionModal } from './components/NewTransactionModal';
import { NewProductionModal } from './components/NewProductionModal';
import { MaterialDetailModal } from './components/MaterialDetailModal';
import { OpeningStockModal } from './components/OpeningStockModal';
import { PhysicalStockCountTab } from './components/PhysicalStockCountTab';
import { ClearDataModal } from './components/ClearDataModal';
import { PopupBlockedModal } from './components/PopupBlockedModal';
import { AdminAuthModal } from './components/AdminAuthModal';
import { MonthlyStockCountRecord } from './types/stock';
import {
  DEFAULT_WEBHOOK_URL,
  DEFAULT_SPREADSHEET_URL,
  getEffectiveWebhookUrl,
} from './config/googleSheetsConfig';

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

  // Core Data State (Saved to Cloud Firestore & localStorage)
  const [materials, setMaterials] = useState<MasterMaterial[]>(() => {
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

  // Auth & Google Sheets State
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(() => {
    return localStorage.getItem('stock_spreadsheet_id') || null;
  });
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(() => {
    return localStorage.getItem('stock_spreadsheet_url') || (DEFAULT_SPREADSHEET_URL ? DEFAULT_SPREADSHEET_URL : null);
  });
  const [webhookUrl, setWebhookUrl] = useState<string | null>(() => {
    return getEffectiveWebhookUrl();
  });
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    return localStorage.getItem('stock_auto_sync') !== 'false';
  });
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return localStorage.getItem('stock_last_sync') || null;
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Debounce ref for live Google Sheets background syncing
  const autoSyncTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Background Cloud Firestore and Google Sheets Auto-Sync Trigger
  const triggerAutoSync = (overrides?: {
    materials?: MasterMaterial[];
    recipes?: BOMRecipe[];
    productions?: DailyProduction[];
    transactions?: StockTransaction[];
    stockCountRecords?: MonthlyStockCountRecord[];
  }) => {
    const curMats = overrides?.materials || materials;
    const curRecipes = overrides?.recipes || recipes;
    const curProds = overrides?.productions || productions;
    const curTxs = overrides?.transactions || transactions;
    const curCounts = overrides?.stockCountRecords || stockCountRecords;

    // 1. Always persist to Cloud Firestore database
    saveCloudDataDebounced({
      materials: curMats,
      recipes: curRecipes,
      productions: curProds,
      transactions: curTxs,
      stockCountRecords: curCounts,
      isInitialized: true,
    });

    // 2. Real-time automatic sync to Google Sheets
    const currentWebhook = getEffectiveWebhookUrl() || webhookUrl || localStorage.getItem('stock_webhook_url');
    const currentSheetId = spreadsheetId || localStorage.getItem('stock_spreadsheet_id');

    if (!currentWebhook && !currentSheetId) return;

    if (autoSyncTimerRef.current) {
      clearTimeout(autoSyncTimerRef.current);
    }

    autoSyncTimerRef.current = setTimeout(async () => {
      try {
        setIsSyncing(true);
        if (currentWebhook) {
          await syncViaWebhook(
            currentWebhook,
            {
              materials: curMats,
              recipes: curRecipes,
              productions: curProds,
              transactions: curTxs,
              monthlyStockCounts: curCounts,
            },
            'syncAll'
          );
          const nowStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
          setLastSyncTime(nowStr);
          localStorage.setItem('stock_last_sync', nowStr);
          saveCloudSettings({ lastSyncTime: nowStr });
        } else if (currentSheetId) {
          const currentToken = token || (await getAccessToken());
          if (currentToken) {
            await initializeSheetDataAndFormulas(
              currentToken,
              currentSheetId,
              curMats,
              curRecipes,
              curProds,
              curTxs
            );
            const nowStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
            setLastSyncTime(nowStr);
            localStorage.setItem('stock_last_sync', nowStr);
            saveCloudSettings({ lastSyncTime: nowStr });
          }
        }
      } catch (err) {
        console.warn('Auto-sync background update notice:', err);
      } finally {
        setIsSyncing(false);
      }
    }, 400);
  };

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
  const [isClearDataModalOpen, setIsClearDataModalOpen] = useState(false);
  const [isPopupBlockedModalOpen, setIsPopupBlockedModalOpen] = useState(false);
  const [selectedMaterialDetail, setSelectedMaterialDetail] = useState<string | null>(null);

  // Stock count handler (physical count roll-over)
  const handleSaveStockCount = (record: MonthlyStockCountRecord, applyAsOpeningStock: boolean) => {
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
    }
    if (options.clearProductions) {
      nextProds = [];
      setProductions([]);
      localStorage.setItem('stock_productions', JSON.stringify([]));
    }
    if (options.clearMaterials) {
      nextMats = [];
      setMaterials([]);
      localStorage.setItem('stock_materials', JSON.stringify([]));
    }
    if (options.clearRecipes) {
      nextRecipes = [];
      setRecipes([]);
      localStorage.setItem('stock_recipes', JSON.stringify([]));
    }
    showNotification('🗑️ เคลียร์ข้อมูลที่เลือกเรียบร้อยแล้ว พร้อมกรอกข้อมูลจริง');
    triggerAutoSync({
      materials: nextMats,
      recipes: nextRecipes,
      productions: nextProds,
      transactions: nextTxs,
    });
  };

  // Restore sample data handler
  const handleRestoreSampleData = () => {
    setMaterials(INITIAL_MATERIALS);
    setRecipes(INITIAL_RECIPES);
    setProductions(INITIAL_DAILY_PRODUCTION);
    setTransactions(INITIAL_TRANSACTIONS);
    localStorage.setItem('stock_materials', JSON.stringify(INITIAL_MATERIALS));
    localStorage.setItem('stock_recipes', JSON.stringify(INITIAL_RECIPES));
    localStorage.setItem('stock_productions', JSON.stringify(INITIAL_DAILY_PRODUCTION));
    localStorage.setItem('stock_transactions', JSON.stringify(INITIAL_TRANSACTIONS));
    localStorage.setItem('stock_data_initialized', 'true');
    showNotification('✨ โหลดข้อมูลตัวอย่างเดิมกลับมาเรียบร้อยแล้ว');
    triggerAutoSync({
      materials: INITIAL_MATERIALS,
      recipes: INITIAL_RECIPES,
      productions: INITIAL_DAILY_PRODUCTION,
      transactions: INITIAL_TRANSACTIONS,
    });
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
          return false;
        }

        return true;
      });
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
    if (typeof target === 'number') {
      nextTxs = transactions.filter((_, idx) => idx !== target);
    } else if (typeof target === 'string') {
      nextTxs = transactions.filter((t) => t.id !== target);
    } else if (target) {
      if (target.id) {
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
          nextTxs = transactions.filter((_, idx) => idx !== targetIdx);
        } else {
          nextTxs = transactions.filter((t) => t !== target);
        }
      }
    } else {
      nextTxs = [...transactions];
    }

    setTransactions(nextTxs);
    localStorage.setItem('stock_transactions', JSON.stringify(nextTxs));
    showNotification('🗑️ ลบรายการประวัติสต๊อกเรียบร้อยแล้ว');
    triggerAutoSync({ transactions: nextTxs });
  };

  const handleSaveOpeningStocks = (updated: { RM_Code: string; Opening_Stock: number }[]) => {
    const nextMats = materials.map((m) => {
      const match = updated.find((u) => u.RM_Code === m.RM_Code);
      return match ? { ...m, Opening_Stock: match.Opening_Stock } : m;
    });
    setMaterials(nextMats);
    showNotification('✅ บันทึกยอดยกมาต้นเดือนเรียบร้อยแล้ว');
    triggerAutoSync({ materials: nextMats });
  };

  // Track initial load completion to prevent premature blank overwriting
  const isInitialLoadDoneRef = useRef(false);

  // Save to localStorage & Cloud & auto-sync to Google Sheets whenever core data changes (after initial startup load is complete)
  useEffect(() => {
    if (!isInitialLoadDoneRef.current) return;

    localStorage.setItem('stock_materials', JSON.stringify(materials));
    localStorage.setItem('stock_recipes', JSON.stringify(recipes));
    localStorage.setItem('stock_productions', JSON.stringify(productions));
    localStorage.setItem('stock_transactions', JSON.stringify(transactions));
    localStorage.setItem('stock_count_records', JSON.stringify(stockCountRecords));

    saveCloudDataDebounced(
      {
        materials,
        recipes,
        productions,
        transactions,
        stockCountRecords,
        isInitialized: true,
      },
      350
    );

    // Continuous automatic background sync to Google Sheets
    triggerAutoSync({
      materials,
      recipes,
      productions,
      transactions,
      stockCountRecords,
    });
  }, [materials, recipes, productions, transactions, stockCountRecords]);

  // Load persistent data & settings from Google Sheet & Cloud Database on startup
  useEffect(() => {
    testFirestoreConnection();

    let isSubscribed = true;

    // 1. Initial fetch: Always pull latest real-time single-source-of-truth from Google Sheets first!
    (async () => {
      try {
        const [cloudData, cloudSettings] = await Promise.all([
          loadCloudData(),
          loadCloudSettings(),
        ]);

        if (!isSubscribed) return;

        let loadedMats = materials;
        let loadedRecipes = recipes;
        let loadedProds = productions;
        let loadedTxs = transactions;
        let loadedCounts = stockCountRecords;
        let hasData = false;

        // Resolve webhook configuration
        const targetWebhook =
          (DEFAULT_WEBHOOK_URL && DEFAULT_WEBHOOK_URL.trim().startsWith('http') ? DEFAULT_WEBHOOK_URL.trim() : null) ||
          cloudSettings?.webhookUrl ||
          localStorage.getItem('stock_webhook_url');

        // Always check and load live data from Google Sheets first
        if (targetWebhook) {
          try {
            console.log('🔄 Live auto-fetching single source of truth from Google Sheet on startup...');
            const sheetData = await fetchDataFromGoogleSheet(targetWebhook);
            if (
              sheetData &&
              ((sheetData.materials && sheetData.materials.length > 0) ||
                (sheetData.productions && sheetData.productions.length > 0) ||
                (sheetData.transactions && sheetData.transactions.length > 0))
            ) {
              if (sheetData.materials && sheetData.materials.length > 0) {
                loadedMats = sanitizeMaterials(sheetData.materials);
                setMaterials(loadedMats);
              }
              if (sheetData.recipes && sheetData.recipes.length > 0) {
                loadedRecipes = sanitizeRecipes(sheetData.recipes);
                setRecipes(loadedRecipes);
              }
              if (sheetData.productions && sheetData.productions.length > 0) {
                loadedProds = sanitizeProductions(sheetData.productions);
                setProductions(loadedProds);
              }
              if (sheetData.transactions && sheetData.transactions.length > 0) {
                loadedTxs = sanitizeTransactions(sheetData.transactions);
                setTransactions(loadedTxs);
              }
              if (sheetData.monthlyStockCounts && sheetData.monthlyStockCounts.length > 0) {
                loadedCounts = sheetData.monthlyStockCounts;
                setStockCountRecords(loadedCounts);
              }
              hasData = true;
              showNotification('🟢 โหลดข้อมูลเรียลไทม์จาก Google Sheets สำเร็จ');
            }
          } catch (e) {
            console.warn('Auto-fetch from Google Sheet notice on startup:', e);
          }
        }

        // If Google Sheets had no data yet, load from Cloud Firestore
        if (!hasData && cloudData && cloudData.isInitialized) {
          const hasCloudItems =
            (cloudData.materials && cloudData.materials.length > 0) ||
            (cloudData.productions && cloudData.productions.length > 0) ||
            (cloudData.transactions && cloudData.transactions.length > 0) ||
            (cloudData.recipes && cloudData.recipes.length > 0);

          if (hasCloudItems) {
            loadedMats = sanitizeMaterials(cloudData.materials || []);
            loadedRecipes = sanitizeRecipes(cloudData.recipes || []);
            loadedProds = sanitizeProductions(cloudData.productions || []);
            loadedTxs = sanitizeTransactions(cloudData.transactions || []);
            loadedCounts = cloudData.stockCountRecords || [];
            setMaterials(loadedMats);
            setRecipes(loadedRecipes);
            setProductions(loadedProds);
            setTransactions(loadedTxs);
            setStockCountRecords(loadedCounts);
            hasData = true;
          }
        }

        // If still empty, check if localStorage has unsynced data
        if (!hasData) {
          const localMats = localStorage.getItem('stock_materials');
          const localTxs = localStorage.getItem('stock_transactions');
          const localProds = localStorage.getItem('stock_productions');
          const localRecipes = localStorage.getItem('stock_recipes');
          const localCounts = localStorage.getItem('stock_count_records');

          if (localMats || localTxs || localProds) {
            try {
              if (localMats) {
                const parsed = JSON.parse(localMats);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  loadedMats = sanitizeMaterials(parsed);
                  setMaterials(loadedMats);
                  hasData = true;
                }
              }
              if (localRecipes) {
                const parsed = JSON.parse(localRecipes);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  loadedRecipes = sanitizeRecipes(parsed);
                  setRecipes(loadedRecipes);
                }
              }
              if (localTxs) {
                const parsed = JSON.parse(localTxs);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  loadedTxs = sanitizeTransactions(parsed);
                  setTransactions(loadedTxs);
                  hasData = true;
                }
              }
              if (localProds) {
                const parsed = JSON.parse(localProds);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  loadedProds = sanitizeProductions(parsed);
                  setProductions(loadedProds);
                  hasData = true;
                }
              }
              if (localCounts) {
                const parsed = JSON.parse(localCounts);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  loadedCounts = parsed;
                  setStockCountRecords(parsed);
                }
              }
            } catch (e) {
              console.warn('LocalStorage parse notice:', e);
            }
          }
        }

        // Save active state to Cloud Database
        saveCloudDataDebounced(
          {
            materials: loadedMats,
            recipes: loadedRecipes,
            productions: loadedProds,
            transactions: loadedTxs,
            stockCountRecords: loadedCounts,
            isInitialized: true,
          },
          100
        );

        localStorage.setItem('stock_data_initialized', 'true');
        isInitialLoadDoneRef.current = true;

        if (cloudSettings) {
          if (DEFAULT_WEBHOOK_URL && DEFAULT_WEBHOOK_URL.trim().startsWith('http')) {
            setWebhookUrl(DEFAULT_WEBHOOK_URL.trim());
            localStorage.setItem('stock_webhook_url', DEFAULT_WEBHOOK_URL.trim());
          } else if (cloudSettings.webhookUrl !== undefined) {
            setWebhookUrl(cloudSettings.webhookUrl);
            if (cloudSettings.webhookUrl) {
              localStorage.setItem('stock_webhook_url', cloudSettings.webhookUrl);
            } else {
              localStorage.removeItem('stock_webhook_url');
            }
          }

          if (cloudSettings.spreadsheetId !== undefined) {
            setSpreadsheetId(cloudSettings.spreadsheetId);
            if (cloudSettings.spreadsheetId) {
              localStorage.setItem('stock_spreadsheet_id', cloudSettings.spreadsheetId);
            } else {
              localStorage.removeItem('stock_spreadsheet_id');
            }
          }

          if (DEFAULT_SPREADSHEET_URL && DEFAULT_SPREADSHEET_URL.trim().startsWith('http')) {
            setSpreadsheetUrl(DEFAULT_SPREADSHEET_URL.trim());
            localStorage.setItem('stock_spreadsheet_url', DEFAULT_SPREADSHEET_URL.trim());
          } else if (cloudSettings.spreadsheetUrl !== undefined) {
            setSpreadsheetUrl(cloudSettings.spreadsheetUrl);
            if (cloudSettings.spreadsheetUrl) {
              localStorage.setItem('stock_spreadsheet_url', cloudSettings.spreadsheetUrl);
            } else {
              localStorage.removeItem('stock_spreadsheet_url');
            }
          }
          if (cloudSettings.autoSyncEnabled !== undefined) {
            setAutoSyncEnabled(cloudSettings.autoSyncEnabled);
            localStorage.setItem('stock_auto_sync', cloudSettings.autoSyncEnabled ? 'true' : 'false');
          }
          if (cloudSettings.lastSyncTime !== undefined) {
            setLastSyncTime(cloudSettings.lastSyncTime);
            if (cloudSettings.lastSyncTime) {
              localStorage.setItem('stock_last_sync', cloudSettings.lastSyncTime);
            }
          }
          if (cloudSettings.adminPin) {
            setAdminPin(cloudSettings.adminPin);
            localStorage.setItem('stock_admin_pin', cloudSettings.adminPin);
          }
        }
      } catch (err) {
        console.warn('Initial cloud state fetch notice:', err);
        isInitialLoadDoneRef.current = true;
      }
    })();

    // 2. Real-time subscription to cloud changes across tabs / devices
    const unsubscribeCloud = subscribeToCloudChanges(
      (data) => {
        if (!isInitialLoadDoneRef.current) return;
        if (data && data.isInitialized) {
          if (data.materials && JSON.stringify(data.materials) !== localStorage.getItem('stock_materials')) {
            setMaterials(data.materials);
            localStorage.setItem('stock_materials', JSON.stringify(data.materials));
          }
          if (data.recipes && JSON.stringify(data.recipes) !== localStorage.getItem('stock_recipes')) {
            setRecipes(data.recipes);
            localStorage.setItem('stock_recipes', JSON.stringify(data.recipes));
          }
          if (data.productions && JSON.stringify(data.productions) !== localStorage.getItem('stock_productions')) {
            setProductions(data.productions);
            localStorage.setItem('stock_productions', JSON.stringify(data.productions));
          }
          if (data.transactions && JSON.stringify(data.transactions) !== localStorage.getItem('stock_transactions')) {
            setTransactions(data.transactions);
            localStorage.setItem('stock_transactions', JSON.stringify(data.transactions));
          }
          if (data.stockCountRecords && JSON.stringify(data.stockCountRecords) !== localStorage.getItem('stock_count_records')) {
            setStockCountRecords(data.stockCountRecords);
            localStorage.setItem('stock_count_records', JSON.stringify(data.stockCountRecords));
          }
        }
      },
      (settings) => {
        if (settings) {
          if (settings.webhookUrl !== undefined) {
            setWebhookUrl(settings.webhookUrl);
            if (settings.webhookUrl) localStorage.setItem('stock_webhook_url', settings.webhookUrl);
          }
          if (settings.spreadsheetId !== undefined) {
            setSpreadsheetId(settings.spreadsheetId);
            if (settings.spreadsheetId) localStorage.setItem('stock_spreadsheet_id', settings.spreadsheetId);
          }
          if (settings.spreadsheetUrl !== undefined) {
            setSpreadsheetUrl(settings.spreadsheetUrl);
            if (settings.spreadsheetUrl) localStorage.setItem('stock_spreadsheet_url', settings.spreadsheetUrl);
          }
          if (settings.autoSyncEnabled !== undefined) {
            setAutoSyncEnabled(settings.autoSyncEnabled);
            localStorage.setItem('stock_auto_sync', settings.autoSyncEnabled ? 'true' : 'false');
          }
          if (settings.lastSyncTime !== undefined) {
            setLastSyncTime(settings.lastSyncTime);
            if (settings.lastSyncTime) localStorage.setItem('stock_last_sync', settings.lastSyncTime);
          }
          if (settings.adminPin) {
            setAdminPin(settings.adminPin);
            localStorage.setItem('stock_admin_pin', settings.adminPin);
          }
        }
      }
    );

    return () => {
      isSubscribed = false;
      unsubscribeCloud();
    };
  }, []);

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
      setActiveTab('dashboard');
    }
    showNotification('ออกจากระบบเรียบร้อย');
  };

  // Webhook Configuration Handler
  const handleSaveWebhookUrl = async (url: string) => {
    setIsSyncing(true);
    try {
      await syncViaWebhook(url, {
        materials,
        recipes,
        productions,
        transactions,
        monthlyStockCounts: stockCountRecords,
      }, 'syncAll');

      setWebhookUrl(url);
      localStorage.setItem('stock_webhook_url', url);
      const nowStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
      setLastSyncTime(nowStr);
      localStorage.setItem('stock_last_sync', nowStr);
      
      // Persist Webhook & Sync settings to Cloud Database permanently
      await saveCloudSettings({
        webhookUrl: url,
        autoSyncEnabled: true,
        lastSyncTime: nowStr,
      });

      confetti({
        particleCount: 70,
        spread: 50,
        origin: { y: 0.6 },
      });
      showNotification('⚡ เชื่อมต่อ Google Apps Script Webhook และบันทึกบนคลาวด์ถาวรแล้ว!');
    } catch (err: any) {
      console.error(err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleAutoSync = (enabled: boolean) => {
    setAutoSyncEnabled(enabled);
    localStorage.setItem('stock_auto_sync', enabled ? 'true' : 'false');
    saveCloudSettings({ autoSyncEnabled: enabled });
    showNotification(enabled ? '🟢 เปิดการซิงค์อัตโนมัติเข้า Google Sheet แล้ว' : '⏸️ ปิดการซิงค์อัตโนมัติชั่วคราว');
    if (enabled) {
      triggerAutoSync();
    }
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
        transactions,
        stockCountRecords
      );

      setSpreadsheetId(sheetInfo.spreadsheetId);
      setSpreadsheetUrl(sheetInfo.spreadsheetUrl);
      localStorage.setItem('stock_spreadsheet_id', sheetInfo.spreadsheetId);
      localStorage.setItem('stock_spreadsheet_url', sheetInfo.spreadsheetUrl);
      const nowStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
      setLastSyncTime(nowStr);
      localStorage.setItem('stock_last_sync', nowStr);

      await saveCloudSettings({
        spreadsheetId: sheetInfo.spreadsheetId,
        spreadsheetUrl: sheetInfo.spreadsheetUrl,
        lastSyncTime: nowStr,
      });

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
      });

      showNotification('✨ สร้าง Google Sheet พร้อมบันทึกการเชื่อมต่อไปยังคลาวด์ถาวรแล้ว!');
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
        transactions,
        stockCountRecords
      );

      setSpreadsheetId(sheetId);
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
      setSpreadsheetUrl(url);
      localStorage.setItem('stock_spreadsheet_id', sheetId);
      localStorage.setItem('stock_spreadsheet_url', url);
      const nowStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
      setLastSyncTime(nowStr);
      localStorage.setItem('stock_last_sync', nowStr);

      await saveCloudSettings({
        spreadsheetId: sheetId,
        spreadsheetUrl: url,
        lastSyncTime: nowStr,
      });

      showNotification('✅ เชื่อมต่อและบันทึกข้อมูล Google Sheet ไปยังคลาวด์เรียบร้อยแล้ว!');
    } catch (err: any) {
      console.error(err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  // Push local data up to Google Sheets (One-Way Export to Google Drive or Webhook)
  const handlePushAllToSheet = async () => {
    const currentWebhook =
      getEffectiveWebhookUrl() || webhookUrl || localStorage.getItem('stock_webhook_url');
    const currentSheetId = spreadsheetId || localStorage.getItem('stock_spreadsheet_id');

    if (!currentWebhook && !currentSheetId) {
      setIsSyncModalOpen(true);
      return;
    }

    setIsSyncing(true);
    try {
      if (currentWebhook) {
        await syncViaWebhook(currentWebhook, {
          materials,
          recipes,
          productions,
          transactions,
          monthlyStockCounts: stockCountRecords,
        }, 'syncAll');
      }

      if (currentSheetId) {
        let currentToken = token || (await getAccessToken());
        if (!currentToken && !currentWebhook) {
          const res = await googleSignIn();
          if (res) {
            currentToken = res.accessToken;
            setUser(res.user);
            setToken(res.accessToken);
          }
        }

        if (currentToken) {
          await initializeSheetDataAndFormulas(
            currentToken,
            currentSheetId,
            materials,
            recipes,
            productions,
            transactions,
            stockCountRecords
          );
        }
      }

      const nowStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
      setLastSyncTime(nowStr);
      localStorage.setItem('stock_last_sync', nowStr);
      saveCloudSettings({ lastSyncTime: nowStr });
      showNotification('✅ ส่งข้อมูลจริงทั้งหมดขึ้น Google Sheet สำเร็จแล้ว!');
    } catch (err: any) {
      console.error(err);
      showNotification(`⚠️ ซิงค์ข้อมูลขัดข้อง: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Pull / Import data from Google Sheet down to Web Application
  const handlePullFromGoogleSheet = async () => {
    const targetWebhook =
      (DEFAULT_WEBHOOK_URL && DEFAULT_WEBHOOK_URL.trim().startsWith('http') ? DEFAULT_WEBHOOK_URL.trim() : null) ||
      webhookUrl ||
      localStorage.getItem('stock_webhook_url');

    const currentSheetId = spreadsheetId || localStorage.getItem('stock_spreadsheet_id');

    if (!targetWebhook && !currentSheetId) {
      setIsSyncModalOpen(true);
      return;
    }

    setIsSyncing(true);
    try {
      let importedCount = 0;

      if (targetWebhook) {
        showNotification('⏳ กำลังดึงข้อมูลจาก Google Sheets Webhook...');
        const sheetData = await fetchDataFromGoogleSheet(targetWebhook);
        if (sheetData) {
          if (sheetData.materials && sheetData.materials.length > 0) {
            const clean = sanitizeMaterials(sheetData.materials);
            setMaterials(clean);
            importedCount += clean.length;
          }
          if (sheetData.recipes && sheetData.recipes.length > 0) {
            const clean = sanitizeRecipes(sheetData.recipes);
            setRecipes(clean);
            importedCount += clean.length;
          }
          if (sheetData.productions && sheetData.productions.length > 0) {
            setProductions(sheetData.productions);
            importedCount += sheetData.productions.length;
          }
          if (sheetData.transactions && sheetData.transactions.length > 0) {
            setTransactions(sheetData.transactions);
            importedCount += sheetData.transactions.length;
          }
          if (sheetData.monthlyStockCounts && sheetData.monthlyStockCounts.length > 0) {
            setStockCountRecords(sheetData.monthlyStockCounts);
            importedCount += sheetData.monthlyStockCounts.length;
          }
        }
      } else if (currentSheetId) {
        let currentToken = token || (await getAccessToken());
        if (!currentToken) {
          const res = await googleSignIn();
          if (res) {
            currentToken = res.accessToken;
            setUser(res.user);
            setToken(res.accessToken);
          }
        }
        if (currentToken) {
          showNotification('⏳ กำลังดึงข้อมูลจาก Google Sheets API...');
          const sheetData = await fetchAllSheetData(currentToken, currentSheetId);
          if (sheetData) {
            if (sheetData.materials && sheetData.materials.length > 0) {
              const clean = sanitizeMaterials(sheetData.materials);
              setMaterials(clean);
              importedCount += clean.length;
            }
            if (sheetData.recipes && sheetData.recipes.length > 0) {
              const clean = sanitizeRecipes(sheetData.recipes);
              setRecipes(clean);
              importedCount += clean.length;
            }
            if (sheetData.productions && sheetData.productions.length > 0) {
              setProductions(sheetData.productions);
              importedCount += sheetData.productions.length;
            }
            if (sheetData.transactions && sheetData.transactions.length > 0) {
              setTransactions(sheetData.transactions);
              importedCount += sheetData.transactions.length;
            }
          }
        }
      }

      const nowStr = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
      setLastSyncTime(nowStr);
      localStorage.setItem('stock_last_sync', nowStr);
      saveCloudSettings({ lastSyncTime: nowStr });

      if (importedCount > 0) {
        showNotification(`✅ ดึงข้อมูลจาก Google Sheets เข้ามาในเว็บสำเร็จ (${importedCount} รายการ)`);
      } else {
        showNotification('ℹ️ เชื่อมต่อ Google Sheet สำเร็จ แต่ยังไม่พบรายการข้อมูลในชีท');
      }
    } catch (err: any) {
      console.error(err);
      showNotification(`⚠️ ไม่สามารถดึงข้อมูลจาก Google Sheet ได้: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Disconnect Sheet
  const handleDisconnectSheet = () => {
    if (window.confirm('คุณต้องการยกเลิกการเชื่อมต่อกับ Google Sheet นี้ใช่หรือไม่? (ข้อมูลในเว็บและในชีทจะไม่ถูกลบ)')) {
      setSpreadsheetId(null);
      setSpreadsheetUrl(null);
      setWebhookUrl(null);
      setLastSyncTime(null);
      localStorage.removeItem('stock_spreadsheet_id');
      localStorage.removeItem('stock_spreadsheet_url');
      localStorage.removeItem('stock_webhook_url');
      localStorage.removeItem('stock_last_sync');
      saveCloudSettings({
        spreadsheetId: null,
        spreadsheetUrl: null,
        webhookUrl: null,
        lastSyncTime: null,
      });
      showNotification('ยกเลิกการเชื่อมต่อกับ Google Sheet เรียบร้อย');
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
        user={user}
        spreadsheetId={spreadsheetId}
        spreadsheetUrl={spreadsheetUrl}
        webhookUrl={webhookUrl}
        autoSyncEnabled={autoSyncEnabled}
        lastSyncTime={lastSyncTime}
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
        onPullFromSheet={handlePullFromGoogleSheet}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
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
            spreadsheetId={spreadsheetId}
            spreadsheetUrl={spreadsheetUrl}
            onOpenSyncModal={() => setIsSyncModalOpen(true)}
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

      <PopupBlockedModal
        isOpen={isPopupBlockedModalOpen}
        onClose={() => setIsPopupBlockedModalOpen(false)}
        onRetry={() => {
          setIsPopupBlockedModalOpen(false);
          handleSignIn();
        }}
        onOpenSyncModal={() => {
          if (!isAdminAuthenticated) {
            handleRequestAdminAuth();
          } else {
            setIsSyncModalOpen(true);
          }
        }}
      />

      <GoogleSheetsSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        user={user}
        spreadsheetId={spreadsheetId}
        spreadsheetUrl={spreadsheetUrl}
        webhookUrl={webhookUrl}
        autoSyncEnabled={autoSyncEnabled}
        onToggleAutoSync={handleToggleAutoSync}
        isSyncing={isSyncing}
        onSaveWebhookUrl={handleSaveWebhookUrl}
        onSignIn={handleSignIn}
        onCreateNewSheet={handleCreateNewSheet}
        onLinkExistingSheet={handleLinkExistingSheet}
        onPushAllToSheet={handlePushAllToSheet}
        onPullFromSheet={handlePullFromGoogleSheet}
        onDisconnectSheet={handleDisconnectSheet}
        materials={materials}
        recipes={recipes}
        productions={productions}
        transactions={transactions}
        stockCountRecords={stockCountRecords}
        onImportExcelData={handleImportExcelData}
      />
    </div>
  );
}
