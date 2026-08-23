import React, { useState, useEffect } from 'react';
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
  const [rmCode, setRmCode] = useState<string>(materials[0]?.RM_Code || '');
  const [qty, setQty] = useState<number>(10);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [recorder, setRecorder] = useState<string>('พนักงานคลังสินค้า');
  const [note, setNote] = useState<string>('');

  useEffect(() => {
    if (initialData) {
      setType(initialData.Type);
      setRmCode(initialData.RM_Code);
      setQty(initialData.Qty);
      setDate(initialData.Date);
      setRecorder(initialData.Recorder || '');
      setNote(initialData.Note || '');
    } else {
      setType(initialType);
      setRmCode(materials[0]?.RM_Code || '');
      setQty(10);
      setDate(new Date().toISOString().split('T')[0]);
      setRecorder('พนักงานคลังสินค้า');
      setNote('');
    }
  }, [initialData, initialType, isOpen, materials]);

  if (!isOpen) return null;

  const currentSummary = summaries.find((s) => s.RM_Code === rmCode);
  const currentEnding = currentSummary ? currentSummary.Ending_Stock : 0;
  const currentMaterial = materials.find((m) => m.RM_Code === rmCode);
  const unit = currentMaterial ? currentMaterial.Unit : '';

  const projectedEnding =
    type === 'Receive' ? currentEnding + (Number(qty) || 0) : currentEnding - (Number(qty) || 0);

  const isLowProjected = currentMaterial && projectedEnding <= currentMaterial.Safety_Stock;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rmCode || qty <= 0) return;

    onSave({
      Date: date,
      Type: type,
      RM_Code: rmCode,
      Qty: Number(qty),
      Recorder: recorder.trim(),
      Note: note.trim(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-slate-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              type === 'Receive' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
            }`}
          >
            {type === 'Receive' ? (
              <ArrowDownLeft className="w-6 h-6" />
            ) : (
              <ArrowUpRight className="w-6 h-6" />
            )}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {initialData ? 'แก้ไขรายการเคลื่อนไหววัตถุดิบ' : 'บันทึกการเคลื่อนไหววัตถุดิบ (Stock Transaction)'}
            </h2>
            <p className="text-xs text-slate-500">
              บันทึกเข้า Tab <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">Stock_Transactions</code> {initialData ? '(อัปเดตข้อมูล)' : 'และตัดสต็อกอัตโนมัติ'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Switcher */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              ประเภทรายการ (Transaction Type)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('Receive')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  type === 'Receive'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>Receive (รับเข้า)</span>
              </button>
              <button
                type="button"
                onClick={() => setType('Actual Usage')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  type === 'Actual Usage'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Actual Usage (เบิกใช้จริง)</span>
              </button>
            </div>
          </div>

          {/* Date & RM_Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                วันที่ (Date) *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                เลือกวัตถุดิบ (RM_Code) *
              </label>
              <select
                value={rmCode}
                onChange={(e) => setRmCode(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {materials.map((m) => (
                  <option key={m.RM_Code} value={m.RM_Code}>
                    {m.RM_Code} - {m.RM_Name} ({m.Unit})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Qty & Live Balance Preview */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">สต๊อกคงเหลือปัจจุบัน:</span>
              <span className="font-mono font-bold text-slate-900">
                {currentEnding.toLocaleString()} {unit}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                จำนวนที่{type === 'Receive' ? 'รับเข้า' : 'เบิกใช้'} (Qty) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  required
                  value={qty}
                  onChange={(e) => setQty(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono font-bold text-slate-900 pr-12 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                  {unit}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
              <span className="text-slate-600">สต๊อกคงเหลือหลังทำรายการ:</span>
              <span
                className={`font-mono font-bold ${
                  projectedEnding < 0
                    ? 'text-rose-600'
                    : isLowProjected
                    ? 'text-amber-600'
                    : 'text-emerald-700'
                }`}
              >
                {projectedEnding.toLocaleString()} {unit}
              </span>
            </div>

            {isLowProjected && (
              <div className="text-[11px] text-rose-600 flex items-center gap-1 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>คำเตือน: ยอดคงเหลือจะต่ำกว่า Safety Stock ({currentMaterial?.Safety_Stock} {unit})</span>
              </div>
            )}
          </div>

          {/* Recorder & Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ผู้บันทึก (Recorder)
              </label>
              <input
                type="text"
                value={recorder}
                onChange={(e) => setRecorder(e.target.value)}
                placeholder="ชื่อผู้เบิก/ผู้รับ"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                หมายเหตุ (Note)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="เช่น ผลิตเค้ก PO#01"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className={`px-5 py-2 rounded-lg text-xs font-bold text-white shadow-xs transition-all ${
                type === 'Receive'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              บันทึกรายการ {type === 'Receive' ? 'รับเข้า' : 'เบิกใช้'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
