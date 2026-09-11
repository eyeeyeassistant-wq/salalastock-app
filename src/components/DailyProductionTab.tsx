import React, { useState, useMemo } from 'react';
import {
  DailyProduction,
  BOMRecipe,
  MasterMaterial,
  StockTransaction,
  MasterBranch,
  MonthlyProductionSummary,
} from '../types/stock';
import {
  CalendarCheck,
  Plus,
  Zap,
  Filter,
  Layers,
  Truck,
  Archive,
  ArrowRight,
  Sparkles,
  Edit2,
  Trash2,
  X,
  RotateCcw,
  Store,
  CheckCircle2,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Database,
  RefreshCw,
  FileSpreadsheet,
  Check,
} from 'lucide-react';
import {
  calculateMonthlyProductionSummaries,
  getAvailableMonths,
} from '../utils/calculations';
import { exportMonthlyProductionSummaryToExcel } from '../services/excelExport';
import {
  saveMonthlyProductionSummaries,
  fetchMonthlyProductionSummaries,
} from '../services/supabase';

interface DailyProductionTabProps {
  productions: DailyProduction[];
  recipes: BOMRecipe[];
  materials: MasterMaterial[];
  branches?: MasterBranch[];
  transactions?: StockTransaction[];
  onAddProduction: (prod: DailyProduction) => void;
  onAutoDeductBatch: (production: DailyProduction) => void;
  onOpenNewProdModal: () => void;
  onEditProduction?: (production: DailyProduction, index: number) => void;
  onDeleteProduction?: (target: number | DailyProduction, deleteLinkedTxs?: boolean) => void;
  onManageBranches?: () => void;
  onShowNotification?: (msg: string) => void;
}

const MONTH_NAMES_TH: { [key: string]: string } = {
  '01': 'มกราคม',
  '02': 'กุมภาพันธ์',
  '03': 'มีนาคม',
  '04': 'เมษายน',
  '05': 'พฤษภาคม',
  '06': 'มิถุนายน',
  '07': 'กรกฎาคม',
  '08': 'สิงหาคม',
  '09': 'กันยายน',
  '10': 'ตุลาคม',
  '11': 'พฤศจิกายน',
  '12': 'ธันวาคม',
};

