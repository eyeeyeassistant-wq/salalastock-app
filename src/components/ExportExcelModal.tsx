import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Layers,
  CalendarCheck,
  ArrowLeftRight,
  Package,
  Sparkles,
  ClipboardCheck,
  Store,
  Calendar,
  Check,
} from 'lucide-react';
import {
  MasterMaterial,
  BOMRecipe,
  DailyProduction,
  StockTransaction,
  MonthlyStockSummary,
  MonthlyStockCountRecord,
  MasterBranch,
} from '../types/stock';
import {
  exportAllDataToExcel,
  exportDailyProductionToExcel,
  exportMonthlySummaryToExcel,
  exportStockTransactionsToExcel,
} from '../utils/excelExport';

interface ExportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: MasterMaterial[];
  recipes: BOMRecipe[];
  productions: DailyProduction[];
  transactions: StockTransaction[];
  summaries: MonthlyStockSummary[];
  countRecords?: MonthlyStockCountRecord[];
  branches?: MasterBranch[];
  onShowNotification: (msg: string) => void;
}

export const ExportExcelModal: React.FC<ExportExcelModalProps> = ({
  isOpen,
  onClose,
  materials,
  recipes,
  productions,
  transactions,
  summaries,
  countRecords = [],
  branches = [],
  onShowNotification,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [justExported, setJustExported] = useState<boolean>(false);

  if (!isOpen) return null;

  // Extract available months from productions and transactions
  const monthSet = new Set<string>();
  productions.forEach((p) => {
    if (p.Date && p.Date.length >= 7) monthSet.add(p.Date.substring(0, 7));
  });
  transactions.forEach((t) => {
    if (t.Date && t.Date.length >= 7) monthSet.add(t.Date.substring(0, 7));
  });
  const availableMonths = Array.from(monthSet).sort().reverse();

  // Filtered productions & transactions by month if selected
  const filteredProds = selectedMonth === 'all'
    ? productions
    : productions.filter((p) => p.Date && p.Date.startsWith(selectedMonth));

  const filteredTxs = selectedMonth === 'all'
    ? transactions
    : transactions.filter((t) => t.Date && t.Date.startsWith(selectedMonth));

  const filteredCountRecords = selectedMonth === 'all'
    ? countRecords
    : countRecords.filter((c) => c.Month === selectedMonth);

  const handleExportAll = () => {
    setIsExporting(true);
    setTimeout(() => {
      try {
        exportAllDataToExcel({
          materials,
          recipes,
          productions: filteredProds,
          transactions: filteredTxs,
          summaries,
          countRecords: filteredCountRecords,
          branches,
          selectedMonth,
        });
        setJustExported(true);
        onShowNotification('📊 ดาวน์โหลดไฟล์ Excel (รวมทุก Sheet) สำเร็จเรียบร้อย');
        setTimeout(() => setJustExported(false), 3000);
      } catch (err: any) {
        console.error('Export error:', err);
        onShowNotification(`❌ เกิดข้อผิดพลาดในการสร้าง Excel: ${err?.message || 'ไม่ทราบสาเหตุ'}`);
      } finally {
        setIsExporting(false);
      }
    }, 150);
  };

  const sheetsInfo = [
    {
      id: 'summary',
      name: '1. สรุปสต็อก & Variance',
      count: `${summaries.length} วัตถุดิบ`,
      icon: Layers,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
      action: () => {
        exportMonthlySummaryToExcel(summaries, selectedMonth);
        onShowNotification('📊 ดาวน์โหลดชีตสรุปสต็อกสำเร็จ');
      },
    },
    {
      id: 'monthly-prod',
      name: '2. สรุปผลิตรายเดือน (แยกสาขา)',
      count: 'ผลรวมรายเมนู/สาขา',
      icon: CalendarCheck,
      color: 'text-sky-600 bg-sky-50 border-sky-200',
      action: handleExportAll,
    },
    {
      id: 'daily-prod',
      name: '3. บันทึกผลิตรายวัน & ส่งสาขา',
      count: `${filteredProds.length} รายการ`,
      icon: CalendarCheck,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      action: () => {
        exportDailyProductionToExcel(filteredProds, recipes, branches);
        onShowNotification('📊 ดาวน์โหลดชีตบันทึกผลิตรายวันสำเร็จ');
      },
    },
    {
      id: 'transactions',
      name: '4. ประวัติเบิก/รับสต็อก',
      count: `${filteredTxs.length} รายการ`,
      icon: ArrowLeftRight,
      color: 'text-cyan-600 bg-cyan-50 border-cyan-200',
      action: () => {
        exportStockTransactionsToExcel(filteredTxs, materials);
        onShowNotification('📊 ดาวน์โหลดชีตเบิก/รับสต็อกสำเร็จ');
      },
    },
    {
      id: 'stock-counts',
      name: '5. ตรวจนับสต็อกจริงสิ้นเดือน',
      count: `${filteredCountRecords.length} รอบเอกสาร`,
      icon: ClipboardCheck,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      action: handleExportAll,
    },
    {
      id: 'materials',
      name: '6. ทะเบียนวัตถุดิบ',
      count: `${materials.length} รายการ`,
      icon: Package,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      action: handleExportAll,
    },
    {
      id: 'recipes',
      name: '7. สูตรการผลิต (BOM)',
      count: `${recipes.length} วัตถุดิบในสูตร`,
      icon: Sparkles,
      color: 'text-purple-600 bg-purple-50 border-purple-200',
      action: handleExportAll,
    },
    {
      id: 'branches',
      name: '8. ข้อมูลสาขา',
      count: `${branches.length} สาขา`,
      icon: Store,
      color: 'text-slate-600 bg-slate-50 border-slate-200',
      action: handleExportAll,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>ดาวน์โหลดข้อมูลเป็น Excel (.xlsx)</span>
                <span className="text-[11px] bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full font-medium border border-emerald-400/30">
                  ครบทุกตาราง
                </span>
              </h2>
              <p className="text-xs text-emerald-200/80">
                ส่งออกข้อมูลระบบทั้งหมดแยกตาม Sheet พร้อมสูตรคำนวณและสรุปยอดอัตโนมัติ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Month Filter selector */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>เลือกช่วงข้อมูลงวดเดือนที่ต้องการ:</span>
            </div>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            >
              <option value="all">📁 ข้อมูลทั้งหมด (ทุกงวดเดือน)</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  📅 ประจำเดือน {m}
                </option>
              ))}
            </select>
          </div>

          {/* Big Master Export Button */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 text-center shadow-xs">
            <div className="max-w-md mx-auto space-y-3">
              <div className="flex items-center justify-center gap-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>ไฟล์เดียว รวมครบทั้ง 8 แผ่นงาน (All-in-One Workbook)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                ประกอบด้วย สรุปสต็อก&Variance, สรุปผลิตแยกสาขา, บันทึกผลิตรายวัน, รายการเบิกรับ, ตรวจนับสิ้นเดือน, ทะเบียนวัตถุดิบ, สูตร BOM และข้อมูลสาขา
              </p>
              <button
                onClick={handleExportAll}
                disabled={isExporting}
                className={`w-full py-3 px-5 rounded-xl font-bold text-sm text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                  justExported
                    ? 'bg-teal-600 hover:bg-teal-700 ring-2 ring-teal-300'
                    : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-600/30'
                }`}
              >
                {justExported ? (
                  <>
                    <Check className="w-5 h-5 text-emerald-100" />
                    <span>ดาวน์โหลดไฟล์สำเร็จแล้ว!</span>
                  </>
                ) : (
                  <>
                    <Download className={`w-5 h-5 ${isExporting ? 'animate-bounce' : ''}`} />
                    <span>{isExporting ? 'กำลังสร้างไฟล์ Excel...' : 'ดาวน์โหลด Excel ทั้งหมด (ครบ 8 แผ่นงาน)'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Breakdown List of Sheets */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-slate-700">
                รายละเอียดแผ่นงาน (Sheets) ในไฟล์ Excel:
              </span>
              <span className="text-[11px] text-slate-500">
                คลิกปุ่มดาวน์โหลดแยกตามชีตได้
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
              {sheetsInfo.map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 ${s.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate">
                          {s.name}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {s.count}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={s.action}
                      title="ดาวน์โหลดเฉพาะแผ่นงานนี้"
                      className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors shrink-0"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>รองรับการเปิดด้วย Microsoft Excel, Google Sheets, และ Numbers</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
