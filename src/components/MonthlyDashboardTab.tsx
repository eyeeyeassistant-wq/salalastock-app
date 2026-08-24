import React, { useState, useMemo } from 'react';
import {
  MonthlyStockSummary,
  MasterMaterial,
  BOMRecipe,
  DailyProduction,
  StockTransaction,
} from '../types/stock';
import {
  getAvailableMonths,
  generateMonthlySummaryForPeriod,
} from '../utils/calculations';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  Store,
  Package,
  ArrowRight,
  Download,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info,
  Building2,
  AlertCircle,
  Truck,
  RotateCcw,
  FileSpreadsheet,
  ExternalLink,
} from 'lucide-react';

interface MonthlyDashboardTabProps {
  materials: MasterMaterial[];
  recipes: BOMRecipe[];
  productions: DailyProduction[];
  transactions: StockTransaction[];
  spreadsheetId?: string | null;
  spreadsheetUrl?: string | null;
  onOpenSyncModal?: () => void;
  onOpenFormulaGuide: () => void;
  onSelectMaterialDetail: (rmCode: string) => void;
  onNavigateToTab: (tabName: any) => void;
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

export const MonthlyDashboardTab: React.FC<MonthlyDashboardTabProps> = ({
  materials,
  recipes,
  productions,
  transactions,
  spreadsheetId,
  spreadsheetUrl,
  onOpenSyncModal,
  onOpenFormulaGuide,
  onSelectMaterialDetail,
  onNavigateToTab,
}) => {
  // Available months
  const availableMonths = useMemo(
    () => getAvailableMonths(productions, transactions),
    [productions, transactions]
  );

  // Selected Month state (defaults to the most recent month or 'all')
  const [selectedMonth, setSelectedMonth] = useState<string>(
    availableMonths.length > 0 ? availableMonths[0] : 'all'
  );

  const [activeChartTab, setActiveChartTab] = useState<'production' | 'materials' | 'branches'>('production');

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

  // Filtered dataset for selected month
  const filteredProductions = useMemo(() => {
    if (selectedMonth === 'all') return productions;
    return productions.filter((p) => p.Date && p.Date.startsWith(selectedMonth));
  }, [productions, selectedMonth]);

  const filteredTransactions = useMemo(() => {
    if (selectedMonth === 'all') return transactions;
    return transactions.filter((t) => t.Date && t.Date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  // Compute monthly summaries for the selected period
  const periodSummaries = useMemo(() => {
    return generateMonthlySummaryForPeriod(
      materials,
      recipes,
      productions,
      transactions,
      selectedMonth
    );
  }, [materials, recipes, productions, transactions, selectedMonth]);

  // ================= Aggregations & KPIs =================
  const totalProduced = useMemo(
    () => filteredProductions.reduce((sum, p) => sum + (Number(p.Produced_Qty) || 0), 0),
    [filteredProductions]
  );

  const totalDispatchA = useMemo(
    () => filteredProductions.reduce((sum, p) => sum + (Number(p.Dispatch_Branch_A) || 0), 0),
    [filteredProductions]
  );

  const totalDispatchB = useMemo(
    () => filteredProductions.reduce((sum, p) => sum + (Number(p.Dispatch_Branch_B) || 0), 0),
    [filteredProductions]
  );

  const totalDispatched = totalDispatchA + totalDispatchB;

  const totalLeftoverA = useMemo(
    () => filteredProductions.reduce((sum, p) => sum + (Number(p.Leftover_Branch_A) || 0), 0),
    [filteredProductions]
  );

  const totalLeftoverB = useMemo(
    () => filteredProductions.reduce((sum, p) => sum + (Number(p.Leftover_Branch_B) || 0), 0),
    [filteredProductions]
  );

  const totalLeftover = totalLeftoverA + totalLeftoverB;

  const leftoverRate = totalDispatched > 0 ? (totalLeftover / totalDispatched) * 100 : 0;
  const branchALeftoverRate = totalDispatchA > 0 ? (totalLeftoverA / totalDispatchA) * 100 : 0;
  const branchBLeftoverRate = totalDispatchB > 0 ? (totalLeftoverB / totalDispatchB) * 100 : 0;

  // Material Variance KPIs
  const overusedMaterials = useMemo(
    () => periodSummaries.filter((s) => s.isOverused && s.Variance > 0),
    [periodSummaries]
  );

  const lowStockMaterials = useMemo(
    () => periodSummaries.filter((s) => s.isLowStock),
    [periodSummaries]
  );

  // Total Receive & Actual Usage quantities
  const totalReceivedQty = useMemo(
    () =>
      filteredTransactions
        .filter((t) => t.Type === 'Receive')
        .reduce((sum, t) => sum + (Number(t.Qty) || 0), 0),
    [filteredTransactions]
  );

  const totalActualUsageQty = useMemo(
    () =>
      filteredTransactions
        .filter((t) => t.Type === 'Actual Usage')
        .reduce((sum, t) => sum + (Number(t.Qty) || 0), 0),
    [filteredTransactions]
  );

  // ================= Chart Data Preparation =================

  // 1. Daily Production & Dispatch Trend
  const dailyTrendData = useMemo(() => {
    const mapByDate = new Map<string, { date: string; produced: number; dispatchA: number; dispatchB: number; leftover: number }>();

    filteredProductions.forEach((p) => {
      const d = p.Date;
      if (!mapByDate.has(d)) {
        mapByDate.set(d, { date: d, produced: 0, dispatchA: 0, dispatchB: 0, leftover: 0 });
      }
      const item = mapByDate.get(d)!;
      item.produced += Number(p.Produced_Qty) || 0;
      item.dispatchA += Number(p.Dispatch_Branch_A) || 0;
      item.dispatchB += Number(p.Dispatch_Branch_B) || 0;
      item.leftover += (Number(p.Leftover_Branch_A) || 0) + (Number(p.Leftover_Branch_B) || 0);
    });

    return Array.from(mapByDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredProductions]);

  // 2. Product Breakdown (Produced by Product)
  const productBreakdownData = useMemo(() => {
    const map = new Map<string, number>();
    filteredProductions.forEach((p) => {
      const code = p.Product_Code || 'Unknown';
      map.set(code, (map.get(code) || 0) + (Number(p.Produced_Qty) || 0));
    });

    return Array.from(map.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }, [filteredProductions]);

  // 3. Material Expected vs Actual Usage
  const materialVarianceChartData = useMemo(() => {
    return periodSummaries
      .filter((s) => s.Expected_Usage > 0 || s.Actual_Usage > 0)
      .slice(0, 10)
      .map((s) => ({
        name: s.RM_Code,
        fullName: s.RM_Name,
        expected: s.Expected_Usage,
        actual: s.Actual_Usage,
        variance: s.Variance,
        unit: s.Unit,
      }));
  }, [periodSummaries]);

  // 4. Branch Distribution Chart Data
  const branchDispatchPieData = [
    { name: 'สาขา A (Branch A)', value: totalDispatchA, color: '#3B82F6' },
    { name: 'สาขา B (Branch B)', value: totalDispatchB, color: '#10B981' },
  ].filter((d) => d.value > 0);

  const branchLeftoverPieData = [
    { name: 'ของเหลือสาขา A', value: totalLeftoverA, color: '#F59E0B' },
    { name: 'ของเหลือสาขา B', value: totalLeftoverB, color: '#EF4444' },
  ].filter((d) => d.value > 0);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'RM_Code',
      'RM_Name',
      'Unit',
      'Opening_Stock',
      'Total_Receive',
      'Actual_Usage',
      'Expected_Usage',
      'Ending_Stock',
      'Variance',
      'Variance_Percentage',
      'Stock_Status',
    ];

    const rows = periodSummaries.map((s) => [
      `"${s.RM_Code}"`,
      `"${s.RM_Name}"`,
      `"${s.Unit}"`,
      s.Opening_Stock,
      s.Total_Receive,
      s.Actual_Usage,
      s.Expected_Usage,
      s.Ending_Stock,
      s.Variance,
      `${s.variancePercentage}%`,
      `"${s.Stock_Status}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `monthly_stock_summary_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Month Filter Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                  สรุปแดชบอร์ดรายเดือน (Monthly Executive Dashboard)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  วิเคราะห์ผลผลิต การจัดส่งรายสาขา ของเหลือ และผลต่างการใช้วัตถุดิบ (Variance) ประจำงวด
                </p>
              </div>
            </div>
          </div>

          {/* Month Selector & Controls */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-xs">
              <button
                type="button"
                onClick={handlePrevMonth}
                disabled={selectedMonth === 'all' || availableMonths.indexOf(selectedMonth) >= availableMonths.length - 1}
                className="p-1.5 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-500 rounded-lg hover:bg-slate-200/60 transition-colors"
                title="เดือนก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 px-2.5">
                <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-xs sm:text-sm font-bold text-slate-800 focus:outline-none cursor-pointer py-1"
                >
                  <option value="all">📅 ข้อมูลทุกช่วงเวลา (All Time)</option>
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>
                      📅 {formatMonthLabel(m)}
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

            {/* Google Sheets Access for Admin */}
            {spreadsheetId ? (
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 rounded-xl px-3 py-1.5 shadow-xs">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                {spreadsheetUrl && (
                  <a
                    href={spreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline"
                    title="เปิดดูรายงานสต็อกใน Google Sheets"
                  >
                    <span>เปิดดูใน Google Sheets</span>
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                  </a>
                )}
                {onOpenSyncModal && (
                  <button
                    onClick={onOpenSyncModal}
                    className="ml-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-white px-2 py-0.5 rounded-md border border-emerald-200"
                    title="จัดการการส่งข้อมูลขึ้น Google Sheets"
                  >
                    จัดการ
                  </button>
                )}
              </div>
            ) : (
              onOpenSyncModal && (
                <button
                  onClick={onOpenSyncModal}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors shrink-0"
                  title="เชื่อมต่อและสร้าง Google Sheet เก็บข้อมูล"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>เชื่อมต่อ Google Sheets</span>
                </button>
              )
            )}

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors shrink-0"
              title="ส่งออกรายงานสรุปเป็น CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออก CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Production & Dispatch */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              ยอดผลิตรวมในเดือน
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
              {totalProduced.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-slate-500">ชิ้น</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>ยอดส่งรวม:</span>
            <span className="font-mono font-bold text-slate-800">
              {totalDispatched.toLocaleString()} ชิ้น ({totalProduced > 0 ? ((totalDispatched / totalProduced) * 100).toFixed(0) : 0}%)
            </span>
          </div>
        </div>

        {/* KPI 2: Branch Dispatches */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              จัดส่งแยกตามสาขา
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-500">สาขา A</div>
              <div className="text-lg font-bold text-slate-900 font-mono">
                {totalDispatchA.toLocaleString()} <span className="text-xs font-normal text-slate-400">ชิ้น</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold text-slate-500">สาขา B</div>
              <div className="text-lg font-bold text-slate-900 font-mono">
                {totalDispatchB.toLocaleString()} <span className="text-xs font-normal text-slate-400">ชิ้น</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>สัดส่วนการส่ง:</span>
            <span className="font-semibold text-indigo-700">
              A ({totalDispatched > 0 ? ((totalDispatchA / totalDispatched) * 100).toFixed(0) : 0}%) / B ({totalDispatched > 0 ? ((totalDispatchB / totalDispatched) * 100).toFixed(0) : 0}%)
            </span>
          </div>
        </div>

        {/* KPI 3: Material Usage & Receive */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              เบิกใช้วัตถุดิบรวม
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
              {totalActualUsageQty.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-slate-500">หน่วย</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>รับเข้าคลัง:</span>
            <span className="font-mono font-bold text-emerald-700">
              +{totalReceivedQty.toLocaleString()} หน่วย
            </span>
          </div>
        </div>

        {/* KPI 4: Variance & Low Stock Alerts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              สถานะสต็อก & ผลต่าง
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${lowStockMaterials.length > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-500">สต็อกใกล้หมด</div>
              <div className="text-lg font-bold text-rose-600 font-mono">
                {lowStockMaterials.length} <span className="text-xs font-normal text-slate-400">รายการ</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold text-slate-500">ใช้เกินสูตร</div>
              <div className="text-lg font-bold text-amber-600 font-mono">
                {overusedMaterials.length} <span className="text-xs font-normal text-slate-400">รายการ</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              onClick={() => onNavigateToTab('summary')}
              className="text-blue-600 hover:underline font-semibold flex items-center gap-1"
            >
              <span>ดูตารางผลต่างละเอียด</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Visual Analytics Section (Charts) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">
              กราฟวิเคราะห์แนวโน้มและผลการดำเนินงาน ({formatMonthLabel(selectedMonth)})
            </h3>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
            <button
              onClick={() => setActiveChartTab('production')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeChartTab === 'production'
                  ? 'bg-white text-blue-600 shadow-xs font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              แนวโน้มผลิต & จัดส่งรายวัน
            </button>
            <button
              onClick={() => setActiveChartTab('materials')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeChartTab === 'materials'
                  ? 'bg-white text-blue-600 shadow-xs font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              เทียบเบิกใช้วัตถุดิบ (Actual vs Expected)
            </button>
            <button
              onClick={() => setActiveChartTab('branches')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeChartTab === 'branches'
                  ? 'bg-white text-blue-600 shadow-xs font-bold'
                  : 'hover:text-slate-900'
              }`}
            >
              สัดส่วนสาขา & สินค้า
            </button>
          </div>
        </div>

        {/* Chart Tab 1: Daily Production & Dispatch */}
        {activeChartTab === 'production' && (
          <div className="space-y-4">
            <div className="h-72 w-full">
              {dailyTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      tickFormatter={(d) => d.substring(5)}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderRadius: '0.75rem',
                        border: 'none',
                        color: '#F8FAFC',
                        fontSize: '12px',
                      }}
                      formatter={(val: any, name: any) => {
                        const labels: any = {
                          produced: 'ยอดผลิตรวม',
                          dispatchA: 'ส่งสาขา A',
                          dispatchB: 'ส่งสาขา B',
                        };
                        return [`${val} ชิ้น`, labels[name] || name];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="produced" name="ยอดผลิตรวม (Produced)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="dispatchA" name="ส่งสาขา A" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="dispatchB" name="ส่งสาขา B" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                  <Package className="w-8 h-8 text-slate-300 mb-2" />
                  <span>ไม่มีข้อมูลบันทึกการผลิตในงวดเดือนนี้</span>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 italic text-center">
              * กราฟแสดงยอดผลิตจริงเทียบกับยอดกระจายสินค้าไปสาขา A และสาขา B ในแต่ละวัน
            </p>
          </div>
        )}

        {/* Chart Tab 2: Material Actual vs Expected Usage */}
        {activeChartTab === 'materials' && (
          <div className="space-y-4">
            <div className="h-72 w-full">
              {materialVarianceChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={materialVarianceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderRadius: '0.75rem',
                        border: 'none',
                        color: '#F8FAFC',
                        fontSize: '12px',
                      }}
                      formatter={(val: any, name: any, item: any) => {
                        const unit = item.payload.unit || '';
                        return [
                          `${val} ${unit}`,
                          name === 'expected' ? 'ควรใช้ตามสูตร (Expected)' : 'เบิกใช้จริง (Actual)',
                        ];
                      }}
                      labelFormatter={(label) => {
                        const match = materialVarianceChartData.find((m) => m.name === label);
                        return match ? `${match.name} - ${match.fullName}` : label;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Bar dataKey="expected" name="ควรใช้ตามสูตร (Expected BOM)" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actual" name="เบิกใช้จริง (Actual Usage)" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                  <Layers className="w-8 h-8 text-slate-300 mb-2" />
                  <span>ยังไม่มีข้อมูลการใช้วัตถุดิบในเดือนนี้</span>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 italic text-center">
              * แท่งสีแดงที่สูงกว่าแท่งสีเทา หมายถึงการเบิกใช้วัตถุดิบเกินเกณฑ์สูตรมาตรฐาน (Variance Overuse)
            </p>
          </div>
        )}

        {/* Chart Tab 3: Branch & Product Breakdown */}
        {activeChartTab === 'branches' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pie 1: Product Share */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <PieChartIcon className="w-4 h-4 text-blue-600" />
                สัดส่วนการผลิตแต่ละเมนูสินค้า
              </h4>
              <div className="h-56">
                {productBreakdownData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={productBreakdownData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        {productBreakdownData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderRadius: '0.5rem',
                          border: 'none',
                          color: '#F8FAFC',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    ไม่มีข้อมูลสินค้า
                  </div>
                )}
              </div>
            </div>

            {/* Pie 2: Branch Dispatches */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-600" />
                สัดส่วนยอดจัดส่ง สาขา A vs สาขา B
              </h4>
              <div className="h-56">
                {branchDispatchPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={branchDispatchPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        label={({ name, percent }: any) => `${name.split(' ')[0]} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {branchDispatchPieData.map((entry, index) => (
                          <Cell key={`cell-branch-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderRadius: '0.5rem',
                          border: 'none',
                          color: '#F8FAFC',
                          fontSize: '12px',
                        }}
                        formatter={(val: any) => [`${val} ชิ้น`, 'ยอดจัดส่ง']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    ไม่มีข้อมูลจัดส่ง
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Branch Performance Comparison Scorecard */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Branch A Card */}
        <div className="bg-gradient-to-br from-blue-50/70 to-white p-5 rounded-2xl border border-blue-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                A
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">สรุปผลงาน สาขา A</h4>
                <p className="text-[11px] text-slate-500">ยอดกระจายสินค้าและของเหลือประจำงวด</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
              Loss: {branchALeftoverRate.toFixed(1)}%
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center bg-white p-3 rounded-xl border border-blue-100">
            <div>
              <div className="text-[11px] text-slate-500">ยอดรับสินค้า</div>
              <div className="text-base font-bold text-slate-900 font-mono">{totalDispatchA.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">ยอดของเหลือ</div>
              <div className="text-base font-bold text-amber-600 font-mono">{totalLeftoverA.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">ขายได้จริง</div>
              <div className="text-base font-bold text-emerald-600 font-mono">
                {Math.max(0, totalDispatchA - totalLeftoverA).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Branch B Card */}
        <div className="bg-gradient-to-br from-indigo-50/70 to-white p-5 rounded-2xl border border-indigo-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                B
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">สรุปผลงาน สาขา B</h4>
                <p className="text-[11px] text-slate-500">ยอดกระจายสินค้าและของเหลือประจำงวด</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
              Loss: {branchBLeftoverRate.toFixed(1)}%
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center bg-white p-3 rounded-xl border border-indigo-100">
            <div>
              <div className="text-[11px] text-slate-500">ยอดรับสินค้า</div>
              <div className="text-base font-bold text-slate-900 font-mono">{totalDispatchB.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">ยอดของเหลือ</div>
              <div className="text-base font-bold text-amber-600 font-mono">{totalLeftoverB.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">ขายได้จริง</div>
              <div className="text-base font-bold text-emerald-600 font-mono">
                {Math.max(0, totalDispatchB - totalLeftoverB).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Material Balances & Variance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              ตารางสรุปสต็อกและผลต่างการใช้วัตถุดิบประจำงวด ({formatMonthLabel(selectedMonth)})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              คำนวณยอดยกมา + รับเข้า - เบิกใช้จริง และเปรียบเทียบกับสูตร BOM อัตโนมัติ
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab('summary')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 self-start sm:self-auto"
          >
            <span>ไปที่หน้า Tab 5 เต็มรูปแบบ</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <th className="px-4 py-3">รหัส / ชื่อวัตถุดิบ</th>
                <th className="px-3 py-3 text-right">ยอดยกมา</th>
                <th className="px-3 py-3 text-right">รับเข้าในงวด</th>
                <th className="px-3 py-3 text-right">เบิกใช้จริง</th>
                <th className="px-3 py-3 text-right text-slate-500">ควรใช้ตามสูตร</th>
                <th className="px-3 py-3 text-right font-bold">คงเหลือสิ้นงวด</th>
                <th className="px-3 py-3 text-right">ผลต่าง (Variance)</th>
                <th className="px-3 py-3 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {periodSummaries.map((item) => {
                return (
                  <tr
                    key={item.RM_Code}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => onSelectMaterialDetail(item.RM_Code)}
                    title="คลิกเพื่อดูประวัติและการคำนวณวัตถุดิบนี้"
                  >
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 font-mono">{item.RM_Code}</div>
                      <div className="text-[11px] text-slate-500">{item.RM_Name}</div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-slate-600">
                      {item.Opening_Stock.toLocaleString()} {item.Unit}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-emerald-600 font-semibold">
                      +{item.Total_Receive.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-slate-900 font-bold">
                      -{item.Actual_Usage.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-slate-400">
                      {item.Expected_Usage.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-bold">
                      <span className={item.isLowStock ? 'text-rose-600 font-extrabold' : 'text-slate-900'}>
                        {item.Ending_Stock.toLocaleString()} {item.Unit}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono">
                      {item.Variance > 0.001 ? (
                        <span className="text-amber-600 font-bold">
                          +{item.Variance.toLocaleString()} ({item.variancePercentage > 0 ? `+${item.variancePercentage}%` : ''})
                        </span>
                      ) : item.Variance < -0.001 ? (
                        <span className="text-emerald-600 font-bold">
                          {item.Variance.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-400">0.00</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {item.isLowStock ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                          <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                          ใกล้หมด
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          ปกติ
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
