import React, { useState, useMemo } from 'react';
import {
  MonthlyStockSummary,
  MasterMaterial,
  BOMRecipe,
  DailyProduction,
  StockTransaction,
  MonthlyStockCountRecord,
} from '../types/stock';
import {
  getAvailableMonths,
  generateMonthlySummaryForPeriod,
} from '../utils/calculations';
import { exportMonthlySummaryToExcel } from '../services/excelExport';
import {
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Search,
  SlidersHorizontal,
  Info,
  Layers,
  ArrowUpDown,
  Download,
  HelpCircle,
  ClipboardCheck,
  FileSpreadsheet,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Scale,
  Sparkles,
} from 'lucide-react';

interface MonthlySummaryTabProps {
  summaries: MonthlyStockSummary[];
  materials: MasterMaterial[];
  recipes: BOMRecipe[];
  productions: DailyProduction[];
  transactions: StockTransaction[];
  stockCountRecords?: MonthlyStockCountRecord[];
  onOpenFormulaGuide: () => void;
  onOpenStockCountModal?: () => void;
  onSelectMaterialDetail: (rmCode: string) => void;
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

export const MonthlySummaryTab: React.FC<MonthlySummaryTabProps> = ({
  summaries: initialSummaries,
  materials,
  recipes,
  productions,
  transactions,
  stockCountRecords = [],
  onOpenFormulaGuide,
  onOpenStockCountModal,
  onSelectMaterialDetail,
}) => {
  // Available months
  const availableMonths = useMemo(
    () => getAvailableMonths(productions, transactions),
    [productions, transactions]
  );

  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'lowStock' | 'overused' | 'normal'>('all');
  const [sortField, setSortField] = useState<keyof MonthlyStockSummary>('RM_Code');
  const [sortAsc, setSortAsc] = useState(true);

  // Month navigation helper
  const handlePrevMonth = () => {
    const idx = availableMonths.indexOf(selectedMonth);
    if (idx < availableMonths.length - 1 && idx !== -1) {
      setSelectedMonth(availableMonths[idx + 1]);
    }
  };

  const handleNextMonth = () => {
    const idx = availableMonths.indexOf(selectedMonth);
    if (idx > 0) {
      setSelectedMonth(availableMonths[idx - 1]);
    }
  };

  const formatMonthLabel = (mString: string) => {
    if (mString === 'all') return 'ทุกช่วงเวลา (All Time)';
    const [year, month] = mString.split('-');
    const thaiMonth = MONTH_NAMES_TH[month] || month;
    const thaiYear = parseInt(year, 10) + 543;
    return `${thaiMonth} ${thaiYear} (${mString})`;
  };

  // Physical count map for selected month
  const physicalCountsMap = useMemo(() => {
    const map: { [rmCode: string]: number } = {};
    const relevantRecords =
      selectedMonth === 'all'
        ? stockCountRecords
        : stockCountRecords.filter((r) => r.Month === selectedMonth);

    relevantRecords.forEach((r) => {
      (r.Items || []).forEach((it) => {
        if (it && it.RM_Code) {
          map[it.RM_Code.trim().toUpperCase()] = Number(it.Counted_Qty) || 0;
        }
      });
    });
    return Object.keys(map).length > 0 ? map : undefined;
  }, [stockCountRecords, selectedMonth]);

  // Current summaries computed for the selected period
  const activeSummaries = useMemo(() => {
    return generateMonthlySummaryForPeriod(
      materials,
      recipes,
      productions,
      transactions,
      selectedMonth,
      physicalCountsMap
    );
  }, [materials, recipes, productions, transactions, selectedMonth, physicalCountsMap]);

  // High-level aggregate totals
  const totalActualUsage = useMemo(
    () => activeSummaries.reduce((sum, s) => sum + s.Actual_Usage, 0),
    [activeSummaries]
  );
  const totalExpectedUsage = useMemo(
    () => activeSummaries.reduce((sum, s) => sum + s.Expected_Usage, 0),
    [activeSummaries]
  );
  const totalVariance = totalActualUsage - totalExpectedUsage;

  // Filtered & Sorted Summaries
  const filteredSummaries = useMemo(() => {
    return activeSummaries
      .filter((item) => {
        const matchSearch =
          item.RM_Code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.RM_Name.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchSearch) return false;

        if (statusFilter === 'lowStock') return item.isLowStock;
        if (statusFilter === 'overused') return item.isOverused;
        if (statusFilter === 'normal') return !item.isLowStock && !item.isOverused;

        return true;
      })
      .sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortAsc ? valA - valB : valB - valA;
        }
        return sortAsc
          ? String(valA ?? '').localeCompare(String(valB ?? ''))
          : String(valB ?? '').localeCompare(String(valA ?? ''));
      });
  }, [activeSummaries, searchTerm, statusFilter, sortField, sortAsc]);

  const handleSort = (field: keyof MonthlyStockSummary) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const getSafetyStock = (rmCode: string) => {
    const m = materials.find(
      (mat) => (mat.RM_Code || '').trim().toUpperCase() === (rmCode || '').trim().toUpperCase()
    );
    return m ? m.Safety_Stock : 0;
  };

  return (
    <div className="space-y-5">
      {/* Top Banner Alert if low stock exists */}
      {activeSummaries.some((s) => s.isLowStock) && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-red-900 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-900">
                มีวัตถุดิบ {activeSummaries.filter((s) => s.isLowStock).length} รายการที่ต่ำกว่าจุดสั่งซื้อขั้นต่ำ (Safety Stock)
              </h3>
              <p className="text-xs text-red-700 mt-0.5">
                กรุณาตรวจสอบและสั่งซื้อวัตถุดิบเพื่อป้องกันการขาดแคลนในสายการผลิต
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('lowStock')}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors"
          >
            กรองดูรายการใกล้หมด
          </button>
        </div>
      )}

      {/* Overview Comparison Summary Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Scale className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                สรุปสต๊อกสิ้นเดือนและการเทียบยอดตามสูตร (BOM Reconciliation)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                เปรียบเทียบยอดเบิกใช้จริง (Actual Usage) กับยอดที่ควรใช้ตามสูตร BOM (Expected Usage)
              </p>
            </div>
          </div>

          {/* Month Selector Filter */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-xs">
              <button
                type="button"
                onClick={handlePrevMonth}
                disabled={
                  selectedMonth === 'all' ||
                  availableMonths.indexOf(selectedMonth) >= availableMonths.length - 1
                }
                className="p-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-500 rounded-lg hover:bg-slate-200/60 transition-colors"
                title="เดือนก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 px-2">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="all">ทุกช่วงเวลา (All Time)</option>
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>
                      {formatMonthLabel(m)}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                disabled={selectedMonth === 'all' || availableMonths.indexOf(selectedMonth) <= 0}
                className="p-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-500 rounded-lg hover:bg-slate-200/60 transition-colors"
                title="เดือนถัดไป"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => exportMonthlySummaryToExcel(filteredSummaries, `Monthly_Summary_${selectedMonth}`)}
              title="ดาวน์โหลดตารางสรุปสต็อกและ Variance เป็นไฟล์ Excel (.xlsx)"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">ดาวน์โหลด Excel</span>
            </button>
          </div>
        </div>

        {/* 3 Quick Summary KPI Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
          <div className="p-3 bg-purple-50/60 border border-purple-200/70 rounded-xl">
            <span className="text-[11px] font-semibold text-purple-700">ยอดที่ควรใช้ตามสูตร (Expected BOM)</span>
            <div className="text-base sm:text-lg font-bold font-mono text-purple-900 mt-0.5">
              {totalExpectedUsage.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-purple-600/80 mt-0.5">คำนวณจาก (ยอดผลิต x Standard Qty ในสูตร BOM)</p>
          </div>

          <div className="p-3 bg-blue-50/60 border border-blue-200/70 rounded-xl">
            <span className="text-[11px] font-semibold text-blue-700">ยอดเบิกใช้จริง (Actual Usage)</span>
            <div className="text-base sm:text-lg font-bold font-mono text-blue-900 mt-0.5">
              {totalActualUsage.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-blue-600/80 mt-0.5">ผลรวมจากรายการเบิกใช้วัตถุดิบจริงในระบบ</p>
          </div>

          <div
            className={`p-3 rounded-xl border ${
              totalVariance > 0.001
                ? 'bg-rose-50/60 border-rose-200 text-rose-900'
                : totalVariance < -0.001
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          >
            <span className="text-[11px] font-semibold flex items-center justify-between">
              <span>ผลต่างรวม (Total Variance)</span>
              {totalVariance > 0.001 ? (
                <span className="text-[10px] bg-rose-200 text-rose-800 px-1.5 py-0.5 rounded font-bold">เบิกเกินสูตร</span>
              ) : totalVariance < -0.001 ? (
                <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded font-bold">ประหยัดกว่าสูตร</span>
              ) : (
                <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">ตรงตามสูตร</span>
              )}
            </span>
            <div className="text-base sm:text-lg font-bold font-mono mt-0.5">
              {totalVariance > 0 ? `+${totalVariance.toFixed(2)}` : totalVariance.toFixed(2)}
            </div>
            <p className="text-[10px] opacity-80 mt-0.5">Actual Usage - Expected Usage</p>
          </div>
        </div>
      </div>

      {/* Control Bar (Search, Filter, Actions) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อหรือรหัสวัตถุดิบ (เช่น RM001, แป้ง)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-medium text-slate-600">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
              }`}
            >
              ทั้งหมด ({activeSummaries.length})
            </button>
            <button
              onClick={() => setStatusFilter('lowStock')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                statusFilter === 'lowStock'
                  ? 'bg-red-600 text-white shadow-xs font-semibold'
                  : 'hover:text-red-600'
              }`}
            >
              ใกล้หมด ({activeSummaries.filter((s) => s.isLowStock).length})
            </button>
            <button
              onClick={() => setStatusFilter('overused')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                statusFilter === 'overused'
                  ? 'bg-amber-600 text-white shadow-xs font-semibold'
                  : 'hover:text-amber-600'
              }`}
            >
              เบิกเกินเกณฑ์ ({activeSummaries.filter((s) => s.isOverused).length})
            </button>
          </div>

          {onOpenStockCountModal && (
            <button
              onClick={onOpenStockCountModal}
              id="btn-monthly-stock-count"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-all active:scale-95"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>เช็คสต็อกจริงสิ้นเดือน</span>
            </button>
          )}

          <button
            onClick={onOpenFormulaGuide}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-300 hover:bg-slate-100 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
            <span>สูตร Google Sheets</span>
          </button>
        </div>
      </div>

      {/* Main Table: Tab "Monthly_Stock_Summary" */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600 shrink-0" />
            <h2 className="text-sm sm:text-base font-bold text-slate-800">
              ตารางสรุปสต๊อกและผลต่างวัตถุดิบ ({formatMonthLabel(selectedMonth)})
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className="sm:hidden text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              👉 ปัดซ้าย-ขวาเพื่อดูผลต่าง Variance
            </span>
            <span className="hidden sm:inline">สูตรคำนวณอัตโนมัติ 10 คอลัมน์</span>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[850px]">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[11px] sm:text-xs tracking-wider border-b border-slate-200">
              <tr>
                <th
                  onClick={() => handleSort('RM_Code')}
                  className="px-4 py-3.5 cursor-pointer hover:bg-slate-100"
                >
                  <div className="flex items-center gap-1">
                    RM_Code <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('RM_Name')}
                  className="px-4 py-3.5 cursor-pointer hover:bg-slate-100"
                >
                  <div className="flex items-center gap-1">
                    RM_Name <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="px-3 py-3.5 text-center">Unit</th>
                <th
                  onClick={() => handleSort('Opening_Stock')}
                  className="px-3.5 py-3.5 text-right cursor-pointer hover:bg-slate-100"
                >
                  <div className="flex items-center justify-end gap-1">
                    Opening <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('Total_Receive')}
                  className="px-3.5 py-3.5 text-right cursor-pointer hover:bg-slate-100 text-emerald-700"
                >
                  <div className="flex items-center justify-end gap-1">
                    Total_Receive <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('Actual_Usage')}
                  className="px-3.5 py-3.5 text-right cursor-pointer hover:bg-slate-100 text-blue-700"
                >
                  <div className="flex items-center justify-end gap-1">
                    Actual_Usage <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('Expected_Usage')}
                  className="px-3.5 py-3.5 text-right cursor-pointer hover:bg-slate-100 text-purple-700"
                >
                  <div className="flex items-center justify-end gap-1">
                    Expected_Usage <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('Ending_Stock')}
                  className="px-3.5 py-3.5 text-right cursor-pointer hover:bg-slate-100 font-bold text-slate-900"
                >
                  <div className="flex items-center justify-end gap-1">
                    Ending_Stock <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('Variance')}
                  className="px-3.5 py-3.5 text-right cursor-pointer hover:bg-slate-100"
                >
                  <div className="flex items-center justify-end gap-1">
                    Variance <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="px-4 py-3.5 text-center">Stock_Status</th>
                <th className="px-3 py-3.5 text-center">วิเคราะห์</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredSummaries.map((item) => {
                const safetyStock = getSafetyStock(item.RM_Code);
                const isOverused = item.Variance > 0.001;
                const isUnderused = item.Variance < -0.001;

                return (
                  <tr
                    key={item.RM_Code}
                    className={`transition-colors ${
                      item.isLowStock
                        ? 'bg-red-50/30 hover:bg-red-50 text-red-900'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* RM_Code */}
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-900 text-xs sm:text-sm">
                      {item.RM_Code}
                    </td>

                    {/* RM_Name */}
                    <td className="px-4 py-3.5 font-medium text-slate-900 text-xs sm:text-sm">
                      <div className="font-semibold text-slate-900">{item.RM_Name}</div>
                      <div className="text-[11px] text-slate-400 font-normal">
                        จุดสั่งซื้อ Safety: {safetyStock} {item.Unit}
                      </div>
                    </td>

                    {/* Unit */}
                    <td className="px-3 py-3.5 text-center text-slate-600 font-mono text-xs sm:text-sm">
                      {item.Unit}
                    </td>

                    {/* Opening_Stock */}
                    <td className="px-3.5 py-3.5 text-right font-mono text-slate-700 text-xs sm:text-sm">
                      {item.Opening_Stock.toLocaleString()}
                    </td>

                    {/* Total_Receive */}
                    <td className="px-3.5 py-3.5 text-right font-mono font-bold text-emerald-700 text-xs sm:text-sm">
                      +{item.Total_Receive.toLocaleString()}
                    </td>

                    {/* Actual_Usage */}
                    <td className="px-3.5 py-3.5 text-right font-mono font-bold text-blue-700 text-xs sm:text-sm">
                      {item.Actual_Usage.toLocaleString()}
                    </td>

                    {/* Expected_Usage */}
                    <td className="px-3.5 py-3.5 text-right font-mono font-bold text-purple-700 text-xs sm:text-sm">
                      {item.Expected_Usage.toLocaleString()}
                    </td>

                    {/* Ending_Stock (Highlighted if Low Stock) */}
                    <td
                      className={`px-3.5 py-3.5 text-right font-mono font-bold text-xs sm:text-sm ${
                        item.isLowStock
                          ? 'text-red-600 bg-red-50/50'
                          : 'text-slate-900'
                      }`}
                    >
                      {item.Ending_Stock.toLocaleString()}
                    </td>

                    {/* Variance (Highlighted if Overused > 0 in red pill, < 0 in green pill) */}
                    <td className="px-3.5 py-3.5 text-right font-mono font-medium">
                      {isOverused ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-md text-[11px] font-bold">
                          <TrendingUp className="w-3 h-3" />
                          +{item.Variance.toLocaleString()} (สูญเสีย)
                        </span>
                      ) : isUnderused ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-md text-[11px] font-bold">
                          <TrendingDown className="w-3 h-3" />
                          {item.Variance.toLocaleString()} (ประหยัด)
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs font-mono">0.00 (ตรงสูตร)</span>
                      )}
                    </td>

                    {/* Stock_Status */}
                    <td className="px-4 py-3.5 text-center">
                      {item.isLowStock ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                          ใกล้หมด
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ปกติ
                        </span>
                      )}
                    </td>

                    {/* Action Detail */}
                    <td className="px-3 py-3.5 text-center">
                      <button
                        onClick={() => onSelectMaterialDetail(item.RM_Code)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors min-h-[32px]"
                        title="ดูที่มาการคำนวณและประวัติ"
                      >
                        <Info className="w-3.5 h-3.5" />
                        <span>วิเคราะห์</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredSummaries.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-sm">
            ไม่พบรายการวัตถุดิบที่ตรงกับเงื่อนไขการค้นหา
          </div>
        )}

        {/* Bottom Formula Guide Bar */}
        <div className="bg-[#0f172a] p-4 text-white font-mono text-[10px] sm:text-xs leading-relaxed border-t border-slate-800">
          <div className="space-y-1.5">
            <div>
              <span className="text-blue-400 font-bold uppercase mr-2">[Total_Receive]:</span>
              <span className="text-slate-300">=SUMIFS(Stock_Transactions!D:D, Stock_Transactions!C:C, A2, Stock_Transactions!B:B, "Receive")</span>
            </div>
            <div>
              <span className="text-purple-400 font-bold uppercase mr-2">[Expected_Usage]:</span>
              <span className="text-slate-300">=SUMPRODUCT(SUMIF(Daily_Production!B:B, BOM_Recipe!A:A, Daily_Production!C:C), (BOM_Recipe!C:C = A2) * BOM_Recipe!D:D)</span>
            </div>
            <div>
              <span className="text-emerald-400 font-bold uppercase mr-2">[Ending_Stock & Variance]:</span>
              <span className="text-slate-300">Ending = D2 + E2 - F2 | Variance = F2 - G2 (ค่า + = เบิกเกินสูตร/มี Waste, ค่า - = เบิกประหยัด)</span>
            </div>
            <div>
              <span className="text-amber-400 font-bold uppercase mr-2">[Stock_Status Rule]:</span>
              <span className="text-slate-300">=IF(H2 &lt;= XLOOKUP(A2, Master_Materials!A:A, Master_Materials!E:E, 0), "⚠️ วัตถุดิบใกล้หมด", "ปกติ")</span>
            </div>
          </div>
        </div>
      </div>

      {/* Formula & Rule Explanations Legend */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Box 1: การคำนวณหลัก */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 text-xs text-slate-700 space-y-2 shadow-xs">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <Info className="w-4 h-4 text-blue-600" />
            <span>หลักการเทียบยอดเบิกใช้จริง vs ยอดตามสูตร BOM</span>
          </div>
          <ul className="space-y-1.5 text-slate-600 list-disc list-inside">
            <li>
              <strong className="text-slate-800">Expected_Usage (ยอดตามสูตร BOM)</strong>: ผลรวมของ (ยอดผลิตจริง Produced_Qty x Standard_Qty ในสูตร BOM ของสินค้านั้น)
            </li>
            <li>
              <strong className="text-slate-800">Actual_Usage (ยอดเบิกจริง)</strong>: ผลรวมของรายการเบิกในคลัง (Stock_Transactions ประเภท Actual Usage)
            </li>
            <li>
              <strong className="text-slate-800">Variance (ผลต่างการเบิกใช้)</strong> = Actual_Usage - Expected_Usage
              <span className="block pl-4 text-slate-500">
                • ค่า <strong>+</strong> = เบิกเกินเกณฑ์ (มีของเสีย / Waste ในการผลิต)
                <br />
                • ค่า <strong>-</strong> = เบิกประหยัดกว่าสูตร (เกิดประสิทธิภาพสูง)
                <br />
                • ค่า <strong>0.00</strong> = เบิกตรงตามสูตร 100%
              </span>
            </li>
          </ul>
        </div>

        {/* Box 2: เงื่อนไขการแจ้งเตือน */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 text-xs text-slate-700 space-y-2 shadow-xs">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>เงื่อนไขการแจ้งเตือนและระบบตัดสต็อก</span>
          </div>
          <ul className="space-y-1.5 text-slate-600 list-disc list-inside">
            <li>
              <strong className="text-red-700">⚠️ วัตถุดิบใกล้หมด</strong>: เมื่อ Ending_Stock &le; Safety_Stock ในตาราง Master_Materials
            </li>
            <li>
              <strong className="text-green-700">ปกติ</strong>: เมื่อ Ending_Stock &gt; Safety_Stock
            </li>
            <li>
              <strong className="text-blue-700">ระบบตัดสต็อกอัตโนมัติ (Auto BOM)</strong>: สามารถกดปุ่ม "ตัดสต็อก" ในแท็บ Daily Production เพื่อคำนวณและสร้างรายการ Actual Usage ตามสูตร BOM ลงในคลังอัตโนมัติ
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

