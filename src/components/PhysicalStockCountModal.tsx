import React, { useState, useEffect, useMemo } from 'react';
import {
  MasterMaterial,
  BOMRecipe,
  DailyProduction,
  StockTransaction,
  MonthlyStockCountRecord,
  PhysicalStockCountItem,
} from '../types/stock';
import { generateMonthlySummaryForPeriod } from '../utils/calculations';
import {
  X,
  ClipboardCheck,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Search,
  User,
  Calendar,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';

interface PhysicalStockCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: MasterMaterial[];
  recipes: BOMRecipe[];
  productions: DailyProduction[];
  transactions: StockTransaction[];
  selectedMonth?: string;
  onSaveStockCount: (
    record: MonthlyStockCountRecord,
    applyAsOpeningStock: boolean
  ) => void;
  existingRecord?: MonthlyStockCountRecord | null;
}

export const PhysicalStockCountModal: React.FC<PhysicalStockCountModalProps> = ({
  isOpen,
  onClose,
  materials,
  recipes,
  productions,
  transactions,
  selectedMonth = new Date().toISOString().substring(0, 7),
  onSaveStockCount,
  existingRecord,
}) => {
  const [month, setMonth] = useState<string>(selectedMonth);
  const [countDate, setCountDate] = useState<string>(
    () => new Date().toISOString().substring(0, 10)
  );
  const [countedBy, setCountedBy] = useState<string>('พนักงานประจำร้าน / ทีมผลิต');
  const [note, setNote] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [applyAsOpening, setApplyAsOpening] = useState<boolean>(true);
  const [isSavedSuccess, setIsSavedSuccess] = useState<boolean>(false);

  // Calculate the current calculated system ending stocks for the chosen month
  const systemSummaries = useMemo(() => {
    return generateMonthlySummaryForPeriod(
      materials,
      recipes,
      productions,
      transactions,
      month
    );
  }, [materials, recipes, productions, transactions, month]);

  // Map of RM_Code -> Counted Qty string/number
  const [counts, setCounts] = useState<{ [rmCode: string]: string }>({});
  const [itemNotes, setItemNotes] = useState<{ [rmCode: string]: string }>({});

  // Initialize or load existing records
  useEffect(() => {
    if (isOpen) {
      setIsSavedSuccess(false);
      setMonth(selectedMonth === 'all' ? new Date().toISOString().substring(0, 7) : selectedMonth);
      setCountDate(new Date().toISOString().substring(0, 10));

      if (existingRecord) {
        setCountedBy(existingRecord.Counted_By || 'พนักงานประจำร้าน / ทีมผลิต');
        setNote(existingRecord.Note || '');
        const countMap: { [rmCode: string]: string } = {};
        const noteMap: { [rmCode: string]: string } = {};
        existingRecord.Items.forEach((it) => {
          countMap[it.RM_Code] = it.Counted_Qty.toString();
          if (it.Note) noteMap[it.RM_Code] = it.Note;
        });
        setCounts(countMap);
        setItemNotes(noteMap);
      } else {
        // Pre-fill with system ending stock as a starting baseline
        const countMap: { [rmCode: string]: string } = {};
        systemSummaries.forEach((s) => {
          countMap[s.RM_Code] = s.Ending_Stock.toString();
        });
        setCounts(countMap);
        setItemNotes({});
      }
    }
  }, [isOpen, existingRecord, selectedMonth, systemSummaries]);

  if (!isOpen) return null;

  const handleCountChange = (rmCode: string, val: string) => {
    setCounts((prev) => ({
      ...prev,
      [rmCode]: val,
    }));
  };

  const handleItemNoteChange = (rmCode: string, val: string) => {
    setItemNotes((prev) => ({
      ...prev,
      [rmCode]: val,
    }));
  };

  const handleCopyAllSystemValues = () => {
    const map: { [rmCode: string]: string } = {};
    systemSummaries.forEach((s) => {
      map[s.RM_Code] = s.Ending_Stock.toString();
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

  // Filtered materials by search term
  const filteredSummaries = systemSummaries.filter(
    (s) =>
      s.RM_Code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.RM_Name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Variance analytics
  const countStats = useMemo(() => {
    let exactCount = 0;
    let shortageCount = 0;
    let overageCount = 0;
    let totalItems = systemSummaries.length;

    systemSummaries.forEach((s) => {
      const counted = parseFloat(counts[s.RM_Code]) || 0;
      const diff = Number((counted - s.Ending_Stock).toFixed(3));
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

    const items: PhysicalStockCountItem[] = systemSummaries.map((s) => {
      const counted = parseFloat(counts[s.RM_Code]) || 0;
      const variance = Number((counted - s.Ending_Stock).toFixed(3));
      return {
        RM_Code: s.RM_Code,
        RM_Name: s.RM_Name,
        Unit: s.Unit,
        System_Qty: s.Ending_Stock,
        Counted_Qty: counted,
        Variance: variance,
        Note: itemNotes[s.RM_Code] || '',
      };
    });

    const record: MonthlyStockCountRecord = {
      id: existingRecord?.id || `count-${Date.now()}`,
      Month: month,
      Count_Date: countDate,
      Counted_By: countedBy || 'พนักงานหน้าบ้าน',
      Note: note,
      Items: items,
      CreatedAt: new Date().toISOString(),
      AppliedAsOpening: applyAsOpening,
    };

    onSaveStockCount(record, applyAsOpening);
    setIsSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 relative my-6 flex flex-col max-h-[92vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Title */}
        <div className="flex items-start sm:items-center gap-3.5 mb-4 pr-8">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[11px] font-bold mb-1">
              <span>หน้าบ้าน / พนักงานตรวจนับสต็อกประจำเดือน</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              บันทึกผลการเช็คสต็อกสิ้นเดือนที่เกิดขึ้นจริง (Physical Stock Count)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ดึงรายการวัตถุดิบทั้งหมดจาก <b>ทะเบียนวัตถุดิบ (Master Materials)</b> ที่คุณสร้างไว้ ({materials.length} รายการ) เพื่อให้พนักงานตรวจนับจริง
            </p>
          </div>
        </div>

        {/* Sync Info Banner */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-800 text-xs mb-3.5">
          <Layers className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <b>เชื่อมต่อกับทะเบียนวัตถุดิบ:</b> รายการที่แสดงด้านล่างคือรายการวัตถุดิบทั้งหมดจากแท็บ <b>ทะเบียนวัตถุดิบ (Master_Materials)</b> เมื่อบันทึกพร้อมยกยอด ระบบจะนำค่านับจริงไปอัปเดตเป็นสต็อกยกมา (Opening Stock) ในทะเบียนวัตถุดิบให้ทันที
          </span>
        </div>

        {/* Form Meta Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 mb-4 text-xs">
          <div>
            <label className="block text-slate-600 font-semibold mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              ประจำเดือน (Month)
            </label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              วันที่ตรวจนับจริง (Count Date)
            </label>
            <input
              type="date"
              value={countDate}
              onChange={(e) => setCountDate(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-semibold mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              ชื่อผู้ตรวจนับ (Counted By)
            </label>
            <input
              type="text"
              placeholder="ระบุชื่อพนักงานผู้ตรวจนับ"
              value={countedBy}
              onChange={(e) => setCountedBy(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Quick KPI Stat Bar */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="bg-slate-100/70 border border-slate-200 p-2.5 rounded-xl text-center">
            <div className="text-[11px] text-slate-500 font-medium">รายการทั้งหมด</div>
            <div className="text-base font-bold text-slate-900 font-mono">
              {countStats.totalItems} รายการ
            </div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-center">
            <div className="text-[11px] text-emerald-700 font-medium flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              ยอดตรงตามระบบ
            </div>
            <div className="text-base font-bold text-emerald-700 font-mono">
              {countStats.exactCount} รายการ
            </div>
          </div>
          <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-center">
            <div className="text-[11px] text-rose-700 font-medium flex items-center justify-center gap-1">
              <TrendingDown className="w-3 h-3 text-rose-600" />
              สต็อกขาด (สูญหาย)
            </div>
            <div className="text-base font-bold text-rose-700 font-mono">
              {countStats.shortageCount} รายการ
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-xl text-center">
            <div className="text-[11px] text-blue-700 font-medium flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3 text-blue-600" />
              สต็อกเกิน
            </div>
            <div className="text-base font-bold text-blue-700 font-mono">
              {countStats.overageCount} รายการ
            </div>
          </div>
        </div>

        {/* Table Search & Quick Batch Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mb-2.5">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหารหัส หรือ ชื่อวัตถุดิบ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyAllSystemValues}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors flex items-center gap-1"
              title="คัดลอกยอดสต็อกตามระบบมาใส่เป็นค่านับจริงเริ่มต้น"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ดึงยอดระบบมาใส่ทุกรายการ</span>
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200 transition-colors"
            >
              รีเซ็ตเป็น 0
            </button>
          </div>
        </div>

        {/* Scrollable Table of Materials */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-[42vh] shadow-inner bg-white">
            <div className="bg-slate-100 sticky top-0 z-10 px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider grid grid-cols-12 items-center">
              <span className="col-span-4">วัตถุดิบ (Material)</span>
              <span className="col-span-3 text-right">ยอดคำนวณตามระบบ (System)</span>
              <span className="col-span-3 text-right">ยอดนับจริงสิ้นเดือน (Physical Count)</span>
              <span className="col-span-2 text-right">ผลต่าง (Variance)</span>
            </div>

            {filteredSummaries.map((s) => {
              const countedVal = counts[s.RM_Code] !== undefined ? counts[s.RM_Code] : s.Ending_Stock.toString();
              const numCounted = parseFloat(countedVal) || 0;
              const variance = Number((numCounted - s.Ending_Stock).toFixed(3));
              const isExact = Math.abs(variance) < 0.001;
              const isShortage = variance < -0.001;
              const isOverage = variance > 0.001;

              return (
                <div
                  key={s.RM_Code}
                  className={`px-4 py-2.5 grid grid-cols-12 items-center hover:bg-slate-50 transition-colors ${
                    isShortage ? 'bg-rose-50/40' : isOverage ? 'bg-blue-50/30' : ''
                  }`}
                >
                  {/* Col 1: Material Details */}
                  <div className="col-span-4 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                        {s.RM_Code}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 line-clamp-1">
                        {s.RM_Name}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      หน่วย: <span className="font-medium text-slate-600">{s.Unit}</span>
                    </div>
                  </div>

                  {/* Col 2: System Ending Stock */}
                  <div className="col-span-3 text-right font-mono pr-3">
                    <div className="text-xs font-bold text-slate-700">
                      {s.Ending_Stock.toLocaleString()} {s.Unit}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      (ยกมา {s.Opening_Stock} + รับ {s.Total_Receive} - ใช้ {s.Actual_Usage})
                    </div>
                  </div>

                  {/* Col 3: Actual Physical Count Input */}
                  <div className="col-span-3 flex items-center justify-end gap-1.5">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={countedVal}
                      onChange={(e) => handleCountChange(s.RM_Code, e.target.value)}
                      className={`w-28 px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold text-right focus:outline-none focus:ring-2 ${
                        isShortage
                          ? 'border-rose-300 bg-rose-50 text-rose-900 focus:ring-rose-500'
                          : isOverage
                          ? 'border-blue-300 bg-blue-50 text-blue-900 focus:ring-blue-500'
                          : 'border-slate-300 bg-white text-slate-900 focus:ring-indigo-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => handleCountChange(s.RM_Code, s.Ending_Stock.toString())}
                      className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] text-slate-600 font-semibold"
                      title="กดยอดตามระบบ"
                    >
                      =
                    </button>
                  </div>

                  {/* Col 4: Variance */}
                  <div className="col-span-2 text-right font-mono">
                    {isExact ? (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3" />
                        0.00
                      </span>
                    ) : isShortage ? (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800" title="สต็อกจริงขาดไป">
                        <TrendingDown className="w-3 h-3" />
                        {variance.toLocaleString()} {s.Unit}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800" title="สต็อกจริงเกินมา">
                        <TrendingUp className="w-3 h-3" />
                        +{variance.toLocaleString()} {s.Unit}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Roll-over explanation & Setting */}
          <div className="mt-3 p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={applyAsOpening}
                onChange={(e) => setApplyAsOpening(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-indigo-300 focus:ring-indigo-500"
              />
              <div className="text-xs">
                <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>ยกยอดนับจริงนี้ไปเป็นยอดยกมาต้นเดือนถัดไป (Roll-over to Next Month Opening Stock)</span>
                </div>
                <p className="text-[11px] text-indigo-800 mt-0.5 leading-relaxed">
                  เมื่อเปิดใช้งาน ระบบจะนำตัวเลขยอดนับจริงสิ้นเดือนนี้ไปบันทึกเป็น <b>ยอดยกมา (Opening_Stock)</b> ในทะเบียนวัตถุดิบทันที เพื่อให้ระบบคำนวณสต็อกในเดือนถัดไปได้อย่างถูกต้องแม่นยำตามของจริง
                </p>
              </div>
            </label>
          </div>

          {/* Footer Submit Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 mt-3">
            <div className="text-xs text-slate-500">
              บันทึกผลนับจริง {systemSummaries.length} รายการวัตถุดิบ
            </div>

            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                ยกเลิก
              </button>

              <button
                type="submit"
                disabled={isSavedSuccess}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all ${
                  isSavedSuccess
                    ? 'bg-emerald-600'
                    : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                }`}
              >
                {isSavedSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>บันทึกและยกยอดสำเร็จเรียบร้อย!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>
                      {applyAsOpening
                        ? 'บันทึก & ยกยอดนับจริงเป็นสต็อกต้นเดือน'
                        : 'บันทึกผลการตรวจนับอย่างเดียว'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
