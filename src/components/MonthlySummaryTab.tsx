import React, { useState } from 'react';
import {
  MonthlyStockSummary,
  MasterMaterial,
  BOMRecipe,
  DailyProduction,
  StockTransaction,
  MonthlyStockCountRecord,
} from '../types/stock';
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

export const MonthlySummaryTab: React.FC<MonthlySummaryTabProps> = ({
  summaries,
  materials,
  recipes,
  productions,
  transactions,
  stockCountRecords = [],
  onOpenFormulaGuide,
  onOpenStockCountModal,
  onSelectMaterialDetail,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'lowStock' | 'overused' | 'normal'>('all');
  const [sortField, setSortField] = useState<keyof MonthlyStockSummary>('RM_Code');
  const [sortAsc, setSortAsc] = useState(true);

  // Filtered & Sorted Summaries
  const filteredSummaries = summaries
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
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

  const handleSort = (field: keyof MonthlyStockSummary) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const getSafetyStock = (rmCode: string) => {
    const m = materials.find((mat) => mat.RM_Code === rmCode);
    return m ? m.Safety_Stock : 0;
  };

  return (
    <div className="space-y-4">
      {/* Top Banner Alert if low stock exists */}
      {summaries.some((s) => s.isLowStock) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-red-900 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center text-red-600 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-900">
                มีวัตถุดิบ {summaries.filter((s) => s.isLowStock).length} รายการที่ต่ำกว่าจุดสั่งซื้อขั้นต่ำ (Safety Stock)
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
              ทั้งหมด ({summaries.length})
            </button>
            <button
              onClick={() => setStatusFilter('lowStock')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                statusFilter === 'lowStock'
                  ? 'bg-red-600 text-white shadow-xs font-semibold'
                  : 'hover:text-red-600'
              }`}
            >
              ใกล้หมด ({summaries.filter((s) => s.isLowStock).length})
            </button>
            <button
              onClick={() => setStatusFilter('overused')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                statusFilter === 'overused'
                  ? 'bg-amber-600 text-white shadow-xs font-semibold'
                  : 'hover:text-amber-600'
              }`}
            >
              เบิกเกินเกณฑ์ ({summaries.filter((s) => s.isOverused).length})
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
              สรุปสต๊อกสิ้นเดือนและผลต่างวัตถุดิบ (Monthly Summary & Variance)
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className="sm:hidden text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              👉 ปัดซ้าย-ขวาเพื่อดูผลต่าง Variance
            </span>
            <span className="hidden sm:inline">คำนวณตามสูตรอัตโนมัติ 10 คอลัมน์</span>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[800px]">
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
                    Opening_Stock <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('Total_Receive')}
                  className="px-3.5 py-3.5 text-right cursor-pointer hover:bg-slate-100 text-slate-700"
                >
                  <div className="flex items-center justify-end gap-1">
                    Total_Receive <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('Actual_Usage')}
                  className="px-3.5 py-3.5 text-right cursor-pointer hover:bg-slate-100 text-slate-700"
                >
                  <div className="flex items-center justify-end gap-1">
                    Actual_Usage <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('Expected_Usage')}
                  className="px-3.5 py-3.5 text-right cursor-pointer hover:bg-slate-100 text-slate-700"
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
                    <td className="px-3.5 py-3.5 text-right font-mono font-medium text-slate-900 text-xs sm:text-sm">
                      {item.Actual_Usage.toLocaleString()}
                    </td>

                    {/* Expected_Usage */}
                    <td className="px-3.5 py-3.5 text-right font-mono text-slate-600 text-xs sm:text-sm">
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

                    {/* Variance (Highlighted if Overused > 0 in red pill, <= 0 in green pill) */}
                    <td className="px-3.5 py-3.5 text-right font-mono font-medium">
                      {isOverused ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-md text-[11px] font-bold">
                          <TrendingUp className="w-3 h-3" />
                          +{item.Variance.toLocaleString()} (สูญเสีย)
                        </span>
                      ) : isUnderused ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-md text-[11px] font-bold">
                          <TrendingDown className="w-3 h-3" />
                          {item.Variance.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">0.00</span>
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

        {/* Bottom Formula Guide Bar (Direct from Professional Polish theme) */}
        <div className="bg-[#0f172a] p-4 text-white font-mono text-[10px] sm:text-xs leading-relaxed border-t border-slate-800">
          <div className="space-y-1.5">
            <div>
              <span className="text-blue-400 font-bold uppercase mr-2">[Total_Receive]:</span>
              <span className="text-slate-300">=SUMIFS(Stock_Transactions!D:D, Stock_Transactions!B:B, "Receive", Stock_Transactions!C:C, A2)</span>
            </div>
            <div>
              <span className="text-blue-400 font-bold uppercase mr-2">[Expected_Usage]:</span>
              <span className="text-slate-300">=SUMPRODUCT(SUMIFS(BOM_Recipe!D:D, BOM_Recipe!A:A, Daily_Production!B:B, BOM_Recipe!B:B, A2), Daily_Production!C:C)</span>
            </div>
            <div>
              <span className="text-blue-400 font-bold uppercase mr-2">[Ending_Stock & Variance]:</span>
              <span className="text-slate-300">Ending = D2 + E2 - F2 | Variance = F2 - G2 (หาก &gt; 0 = มี Waste เกินสูตร)</span>
            </div>
            <div>
              <span className="text-amber-400 font-bold uppercase mr-2">[Stock_Status Rule]:</span>
              <span className="text-slate-300">=IF(H2 &lt;= VLOOKUP(A2, Master_Materials!A:E, 5, FALSE), "⚠️ วัตถุดิบใกล้หมด", "ปกติ")</span>
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
            <span>หลักการคำนวณในตาราง Monthly_Stock_Summary</span>
          </div>
          <ul className="space-y-1.5 text-slate-600 list-disc list-inside">
            <li>
              <strong className="text-slate-800">Ending_Stock</strong> = Opening_Stock + Total_Receive - Actual_Usage
            </li>
            <li>
              <strong className="text-slate-800">Expected_Usage</strong> = ผลรวมของ (ยอดผลิต x สูตรมาตรฐาน BOM)
            </li>
            <li>
              <strong className="text-slate-800">Variance</strong> = Actual_Usage - Expected_Usage
              <span className="block pl-4 text-slate-500">
                • ค่า <strong>+</strong> = เบิกเกินเกณฑ์ (มีของเสีย/Waste หรือรั่วไหล)
                <br />
                • ค่า <strong>-</strong> = เบิกน้อยกว่าเกณฑ์ (ประหยัด/มีประสิทธิภาพ)
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
              <strong className="text-blue-700">ระบบตัดสต็อกอัตโนมัติ</strong>: สามารถกดปุ่มตัดสต็อกตามยอดผลิตจริงในแท็บ Daily Production เพื่อสร้างรายการ Actual Usage เข้าคลังทันที
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
