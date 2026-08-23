import React, { useState } from 'react';
import { Trash2, AlertTriangle, RefreshCw, Database, Sparkles } from 'lucide-react';

interface ClearDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmClear: (options: {
    clearTransactions: boolean;
    clearProductions: boolean;
    clearMaterials: boolean;
    clearRecipes: boolean;
  }) => void;
  onRestoreSampleData: () => void;
  counts: {
    materials: number;
    recipes: number;
    productions: number;
    transactions: number;
  };
}

export const ClearDataModal: React.FC<ClearDataModalProps> = ({
  isOpen,
  onClose,
  onConfirmClear,
  onRestoreSampleData,
  counts,
}) => {
  const [clearTransactions, setClearTransactions] = useState(true);
  const [clearProductions, setClearProductions] = useState(true);
  const [clearMaterials, setClearMaterials] = useState(false);
  const [clearRecipes, setClearRecipes] = useState(false);

  if (!isOpen) return null;

  const handleClear = () => {
    onConfirmClear({
      clearTransactions,
      clearProductions,
      clearMaterials,
      clearRecipes,
    });
    onClose();
  };

  const handleClearAll = () => {
    onConfirmClear({
      clearTransactions: true,
      clearProductions: true,
      clearMaterials: true,
      clearRecipes: true,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-rose-50 border-b border-rose-100 p-5 flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              ล้าง / เคลียร์ข้อมูลตัวอย่างในระบบ
            </h3>
            <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
              เคลียร์ข้อมูลบันทึกประจำวันหรือโครงสร้าง เพื่อให้พร้อมสำหรับกรอกข้อมูลการใช้งานจริงของร้านคุณ
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              เลือกข้อมูลที่ต้องการเคลียร์:
            </div>

            <label className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={clearProductions}
                  onChange={(e) => setClearProductions(e.target.checked)}
                  className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                />
                <div>
                  <div className="text-xs font-semibold text-slate-800">
                    Tab 3: บันทึกการผลิตรายวัน (Daily Production)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    ยอดผลิต, ส่งสาขา A/B, ของเหลือสาขา A/B
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                {counts.productions} แถว
              </span>
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={clearTransactions}
                  onChange={(e) => setClearTransactions(e.target.checked)}
                  className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                />
                <div>
                  <div className="text-xs font-semibold text-slate-800">
                    Tab 4: ประวัติรับเข้าและเบิกใช้จริง (Stock Transactions)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    ประวัติเคลื่อนไหว Stock In / Stock Out
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                {counts.transactions} แถว
              </span>
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={clearMaterials}
                  onChange={(e) => setClearMaterials(e.target.checked)}
                  className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                />
                <div>
                  <div className="text-xs font-semibold text-slate-800">
                    Tab 1: ทะเบียนวัตถุดิบ (Master Materials)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    รหัสวัตถุดิบ, ยอดยกมา, Safety Stock
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                {counts.materials} รายการ
              </span>
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 cursor-pointer transition-colors">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={clearRecipes}
                  onChange={(e) => setClearRecipes(e.target.checked)}
                  className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                />
                <div>
                  <div className="text-xs font-semibold text-slate-800">
                    Tab 2: สูตร BOM มาตรฐาน (BOM Recipe)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    โครงสร้างสูตรส่วนผสมสินค้าแต่ละเมนู
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                {counts.recipes} รายการ
              </span>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <span>ต้องการโหลดข้อมูลตัวอย่างกลับมาศึกษาทีหลัง?</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onRestoreSampleData();
                onClose();
              }}
              className="font-bold text-blue-700 hover:underline shrink-0"
            >
              โหลดตัวอย่างเดิม
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleClearAll}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>เคลียร์ทั้งหมด (Clear All)</span>
          </button>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={!clearProductions && !clearTransactions && !clearMaterials && !clearRecipes}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white shadow-xs transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>ยืนยันเคลียร์ข้อมูลที่เลือก</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
