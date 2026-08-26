import React, { useState, useEffect } from 'react';
import { MasterMaterial } from '../types/stock';
import { X, Check, Save, Layers, AlertCircle } from 'lucide-react';

interface OpeningStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: MasterMaterial[];
  onSaveOpeningStocks: (updated: { RM_Code: string; Opening_Stock: number }[]) => void;
}

export const OpeningStockModal: React.FC<OpeningStockModalProps> = ({
  isOpen,
  onClose,
  materials,
  onSaveOpeningStocks,
}) => {
  const [openingValues, setOpeningValues] = useState<{ [code: string]: string }>({});
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      const map: { [code: string]: string } = {};
      materials.forEach((m) => {
        map[m.RM_Code] = (m.Opening_Stock ?? 0).toString();
      });
      setOpeningValues(map);
      setSavedSuccess(false);
    }
  }, [isOpen, materials]);

  if (!isOpen) return null;

  const handleChange = (code: string, val: string) => {
    setOpeningValues((prev) => ({
      ...prev,
      [code]: val,
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = Object.entries(openingValues).map(([RM_Code, valStr]) => {
      const num = parseFloat(String(valStr || '0').replace(',', '.'));
      return {
        RM_Code,
        Opening_Stock: isNaN(num) ? 0 : Math.max(0, num),
      };
    });
    onSaveOpeningStocks(payload);
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-xl border border-slate-200 relative my-8">
        <button
          onClick={onClose}
          type="button"
          aria-label="Close modal"
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4 pr-8">
          <div className="w-11 h-11 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700 shrink-0 border border-blue-200">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              บันทึกยอดยกมาต้นเดือน (Beginning Opening Stock)
            </h2>
            <p className="text-xs text-slate-500">
              กรอกสต็อกยกมาเริ่มต้น เพื่อใช้เป็นฐานคำนวณ Ending Stock และ Variance
            </p>
          </div>
        </div>

        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl mb-4 text-xs text-blue-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">ระบบกรอกสะดวก:</span>{' '}
            พนักงานสามารถคลิกและพิมพ์ตัวเลขยอดสต็อกได้โดยตรง
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="max-h-[50vh] overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 custom-scrollbar">
            <div className="bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wider grid grid-cols-12 sticky top-0 z-10 border-b border-slate-200">
              <span className="col-span-3">รหัสวัตถุดิบ</span>
              <span className="col-span-5">ชื่อวัตถุดิบ</span>
              <span className="col-span-4 text-right">ยอดยกมา (Opening)</span>
            </div>

            {materials.map((m) => (
              <div key={m.RM_Code} className="px-4 py-2.5 grid grid-cols-12 items-center hover:bg-slate-50/80 transition-colors">
                <div className="col-span-3">
                  <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                    {m.RM_Code}
                  </span>
                </div>
                <div className="col-span-5 pr-2">
                  <span className="text-xs font-medium text-slate-800 line-clamp-1">{m.RM_Name}</span>
                </div>
                <div className="col-span-4 flex items-center justify-end gap-1.5">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={openingValues[m.RM_Code] ?? ''}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => handleChange(m.RM_Code, e.target.value)}
                    placeholder="0"
                    className="w-28 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-right text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                  <span className="text-xs text-slate-500 font-medium w-8 text-left">{m.Unit}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              รวมทั้งหมด {materials.length} รายการวัตถุดิบ
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={savedSuccess}
                className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-all ${
                  savedSuccess ? 'bg-emerald-600' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>บันทึกสำเร็จเรียบร้อย!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>บันทึกยอดยกมาต้นเดือน</span>
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
