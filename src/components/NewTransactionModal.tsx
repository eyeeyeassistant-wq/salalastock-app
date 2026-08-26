import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MasterMaterial,
  StockTransaction,
  TransactionType,
  MonthlyStockSummary,
} from '../types/stock';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Package,
  Calendar,
  UserCheck,
  FileText,
  X,
  AlertTriangle,
  Search,
  Check,
  ChevronDown,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface NewTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: MasterMaterial[];
  summaries: MonthlyStockSummary[];
  initialType?: TransactionType;
  initialData?: StockTransaction | null;
  onSave: (transaction: StockTransaction) => void;
}

export const NewTransactionModal: React.FC<NewTransactionModalProps> = ({
  isOpen,
  onClose,
  materials,
  summaries,
  initialType = 'Receive',
  initialData,
  onSave,
}) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [rmCode, setRmCode] = useState<string>('');
  const [qtyStr, setQtyStr] = useState<string>('10');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [recorder, setRecorder] = useState<string>('พนักงานคลังสินค้า');
  const [note, setNote] = useState<string>('');
  const [searchMaterial, setSearchMaterial] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  // Initialize or update fields when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setIsDropdownOpen(false);
      setSearchMaterial('');

      if (initialData) {
        setType(initialData.Type);
        setRmCode(initialData.RM_Code);
        setQtyStr(initialData.Qty.toString());
        setDate(initialData.Date);
        setRecorder(initialData.Recorder || '');
        setNote(initialData.Note || '');
      } else {
        setType(initialType);
        // Default to first material if available
        const defaultCode = materials[0]?.RM_Code || '';
        setRmCode(defaultCode);
        setQtyStr('10');
        setDate(new Date().toISOString().split('T')[0]);
        setRecorder('พนักงานคลังสินค้า');
        setNote('');
      }
    }
  }, [isOpen, initialData, initialType]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter materials for dropdown
  const filteredMaterials = useMemo(() => {
    if (!searchMaterial.trim()) return materials;
    const term = searchMaterial.toLowerCase().trim();
    return materials.filter(
      (m) =>
        m.RM_Code.toLowerCase().includes(term) ||
        m.RM_Name.toLowerCase().includes(term) ||
        m.Unit.toLowerCase().includes(term)
    );
  }, [materials, searchMaterial]);

  const selectedMaterial = useMemo(() => {
    return materials.find((m) => m.RM_Code === rmCode) || materials[0] || null;
  }, [materials, rmCode]);

  const currentSummary = useMemo(() => {
    return summaries.find((s) => s.RM_Code === rmCode);
  }, [summaries, rmCode]);

  const currentEnding = currentSummary ? currentSummary.Ending_Stock : (selectedMaterial?.Opening_Stock || 0);
  const unit = selectedMaterial ? selectedMaterial.Unit : '';

  // Parse entered quantity cleanly
  const numericQty = useMemo(() => {
    const clean = qtyStr.replace(',', '.').trim();
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : val;
  }, [qtyStr]);

  const projectedEnding =
    type === 'Receive' ? currentEnding + numericQty : currentEnding - numericQty;

  const isLowProjected = selectedMaterial && projectedEnding <= selectedMaterial.Safety_Stock;

  if (!isOpen) return null;

  const handleSelectMaterial = (code: string) => {
    setRmCode(code);
    setIsDropdownOpen(false);
    setSearchMaterial('');
    setErrorMessage(null);
  };

  const handleQuickAddQty = (amount: number) => {
    const current = numericQty;
    const nextVal = Math.max(0, current + amount);
    setQtyStr(nextVal.toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!rmCode) {
      setErrorMessage('กรุณาเลือกรายการวัตถุดิบ');
      return;
    }

    if (numericQty <= 0) {
      setErrorMessage('กรุณากรอกจำนวนที่มากกว่า 0');
      qtyInputRef.current?.focus();
      return;
    }

    onSave({
      Date: date,
      Type: type,
      RM_Code: rmCode,
      Qty: numericQty,
      Recorder: recorder.trim() || 'พนักงานคลังสินค้า',
      Note: note.trim(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative border border-slate-200 my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Close modal"
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5 pr-8">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
              type === 'Receive'
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                : 'bg-blue-100 text-blue-700 border border-blue-200'
            }`}
          >
            {type === 'Receive' ? (
              <ArrowDownLeft className="w-6 h-6" />
            ) : (
              <ArrowUpRight className="w-6 h-6" />
            )}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              {initialData ? 'แก้ไขรายการเคลื่อนไหววัตถุดิบ' : type === 'Receive' ? 'บันทึกรับเข้าวัตถุดิบ (Receive)' : 'บันทึกเบิกใช้วัตถุดิบจริง (Actual Usage)'}
            </h2>
            <p className="text-xs text-slate-500">
              กรอกยอดรับหรือเบิก เพื่อตัดและอัปเดตสต็อกคงเหลือแบบเรียลไทม์
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Switcher */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              ประเภทรายการ (Transaction Type)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('Receive');
                  setErrorMessage(null);
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  type === 'Receive'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-600/20'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>Receive (รับเข้าคลัง)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('Actual Usage');
                  setErrorMessage(null);
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  type === 'Actual Usage'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-600/20'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Actual Usage (เบิกใช้จริง)</span>
              </button>
            </div>
          </div>

          {/* Material Selection (Searchable & Clickable) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              เลือกรายการวัตถุดิบ (Raw Material) *
            </label>

            {/* Custom Searchable Material Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-left flex items-center justify-between gap-2 text-xs transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {selectedMaterial ? (
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-900 shrink-0">
                      {selectedMaterial.RM_Code}
                    </span>
                    <span className="font-semibold text-slate-800 truncate">
                      {selectedMaterial.RM_Name}
                    </span>
                    <span className="text-slate-400 text-[11px] shrink-0">
                      ({selectedMaterial.Unit})
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-400">คลิกเลือกวัตถุดิบ...</span>
                )}
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              {/* Dropdown Popup */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl z-50 p-2 space-y-2 max-h-64 flex flex-col">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="พิมพ์ค้นหารหัส หรือ ชื่อวัตถุดิบ..."
                      value={searchMaterial}
                      onChange={(e) => setSearchMaterial(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="overflow-y-auto flex-1 divide-y divide-slate-50 custom-scrollbar">
                    {filteredMaterials.length === 0 ? (
                      <div className="py-4 text-center text-xs text-slate-400">
                        ไม่พบวัตถุดิบที่ค้นหา
                      </div>
                    ) : (
                      filteredMaterials.map((m) => {
                        const isSelected = m.RM_Code === rmCode;
                        const sum = summaries.find((s) => s.RM_Code === m.RM_Code);
                        const curStock = sum ? sum.Ending_Stock : m.Opening_Stock;

                        return (
                          <button
                            key={m.RM_Code}
                            type="button"
                            onClick={() => handleSelectMaterial(m.RM_Code)}
                            className={`w-full px-2.5 py-2 text-left text-xs rounded-lg flex items-center justify-between gap-2 transition-colors ${
                              isSelected
                                ? 'bg-blue-50 text-blue-900 font-semibold'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono font-bold text-[11px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded">
                                {m.RM_Code}
                              </span>
                              <span className="truncate">{m.RM_Name}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 shrink-0 font-mono">
                              คงเหลือ {curStock} {m.Unit}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick-Pick Material Pills (Top 5 Materials) */}
            {materials.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[11px] text-slate-400">เลือกเร็ว:</span>
                {materials.slice(0, 4).map((m) => (
                  <button
                    key={m.RM_Code}
                    type="button"
                    onClick={() => handleSelectMaterial(m.RM_Code)}
                    className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                      rmCode === m.RM_Code
                        ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {m.RM_Code} {m.RM_Name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              วันที่ทำรายการ (Date) *
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Quantity Input (Direct Typing & No Steppers) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">สต๊อกคงเหลือปัจจุบัน:</span>
              <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                {currentEnding.toLocaleString()} {unit}
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-800">
                  จำนวนที่ต้องการ{type === 'Receive' ? 'รับเข้า' : 'เบิกใช้'} ({unit}) *
                </label>
                <span className="text-[11px] text-blue-600 font-medium">
                  ✏️ พิมพ์ตัวเลขได้โดยตรง
                </span>
              </div>

              <div className="relative">
                <input
                  ref={qtyInputRef}
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[.,]?[0-9]*"
                  required
                  value={qtyStr}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    setQtyStr(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="เช่น 10 หรือ 2.5"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-lg font-mono font-bold text-slate-900 pr-14 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-500">
                  {unit}
                </span>
              </div>
            </div>

            {/* Quick Value Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[11px] text-slate-500">บวกเพิ่มเร็ว:</span>
              {[1, 5, 10, 50, 100].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAddQty(val)}
                  className="text-[11px] font-mono font-bold px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 active:scale-95 transition-all"
                >
                  +{val}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setQtyStr('')}
                className="text-[11px] px-2 py-1 rounded-lg text-slate-500 hover:text-slate-700 underline ml-auto"
              >
                ล้างเลข
              </button>
            </div>

            {/* Live Balance Preview */}
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
              <span className="text-slate-600 font-medium">สต๊อกคงเหลือหลังทำรายการ:</span>
              <span
                className={`font-mono font-bold text-sm ${
                  projectedEnding < 0
                    ? 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200'
                    : isLowProjected
                    ? 'text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200'
                    : 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200'
                }`}
              >
                {projectedEnding.toLocaleString()} {unit}
              </span>
            </div>

            {isLowProjected && (
              <div className="text-[11px] text-amber-700 bg-amber-50/80 p-2 rounded-xl border border-amber-200 flex items-center gap-1.5 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                <span>คำเตือน: ยอดคงเหลือจะต่ำกว่า Safety Stock ({selectedMaterial?.Safety_Stock} {unit})</span>
              </div>
            )}
          </div>

          {/* Recorder & Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ผู้บันทึก (Recorder)
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={recorder}
                  onChange={(e) => setRecorder(e.target.value)}
                  placeholder="ชื่อผู้เบิก/ผู้รับ"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                หมายเหตุ (Note)
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="เช่น ผลิตเค้ก PO#01"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-all flex items-center gap-1.5 ${
                type === 'Receive'
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-98'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-98'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>บันทึกรายการ {type === 'Receive' ? 'รับเข้า' : 'เบิกใช้'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