export const DailyProductionTab: React.FC<DailyProductionTabProps> = ({
  productions,
  recipes,
  materials,
  branches = [],
  transactions = [],
  onAddProduction,
  onAutoDeductBatch,
  onOpenNewProdModal,
  onEditProduction,
  onDeleteProduction,
  onManageBranches,
  onShowNotification,
}) => {
  const [subTab, setSubTab] = useState<'daily' | 'monthly_summary'>('daily');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [prodToDelete, setProdToDelete] = useState<{ index: number; prod: DailyProduction } | null>(null);
  const [revertDeductedStock, setRevertDeductedStock] = useState<boolean>(true);

  // Available months for monthly production summary
  const availableMonths = useMemo(() => {
    return getAvailableMonths(productions, transactions);
  }, [productions, transactions]);

  const [selectedSummaryMonth, setSelectedSummaryMonth] = useState<string>(
    availableMonths.length > 0 ? availableMonths[0] : 'all'
  );
  const [isSavingSummary, setIsSavingSummary] = useState<boolean>(false);
  const [isLoadingSavedSummary, setIsLoadingSavedSummary] = useState<boolean>(false);
  const [persistedSummaryData, setPersistedSummaryData] = useState<MonthlyProductionSummary[] | null>(null);

  const formatMonthLabel = (mString: string) => {
    if (mString === 'all') return 'ทุกช่วงเวลา (All Time)';
    const [year, month] = mString.split('-');
    const thaiMonth = MONTH_NAMES_TH[month] || month;
    const thaiYear = parseInt(year, 10) + 543;
    return `${thaiMonth} ${thaiYear} (${mString})`;
  };

  const handlePrevSummaryMonth = () => {
    const idx = availableMonths.indexOf(selectedSummaryMonth);
    if (idx < availableMonths.length - 1 && idx !== -1) {
      setSelectedSummaryMonth(availableMonths[idx + 1]);
      setPersistedSummaryData(null);
    }
  };

  const handleNextSummaryMonth = () => {
    const idx = availableMonths.indexOf(selectedSummaryMonth);
    if (idx > 0) {
      setSelectedSummaryMonth(availableMonths[idx - 1]);
      setPersistedSummaryData(null);
    }
  };

  // Active branches for columns
  const displayBranches = useMemo(() => {
    const list = branches.filter((b) => b.is_active !== false);
    if (list.length > 0) return list;
    return [
      { branch_code: 'BRANCH_A', branch_name: 'สาขา A' },
      { branch_code: 'BRANCH_B', branch_name: 'สาขา B' },
    ];
  }, [branches]);

  // Extract unique products
  const uniqueProducts = Array.from(
    new Set(recipes.map((r) => r.Product_Code))
  ).map((code) => {
    const match = recipes.find((r) => r.Product_Code === code);
    return { code, name: match ? match.Product_Name : code };
  });

  const filteredProductions = productions.filter((p) => {
    if (selectedProduct !== 'all' && p.Product_Code !== selectedProduct) return false;
    if (dateFilter && p.Date !== dateFilter) return false;
    return true;
  });

  const getProductName = (code: string) => {
    const match = recipes.find((r) => r.Product_Code === code);
    return match ? match.Product_Name : code;
  };

  // Monthly Production Summaries Calculation
  const computedMonthlySummaries = useMemo(() => {
    return calculateMonthlyProductionSummaries(
      productions,
      recipes,
      branches,
      selectedSummaryMonth
    );
  }, [productions, recipes, branches, selectedSummaryMonth]);

  const activeMonthlySummaries = persistedSummaryData && selectedSummaryMonth !== 'all'
    ? persistedSummaryData
    : computedMonthlySummaries;

  // Monthly Totals
  const totalMonthlyProduced = useMemo(
    () => activeMonthlySummaries.reduce((sum, s) => sum + s.Total_Produced_Qty, 0),
    [activeMonthlySummaries]
  );

  const totalMonthlyDispatched = useMemo(
    () => activeMonthlySummaries.reduce((sum, s) => sum + s.Total_Dispatched_Qty, 0),
    [activeMonthlySummaries]
  );

  const overallDispatchPercentage = totalMonthlyProduced > 0
    ? Math.round((totalMonthlyDispatched / totalMonthlyProduced) * 100)
    : 0;

  // Branch Totals for Monthly Summary
  const branchMonthlyTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    displayBranches.forEach((b) => {
      totals[b.branch_code] = activeMonthlySummaries.reduce(
        (sum, s) => sum + (s.branch_dispatches?.[b.branch_code] || 0),
        0
      );
    });
    return totals;
  }, [activeMonthlySummaries, displayBranches]);

  // Save to Supabase
  const handleSaveSummaryToSupabase = async () => {
    if (selectedSummaryMonth === 'all') {
      onShowNotification?.('⚠️ กรุณาเลือกเดือนที่ต้องการบันทึกสรุป เช่น 2026-03 ก่อนทำการบันทึก');
      return;
    }
    setIsSavingSummary(true);
    try {
      const ok = await saveMonthlyProductionSummaries(selectedSummaryMonth, activeMonthlySummaries);
      if (ok) {
        onShowNotification?.(`✅ บันทึกผลรวมผลิตเดือน ${selectedSummaryMonth} ลงฐานข้อมูลสำเร็จ (${activeMonthlySummaries.length} เมนู)`);
      } else {
        onShowNotification?.(`⚠️ ไม่สามารถบันทึกลงฐานข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ Supabase`);
      }
    } catch (err: any) {
      onShowNotification?.(`❌ เกิดข้อผิดพลาดในการบันทึก: ${err.message}`);
    } finally {
      setIsSavingSummary(false);
    }
  };

  // Load from Supabase
  const handleLoadSavedSummary = async () => {
    if (selectedSummaryMonth === 'all') {
      onShowNotification?.('⚠️ กรุณาเลือกเดือนที่ต้องการดึงข้อมูลย้อนหลัง');
      return;
    }
    setIsLoadingSavedSummary(true);
    try {
      const data = await fetchMonthlyProductionSummaries(selectedSummaryMonth);
      if (data && data.length > 0) {
        setPersistedSummaryData(data);
        onShowNotification?.(`📥 โหลดข้อมูลผลรวมผลิตเดือน ${selectedSummaryMonth} จากฐานข้อมูลสำเร็จ (${data.length} เมนู)`);
      } else {
        onShowNotification?.(`ℹ️ ไม่พบข้อมูลผลรวมที่เคยบันทึกไว้ในเดือน ${selectedSummaryMonth} ในฐานข้อมูล กำลังแสดงยอดคำนวณสด`);
        setPersistedSummaryData(null);
      }
    } catch (err: any) {
      onShowNotification?.(`❌ เกิดข้อผิดพลาดในการดึงข้อมูล: ${err.message}`);
    } finally {
      setIsLoadingSavedSummary(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub-navigation Switcher: Daily Log vs Monthly Summary */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setSubTab('daily')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md transition-all ${
              subTab === 'daily'
                ? 'bg-white text-blue-700 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarCheck className="w-4 h-4 text-blue-600" />
            <span>บันทึกการผลิตรายวัน (Daily Log)</span>
            <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-slate-200 text-slate-700">
              {filteredProductions.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('monthly_summary')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md transition-all ${
              subTab === 'monthly_summary'
                ? 'bg-white text-emerald-700 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <span>ผลรวมการผลิตแต่ละเมนู & สาขาทั้งเดือน</span>
            <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-emerald-100 text-emerald-800 font-bold">
              {activeMonthlySummaries.length} เมนู
            </span>
          </button>
        </div>

        {subTab === 'daily' && onManageBranches && (
          <div className="flex items-center gap-2">
            <button
              onClick={onManageBranches}
              id="btn-manage-branches"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors"
              title="เพิ่มหรือแก้ไขรายชื่อสาขา"
            >
              <Store className="w-4 h-4 text-blue-600" />
              <span>จัดการสาขา ({displayBranches.length})</span>
            </button>
            <button
              onClick={onOpenNewProdModal}
              id="btn-add-daily-production"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ บันทึกการผลิตและส่งสาขา</span>
            </button>
          </div>
        )}
      </div>

      {subTab === 'daily' ? (
        <>
          {/* Top Banner / Actions */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Product Filter */}
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">สินค้าทั้งหมด ({uniqueProducts.length} รายการ)</option>
                {uniqueProducts.map((prod) => (
                  <option key={prod.code} value={prod.code}>
                    {prod.code} - {prod.name}
                  </option>
                ))}
              </select>

              {/* Date Filter */}
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {dateFilter && (
                <button
                  onClick={() => setDateFilter('')}
                  className="text-xs text-slate-500 hover:text-slate-700 underline"
                >
                  ล้างวันที่
                </button>
              )}
            </div>

            <div className="text-xs text-slate-500 font-medium">
              แสดงรายการบันทึกรายวัน <span className="font-bold text-slate-800">{filteredProductions.length}</span> รายการ
            </div>
          </div>

          {/* Main Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <h2 className="text-sm sm:text-base font-bold text-slate-800">
                  บันทึกการผลิตและยอดจัดส่งสาขา (Daily Production & Dispatch)
                </h2>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium flex-wrap">
                <span className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-blue-600" /> Total_Dispatched (คำนวณอัตโนมัติจากยอดส่งทุกสาขา)
                </span>
                <span className="sm:hidden text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  👉 เลื่อนแนวนอนเพื่อดูครบทุกช่อง
                </span>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[620px]">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[11px] sm:text-xs tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5">วันที่ (Date)</th>
                    <th className="px-4 py-3.5">รหัสสินค้า</th>
                    <th className="px-4 py-3.5">ชื่อสินค้า</th>
                    <th className="px-4 py-3.5 text-right text-slate-900 font-bold">ผลิตจริง (Produced)</th>
                    {displayBranches.map((b) => (
                      <th key={b.branch_code} className="px-4 py-3.5 text-right whitespace-nowrap">
                        ส่ง {b.branch_name}
                      </th>
                    ))}
                    <th className="px-4 py-3.5 text-right font-bold text-slate-900 bg-slate-100/70">
                      รวมส่ง (Dispatched)
                    </th>
                    <th className="px-4 py-3.5 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredProductions.map((p, filteredIdx) => {
                    const originalIndex = productions.findIndex(
                      (item) => (p.id && item.id ? item.id === p.id : (
                        item.Date === p.Date &&
                        (item.Product_Code || '').trim().toUpperCase() === (p.Product_Code || '').trim().toUpperCase() &&
                        Number(item.Produced_Qty) === Number(p.Produced_Qty)
                      ))
                    );
                    const targetIdx = originalIndex >= 0 ? originalIndex : filteredIdx;
                    const rowKey = p.id || `prod_${p.Date}_${p.Product_Code}_${filteredIdx}`;

                    return (
                      <tr key={rowKey} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3.5 font-mono text-slate-700 font-medium whitespace-nowrap text-xs sm:text-sm">
                          {p.Date}
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold text-slate-900 text-xs sm:text-sm">
                          {p.Product_Code}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-slate-900 text-xs sm:text-sm">
                          {getProductName(p.Product_Code)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-blue-700 text-xs sm:text-sm bg-blue-50/30">
                          {p.Produced_Qty.toLocaleString()}
                        </td>
                        {displayBranches.map((b) => {
                          let qty = 0;
                          if (b.branch_code === 'BRANCH_A') {
                            qty = p.Dispatch_Branch_A ?? (p.branch_dispatches?.['BRANCH_A'] || 0);
                          } else if (b.branch_code === 'BRANCH_B') {
                            qty = p.Dispatch_Branch_B ?? (p.branch_dispatches?.['BRANCH_B'] || 0);
                          } else if (p.branch_dispatches && p.branch_dispatches[b.branch_code] !== undefined) {
                            qty = p.branch_dispatches[b.branch_code] || 0;
                          }
                          return (
                            <td key={b.branch_code} className="px-4 py-3.5 text-right font-mono text-slate-700 text-xs sm:text-sm">
                              {Number(qty).toLocaleString()}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900 bg-slate-100/50 text-xs sm:text-sm">
                          {(p.Total_Dispatched || (p.Dispatch_Branch_A || 0) + (p.Dispatch_Branch_B || 0)).toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                            {onEditProduction && (
                              <button
                                onClick={() => onEditProduction(p, targetIdx)}
                                title="แก้ไขรายการผลิตนี้"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors min-h-[32px]"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>แก้ไข</span>
                              </button>
                            )}
                            {(() => {
                              const pCode = (p.Product_Code || '').trim().toUpperCase();
                              const isDeducted = (transactions || []).some((t) => {
                                if (t.Type !== 'Actual Usage') return false;
                                if (p.id && t.productionId === p.id) return true;
                                const isAuto =
                                  (t.Recorder && (t.Recorder.toLowerCase().includes('auto') || t.Recorder.includes('อัตโนมัติ'))) ||
                                  (t.Note && (t.Note.includes('ตัดสต็อก') || t.Note.includes('BOM')));
                                const matchesProduct = t.Note?.includes(pCode) || t.Note?.includes(p.Product_Code);
                                return isAuto && t.Date === p.Date && matchesProduct;
                              });

                              return isDeducted ? (
                                <button
                                  onClick={() => onAutoDeductBatch(p)}
                                  title="ตัดสต็อกไปแล้ว (คลิกเพื่อคำนวณใหม่และอัปเดตยอด)"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-colors min-h-[32px]"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>ตัดสต็อกแล้ว</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => onAutoDeductBatch(p)}
                                  title="กดเพื่อตัดสต็อกวัตถุดิบตามสูตร BOM x ยอดผลิตลงใน Stock_Transactions"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors min-h-[32px]"
                                >
                                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                                  <span>ตัดสต็อก</span>
                                </button>
                              );
                            })()}
                            {onDeleteProduction && (
                              <button
                                onClick={() => setProdToDelete({ index: targetIdx, prod: p })}
                                title="ลบรายการนี้"
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredProductions.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm">
                ยังไม่มีรายการบันทึกการผลิตในเงื่อนไขที่เลือก
              </div>
            )}
          </div>
        </>
      ) : (
        /* Monthly Production Summary per Menu & Branch (User Explicit Request) */
        <div className="space-y-4 animate-in fade-in">
          {/* Month Selector & Action Controls */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1">
                <button
                  type="button"
                  onClick={handlePrevSummaryMonth}
                  disabled={availableMonths.indexOf(selectedSummaryMonth) >= availableMonths.length - 1 || selectedSummaryMonth === 'all'}
                  className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30 transition-all"
                  title="เดือนก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1.5 px-2">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <select
                    value={selectedSummaryMonth}
                    onChange={(e) => {
                      setSelectedSummaryMonth(e.target.value);
                      setPersistedSummaryData(null);
                    }}
                    className="text-xs sm:text-sm font-bold bg-transparent text-slate-800 focus:outline-none cursor-pointer"
                  >
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>
                        {formatMonthLabel(m)}
                      </option>
                    ))}
                    <option value="all">รวมทุกช่วงเวลา (All Time)</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleNextSummaryMonth}
                  disabled={availableMonths.indexOf(selectedSummaryMonth) <= 0 || selectedSummaryMonth === 'all'}
                  className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30 transition-all"
                  title="เดือนถัดไป"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {persistedSummaryData && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  <Check className="w-3 h-3 text-blue-600" />
                  ข้อมูลที่บันทึกไว้ใน Supabase
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleLoadSavedSummary}
                disabled={isLoadingSavedSummary || selectedSummaryMonth === 'all'}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors disabled:opacity-50"
                title="ดึงข้อมูลย้อนหลังที่เคยบันทึกไว้ในฐานข้อมูล Supabase"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isLoadingSavedSummary ? 'animate-spin' : ''}`} />
                <span>โหลดข้อมูลที่บันทึก</span>
              </button>
              <button
                type="button"
                onClick={handleSaveSummaryToSupabase}
                disabled={isSavingSummary || selectedSummaryMonth === 'all'}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50 shadow-xs"
                title="บันทึกผลรวมการผลิตของเดือนนี้ลงฐานข้อมูล Supabase สำหรับดูย้อนหลัง"
              >
                {isSavingSummary ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                <span>บันทึกลงฐานข้อมูล</span>
              </button>
              <button
                type="button"
                onClick={() => exportMonthlyProductionSummaryToExcel(activeMonthlySummaries, displayBranches, selectedSummaryMonth)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 transition-colors"
                title="ดาวน์โหลดไฟล์ Excel ผลรวมการผลิต"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>ส่งออก Excel</span>
              </button>
            </div>
          </div>

          {/* Metric Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>ยอดผลิตรวมทั้งเดือน</span>
                <span className="p-1 rounded bg-blue-50 text-blue-600 font-bold text-[10px]">PRODUCED</span>
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
                {totalMonthlyProduced.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">ชิ้น (คำนวณรวมทั้งเดือน)</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>รวมยอดจัดส่งทุกสาขา</span>
                <span className="p-1 rounded bg-emerald-50 text-emerald-600 font-bold text-[10px]">DISPATCHED</span>
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700">
                {totalMonthlyDispatched.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">ชิ้น (ส่งถึงหน้าร้านสาขา)</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>จำนวนเมนูที่ผลิต</span>
                <span className="p-1 rounded bg-indigo-50 text-indigo-600 font-bold text-[10px]">MENUS</span>
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
                {activeMonthlySummaries.length}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">รายการสินค้าที่เดินสายผลิต</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>สัดส่วนกระจายสินค้า</span>
                <span className="p-1 rounded bg-teal-50 text-teal-600 font-bold text-[10px]">RATE</span>
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-teal-700">
                {overallDispatchPercentage}%
              </div>
              <p className="text-[11px] text-slate-500 mt-1">เทียบยอดส่งกับยอดผลิต</p>
            </div>
          </div>

          {/* Monthly Production Summary Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600 shrink-0" />
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  ผลรวมการผลิตแต่ละเมนูและยอดส่งสาขาทั้งเดือน ({formatMonthLabel(selectedSummaryMonth)})
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                * ไม่รวมสินค้าเหลือ/ของเสียหน้าร้านคืน และไม่รวมต้นทุนต่อหน่วย
              </span>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[720px]">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[11px] sm:text-xs tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5 text-center w-12">ลำดับ</th>
                    <th className="px-4 py-3.5">รหัสสินค้า</th>
                    <th className="px-4 py-3.5">ชื่อเมนู / สินค้า</th>
                    <th className="px-4 py-3.5 text-right text-slate-900 font-bold bg-blue-50/50">
                      ผลิตรวมทั้งเดือน (ชิ้น)
                    </th>
                    {displayBranches.map((b) => (
                      <th key={b.branch_code} className="px-4 py-3.5 text-right whitespace-nowrap">
                        ส่ง {b.branch_name}
                      </th>
                    ))}
                    <th className="px-4 py-3.5 text-right font-bold text-slate-900 bg-emerald-50/50">
                      รวมส่งทุกสาขา
                    </th>
                    <th className="px-4 py-3.5 text-center whitespace-nowrap">
                      วันที่ผลิต (วัน)
                    </th>
                    <th className="px-4 py-3.5 text-center">
                      สัดส่วนกระจายสินค้า
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {activeMonthlySummaries.map((s, idx) => {
                    return (
                      <tr key={s.Product_Code} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5 text-center text-slate-400 font-mono text-xs">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold text-slate-900 text-xs sm:text-sm">
                          {s.Product_Code}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-slate-900 text-xs sm:text-sm">
                          {s.Product_Name}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-blue-700 text-xs sm:text-sm bg-blue-50/30">
                          {s.Total_Produced_Qty.toLocaleString()}
                        </td>
                        {displayBranches.map((b) => {
                          const qty = s.branch_dispatches?.[b.branch_code] || 0;
                          const sharePct = s.Total_Produced_Qty > 0
                            ? Math.round((qty / s.Total_Produced_Qty) * 100)
                            : 0;
                          return (
                            <td key={b.branch_code} className="px-4 py-3.5 text-right font-mono text-slate-700 text-xs sm:text-sm">
                              <div>{qty.toLocaleString()}</div>
                              {qty > 0 && (
                                <div className="text-[10px] text-slate-400 font-normal">
                                  ({sharePct}%)
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-800 bg-emerald-50/30 text-xs sm:text-sm">
                          {s.Total_Dispatched_Qty.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-center font-mono text-slate-600 text-xs sm:text-sm">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 font-medium">
                            {s.Days_Produced_Count} วัน
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                              s.Dispatch_Percentage >= 100
                                ? 'bg-emerald-100 text-emerald-800'
                                : s.Dispatch_Percentage >= 80
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {s.Dispatch_Percentage}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {/* Grand Total Row */}
                {activeMonthlySummaries.length > 0 && (
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 text-xs sm:text-sm">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right uppercase tracking-wider font-extrabold text-slate-700">
                        รวมทั้งหมด (Grand Total):
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-blue-800 font-black bg-blue-100/50">
                        {totalMonthlyProduced.toLocaleString()}
                      </td>
                      {displayBranches.map((b) => (
                        <td key={b.branch_code} className="px-4 py-3 text-right font-mono text-slate-800">
                          {(branchMonthlyTotals[b.branch_code] || 0).toLocaleString()}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right font-mono text-emerald-800 font-black bg-emerald-100/50">
                        {totalMonthlyDispatched.toLocaleString()}
                      </td>
                      <td colSpan={2} className="px-4 py-3 text-center text-slate-600 font-normal text-xs">
                        เฉลี่ยกระจายสินค้า {overallDispatchPercentage}%
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {activeMonthlySummaries.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-sm">
                ไม่พบข้อมูลการผลิตในเดือน {formatMonthLabel(selectedSummaryMonth)}
              </div>
            )}
          </div>

          {/* Scope notice card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-slate-900 mb-0.5">
                การจัดเก็บผลรวมการผลิตและการดูข้อมูลย้อนหลัง
              </h4>
              <p className="text-slate-600 leading-relaxed">
                ระบบคำนวณผลรวมยอดผลิตและยอดส่งแต่ละสาขาทั้งเดือนจากข้อมูลการผลิตประจำวันอัตโนมัติ โดยยกเว้นยอดสินค้าเหลือ/ของเสียหน้าร้านคืนจากสาขา และยกเว้นราคาและต้นทุนต่อหน่วยของวัตถุดิบตามที่ต้องการ และสามารถกดปุ่ม <strong>"บันทึกลงฐานข้อมูล"</strong> เพื่อบันทึกลงตาราง <code className="bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono text-emerald-700 font-bold">monthly_production_summary</code> ใน Supabase สำหรับเปิดดูย้อนหลังได้ตลอดเวลา
              </p>
            </div>
          </div>
        </div>
      )}

      {/* In-App Delete Production Confirmation Modal */}
      {prodToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-rose-50 border-b border-rose-100 p-5 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  ยืนยันการลบรายการผลิต
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ระบบจะลบรายการนี้ออกจาก Daily_Production ทันที
                </p>
              </div>
              <button
                onClick={() => setProdToDelete(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">วันที่ผลิต:</span>
                  <span className="font-semibold text-slate-800">{prodToDelete.prod.Date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">รหัสสินค้า:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {prodToDelete.prod.Product_Code}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ยอดผลิต:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {prodToDelete.prod.Produced_Qty.toLocaleString()} ชิ้น
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ยอดส่งสาขา A / B:</span>
                  <span className="font-mono text-slate-700">
                    {prodToDelete.prod.Dispatch_Branch_A} / {prodToDelete.prod.Dispatch_Branch_B}
                  </span>
                </div>
              </div>

              {/* Linked Auto-Deducted Transactions Section */}
              {(() => {
                const prod = prodToDelete.prod;
                const pCode = (prod.Product_Code || '').trim().toUpperCase();
                const linkedTxs = (transactions || []).filter((t) => {
                  if (prod.id && t.productionId === prod.id) return true;
                  const isDateMatch = t.Date === prod.Date;
                  const isUsage = t.Type === 'Actual Usage';
                  const isAutoDeductNote =
                    (t.Recorder && (t.Recorder.toLowerCase().includes('auto') || t.Recorder.includes('อัตโนมัติ'))) ||
                    (t.Note && (t.Note.includes('ตัดสต็อก') || t.Note.includes('BOM') || t.Note.includes(pCode) || (prod.Product_Code && t.Note.includes(prod.Product_Code))));
                  return isDateMatch && isUsage && isAutoDeductNote;
                });

                if (linkedTxs.length === 0) return null;

                return (
                  <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-xs space-y-2">
                    <div className="flex items-start gap-2">
                      <RotateCcw className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-amber-900">
                          ตรวจพบรายการตัดสต็อกวัตถุดิบ ({linkedTxs.length} รายการ)
                        </div>
                        <div className="text-slate-600 text-[11px] mt-0.5">
                          ยอดนี้ถูกหักออกจากสต็อกไปแล้วเมื่อบันทึกการผลิต
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/90 border border-amber-100 rounded-lg p-2 max-h-24 overflow-y-auto space-y-1">
                      {linkedTxs.map((tx, idx) => {
                        const mat = materials.find((m) => m.RM_Code === tx.RM_Code);
                        return (
                          <div key={idx} className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-700 font-medium">
                              {mat ? `${mat.RM_Name} (${tx.RM_Code})` : tx.RM_Code}
                            </span>
                            <span className="font-mono font-bold text-rose-600">
                              -{tx.Qty.toLocaleString()} {mat?.Unit || 'หน่วย'}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={revertDeductedStock}
                        onChange={(e) => setRevertDeductedStock(e.target.checked)}
                        className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                      />
                      <span className="text-xs font-bold text-amber-950">
                        ยกเลิกการตัดสต็อก & คืนยอดวัตถุดิบเข้าคลังอัตโนมัติ
                      </span>
                    </label>
                  </div>
                );
              })()}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setProdToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteProduction) {
                    onDeleteProduction(prodToDelete.prod, revertDeductedStock);
                  }
                  setProdToDelete(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ยืนยันลบรายการ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Card on ARRAYFORMULA */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 text-xs text-slate-800 shadow-xs flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-bold text-slate-900 mb-1">
            เทคนิค Google Sheets ARRAYFORMULA ใน Tab Daily_Production
          </h4>
          <p className="text-slate-600 leading-relaxed">
            ใน Google Sheets รวมยอดส่งสาขา A + B อัตโนมัติโดยใส่สูตรไว้ที่ Row 1 ในส่วน Header:
          </p>
          <div className="mt-2">
            <code className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] block text-slate-800 max-w-xl">
              <span className="text-blue-600 font-bold">Total_Dispatched (Row 1):</span>
              <br />
              {`={"Total_Dispatched"; ARRAYFORMULA(IF(A2:A="", "", N(D2:D) + N(E2:E)))}`}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};
