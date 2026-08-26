import React, { useState, useEffect, useMemo } from 'react';
import {
  MasterMaterial,
  BOMRecipe,
  DailyProduction,
  StockTransaction,
  MonthlyStockCountRecord,
  PhysicalStockCountItem,
} from '../types/stock';
import { generateMonthlySummaryForPeriod, getAvailableMonths } from '../utils/calculations';
import {
  ClipboardCheck,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Search,
  User,
  Calendar,
  Layers,
  Sparkles,
  Info,
  RefreshCw,
  ArrowLeft,
  Check,
} from 'lucide-react';

interface PhysicalStockCountTabProps {
  materials: MasterMaterial[];
  recipes: BOMRecipe[];
  productions: DailyProduction[];
  transactions: StockTransaction[];
  stockCountRecords?: MonthlyStockCountRecord[];
  onSaveStockCount: (
    record: MonthlyStockCountRecord,
    applyAsOpeningStock: boolean
  ) => void;
  onBackToDashboard?: () => void;
  onRestoreSampleData?: () => void;
}

export const PhysicalStockCountTab: React.FC<PhysicalStockCountTabProps> = ({
  materials = [],
  recipes = [],
  productions = [],
  transactions = [],
  stockCountRecords = [],
  onSaveStockCount,
  onBackToDashboard,
  onRestoreSampleData,
}) => {
  const availableMonths = useMemo(() => {
    const list = getAvailableMonths(productions || [], transactions || []);
    const currentMonth = new Date().toISOString().substring(0, 7);
    if (!list.includes(currentMonth)) {
      list.unshift(currentMonth);
    }
    return list;
  }, [productions, transactions]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return availableMonths[0] || new Date().toISOString().substring(0, 7);
  });

  const [countDate, setCountDate] = useState<string>(
    () => new Date().toISOString().substring(0, 10)
  );
  const [countedBy, setCountedBy] = useState<string>('พนักงานประจำร้าน / ทีมผลิต');
  const [note, setNote] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [applyAsOpening, setApplyAsOpening] = useState<boolean>(true);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Map of RM_Code -> Counted Qty string
  const [counts, setCounts] = useState<{ [rmCode: string]: string }>({});
  const [itemNotes, setItemNotes] = useState<{ [rmCode: string]: string }>({});

  // Existing record for this month if any
  const existingRecord = useMemo(() => {
    return (stockCountRecords || []).find((r) => r.Month === selectedMonth) || null;
  }, [stockCountRecords, selectedMonth]);

  // Calculate the current system ending stocks for the chosen month
  const systemSummaries = useMemo(() => {
    return generateMonthlySummaryForPeriod(
      materials || [],
      recipes || [],
      productions || [],
      transactions || [],
      selectedMonth || 'all'
    );
  }, [materials, recipes, productions, transactions, selectedMonth]);

  // Initialize count state when month changes or record loads
  useEffect(() => {
    if (existingRecord) {
      setCountedBy(existingRecord.Counted_By || 'พนักงานประจำร้าน / ทีมผลิต');
      setCountDate(existingRecord.Count_Date || new Date().toISOString().substring(0, 10));
      setNote(existingRecord.Note || '');
      const countMap: { [rmCode: string]: string } = {};
      const noteMap: { [rmCode: string]: string } = {};
      (existingRecord.Items || []).forEach((it) => {
        countMap[it.RM_Code] = it.Counted_Qty !== undefined ? it.Counted_Qty.toString() : '0';
        if (it.Note) noteMap[it.RM_Code] = it.Note;
      });
      setCounts(countMap);
      setItemNotes(noteMap);
    } else {
      // Pre-fill with system ending stocks
      const countMap: { [rmCode: string]: string } = {};
      systemSummaries.forEach((s) => {
        const val = typeof s.Ending_Stock === 'number' && !isNaN(s.Ending_Stock) ? s.Ending_Stock : 0;
        countMap[s.RM_Code] = val.toString();
      });
      setCounts(countMap);
      setItemNotes({});
    }
  }, [selectedMonth, existingRecord?.Month]);

  const handleCountChange = (rmCode: string, val: string) => {
    setCounts((prev) => ({
      ...prev,
      [rmCode]: val,
    }));
  };

  const handleCopyAllSystemValues = () => {
    const map: { [rmCode: string]: string } = {};
    systemSummaries.forEach((s) => {
      const val = typeof s.Ending_Stock === 'number' && !isNaN(s.Ending_Stock) ? s.Ending_Stock : 0;
      map[s.RM_Code] = val.toString();
    });
    setCounts(map);
  };

  const handleClearAll = () => {
    const map: { [rmCode: string]: string } = {};
    systemSummaries.forEach((s) => {
      map[s.RM_Code] = '0';
    });
    setCounts(map);
  };

  // Filtered materials
  const filteredSummaries = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return systemSummaries;
    return systemSummaries.filter(
      (s) =>
        (s.RM_Code || '').toLowerCase().includes(term) ||
        (s.RM_Name || '').toLowerCase().includes(term)
    );
  }, [systemSummaries, searchTerm]);

  // Statistics
  const countStats = useMemo(() => {
    let exactCount = 0;
    let shortageCount = 0;
    let overageCount = 0;
    const list = systemSummaries || [];
    const totalItems = list.length;

    list.forEach((s) => {
      if (!s) return;
      const endingNum = typeof s.Ending_Stock === 'number' && !isNaN(s.Ending_Stock) ? s.Ending_Stock : 0;
      const counted = counts[s.RM_Code] !== undefined ? (parseFloat(counts[s.RM_Code]) || 0) : endingNum;
      const diff = Number((counted - endingNum).toFixed(3));
      if (Math.abs(diff) < 0.001) {
        exactCount++;
      } else if (diff < 0) {
        shortageCount++;
      } else {
        overageCount++;
      }
    });

    return { exactCount, shortageCount, overageCount, totalItems };
  }, [systemSummaries, counts]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const items: PhysicalStockCountItem[] = (systemSummaries || []).map((s) => {
      const endingNum = typeof s.Ending_Stock === 'number' && !isNaN(s.Ending_Stock) ? s.Ending_Stock : 0;
      const counted = counts[s.RM_Code] !== undefined ? (parseFloat(counts[s.RM_Code]) || 0) : endingNum;
      const variance = Number((counted - endingNum).toFixed(3));
      return {
        RM_Code: s.RM_Code || '',
        RM_Name: s.RM_Name || '',
        Unit: s.Unit || '',
        System_Qty: endingNum,
        Counted_Qty: counted,
        Variance: variance,
        Note: itemNotes[s.RM_Code] || '',
      };
    });

    const record: MonthlyStockCountRecord = {
      id: existingRecord?.id || `count-${Date.now()}`,
      Month: selectedMonth,
      Count_Date: countDate,
      Counted_By: countedBy || 'พนักงานประจำร้าน / ทีมผลิต',
      Note: note,
      Items: items,
      CreatedAt: new Date().toISOString(),
      AppliedAsOpening: applyAsOpening,
    };

    onSaveStockCount(record, applyAsOpening);
    setSaveSuccessMsg(`บันทึกผลการตรวจนับประจำเดือน ${selectedMonth} เรียบร้อยแล้ว!`);
    setTimeout(() => {
      setSaveSuccessMsg(null);
    }, 4000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb / Back Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          {onBackToDashboard && (
            <button
              type="button"
              onClick={onBackToDashboard}
              id="btn-back-to-dashboard"
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">กลับหน้าแดชบอร์ด</span>
            </button>
          )}
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-bold">
              <span>ภารกิจสิ้นเดือน (End of Month Task)</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              เช็คสต็อกสิ้นเดือนที่เกิดขึ้นจริง (Physical Stock Count)
            </h1>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
          <Calendar className="w-4 h-4 text-slate-400 ml-2" />
          <span className="text-xs font-semibold text-slate-600">เลือกเดือน:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-xs text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                เดือน {m} {m === new Date().toISOString().substring(0, 7) ? '(ปัจจุบัน)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-white" />
            <span className="text-sm font-bold">{saveSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccessMsg(null)}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg font-semibold"
          >
            ปิด
          </button>
        </div>
      )}

      {/* Meta Input Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-xs">
        <div>
          <label className="block text-slate-600 font-semibold mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            วันที่ตรวจนับจริง (Count Date)
          </label>
          <input
            type="date"
            value={countDate}
            onChange={(e) => setCountDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-slate-600 font-semibold mb-1.5 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            ชื่อผู้ตรวจนับ (Counted By)
          </label>
          <input
            type="text"
            placeholder="ระบุชื่อพนักงานผู้ตรวจนับ"
            value={countedBy}
            onChange={(e) => setCountedBy(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-slate-600 font-semibold mb-1.5 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            หมายเหตุการตรวจนับ (Note)
          </label>
          <input
            type="text"
            placeholder="เช่น ตรวจนับก่อนปิดร้านรอบดึก"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
          <div className="text-xs text-slate-500 font-medium">รายการทั้งหมด</div>
          <div className="text-xl font-bold text-slate-900 font-mono mt-1">
            {countStats.totalItems} <span className="text-xs font-normal text-slate-400">รายการ</span>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl shadow-xs">
          <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ยอดตรงตามระบบ
          </div>
          <div className="text-xl font-bold text-emerald-700 font-mono mt-1">
            {countStats.exactCount} <span className="text-xs font-normal text-emerald-600">รายการ</span>
          </div>
        </div>

        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl shadow-xs">
          <div className="text-xs text-rose-700 font-semibold flex items-center gap-1.5">
            <TrendingDown className="w-4 h-4 text-rose-600" />
            สต็อกขาด (สูญหาย)
          </div>
          <div className="text-xl font-bold text-rose-700 font-mono mt-1">
            {countStats.shortageCount} <span className="text-xs font-normal text-rose-600">รายการ</span>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl shadow-xs">
          <div className="text-xs text-blue-700 font-semibold flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            สต็อกเกิน
          </div>
          <div className="text-xl font-bold text-blue-700 font-mono mt-1">
            {countStats.overageCount} <span className="text-xs font-normal text-blue-600">รายการ</span>
          </div>
        </div>
      </div>

      {/* Main Form Table Container */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Top Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหารหัส หรือ ชื่อวัตถุดิบ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyAllSystemValues}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors flex items-center gap-1.5"
              title="คัดลอกยอดสต็อกตามระบบมาใส่เป็นค่านับจริงเริ่มต้น"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ดึงยอดระบบมาใส่ทุกรายการ</span>
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              รีเซ็ตเป็น 0
            </button>
          </div>
        </div>

        {/* Table List */}
        <div className="overflow-x-auto divide-y divide-slate-100">
          <div className="bg-slate-100 px-4 sm:px-6 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider grid grid-cols-12 items-center min-w-[650px]">
            <span className="col-span-4">วัตถุดิบ (Material)</span>
            <span className="col-span-3 text-right">ยอดคำนวณตามระบบ (System)</span>
            <span className="col-span-3 text-right">ยอดนับจริงสิ้นเดือน (Physical Count)</span>
            <span className="col-span-2 text-right">ผลต่าง (Variance)</span>
          </div>

          {filteredSummaries.length === 0 ? (
            <div className="py-16 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Info className="w-6 h-6" />
              </div>
              {materials.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-800">
                    ยังไม่มีรายการวัตถุดิบในระบบ
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    กรุณาเพิ่มรายการวัตถุดิบในแท็บ <b>ทะเบียนวัตถุดิบ (Master Materials)</b> หรือกดโหลดข้อมูลตัวอย่างเริ่มต้น
                  </p>
                  {onRestoreSampleData && (
                    <button
                      type="button"
                      onClick={onRestoreSampleData}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>โหลดข้อมูลตัวอย่างวัตถุดิบ (Restore Sample)</span>
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    ไม่พบวัตถุดิบที่ตรงกับคำค้นหา "{searchTerm}"
                  </p>
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="mt-2 text-xs text-indigo-600 font-semibold hover:underline"
                  >
                    ล้างคำค้นหา
                  </button>
                </div>
              )}
            </div>
          ) : (
            filteredSummaries.map((s) => {
              const endingStockVal = typeof s.Ending_Stock === 'number' && !isNaN(s.Ending_Stock) ? s.Ending_Stock : 0;
              const countedVal = counts[s.RM_Code] !== undefined ? counts[s.RM_Code] : endingStockVal.toString();
              const numCounted = parseFloat(countedVal) || 0;
              const variance = Number((numCounted - endingStockVal).toFixed(3));
              const isExact = Math.abs(variance) < 0.001;
              const isShortage = variance < -0.001;
              const isOverage = variance > 0.001;

              return (
                <div
                  key={s.RM_Code}
                  className={`px-4 sm:px-6 py-3.5 grid grid-cols-12 items-center min-w-[650px] transition-colors ${
                    isShortage ? 'bg-rose-50/40' : isOverage ? 'bg-blue-50/30' : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Col 1: Material Details */}
                  <div className="col-span-4 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                        {s.RM_Code}
                      </span>
                      <span className="text-sm font-bold text-slate-800 line-clamp-1">
                        {s.RM_Name}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      หน่วย: <span className="font-semibold text-slate-700">{s.Unit}</span>
                    </div>
                  </div>

                  {/* Col 2: System Ending Stock */}
                  <div className="col-span-3 text-right font-mono pr-3">
                    <div className="text-sm font-bold text-slate-800">
                      {endingStockVal.toLocaleString()} <span className="text-xs font-normal text-slate-500">{s.Unit}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      (ยกมา {s.Opening_Stock ?? 0} + รับ {s.Total_Receive ?? 0} - ใช้ {s.Actual_Usage ?? 0})
                    </div>
                  </div>

                  {/* Col 3: Actual Physical Count Input */}
                  <div className="col-span-3 flex items-center justify-end gap-1.5">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={countedVal}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleCountChange(s.RM_Code, e.target.value)}
                      placeholder="0"
                      className={`w-32 px-3 py-2 rounded-xl border text-sm font-mono font-bold text-right focus:outline-none focus:ring-2 ${
                        isShortage
                          ? 'border-rose-300 bg-rose-50/80 text-rose-900 focus:ring-rose-500'
                          : isOverage
                          ? 'border-blue-300 bg-blue-50/80 text-blue-900 focus:ring-blue-500'
                          : 'border-slate-300 bg-white text-slate-900 focus:ring-indigo-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => handleCountChange(s.RM_Code, endingStockVal.toString())}
                      className="px-2.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs text-slate-600 font-bold"
                      title="กดยอดตามระบบ"
                    >
                      =
                    </button>
                  </div>

                  {/* Col 4: Variance */}
                  <div className="col-span-2 text-right font-mono">
                    {isExact ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        0.00
                      </span>
                    ) : isShortage ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800" title="สต็อกจริงขาดไป">
                        <TrendingDown className="w-3.5 h-3.5" />
                        {variance.toLocaleString()}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800" title="สต็อกจริงเกินมา">
                        <TrendingUp className="w-3.5 h-3.5" />
                        +{variance.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Roll-over settings & Action Bar */}
        <div className="p-5 sm:p-6 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <label className="flex items-start gap-3 cursor-pointer select-none max-w-xl">
            <input
              type="checkbox"
              checked={applyAsOpening}
              onChange={(e) => setApplyAsOpening(e.target.checked)}
              className="mt-1 w-4 h-4 text-indigo-600 rounded border-indigo-300 focus:ring-indigo-500"
            />
            <div className="text-xs">
              <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>ยกยอดนับจริงนี้ไปเป็นยอดยกมาต้นเดือนถัดไป (Roll-over to Next Month Opening Stock)</span>
              </div>
              <p className="text-slate-600 mt-0.5 leading-relaxed">
                เมื่อเปิดใช้งาน ระบบจะนำยอดนับจริงนี้ไปอัปเดตเป็น <b>ยอดยกมา (Opening Stock)</b> ในทะเบียนวัตถุดิบและ Google Sheets ของคุณให้อัตโนมัติ
              </p>
            </div>
          </label>

          <div className="flex items-center gap-3 justify-end shrink-0">
            {onBackToDashboard && (
              <button
                type="button"
                onClick={onBackToDashboard}
                className="px-5 py-3 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                ยกเลิก
              </button>
            )}

            <button
              type="submit"
              id="btn-save-stock-count-tab"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all active:scale-95 min-h-[44px]"
            >
              <Save className="w-4 h-4" />
              <span>
                {applyAsOpening
                  ? 'บันทึก & ยกยอดนับจริงเป็นสต็อกต้นเดือน'
                  : 'บันทึกผลการตรวจนับ'}
              </span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
