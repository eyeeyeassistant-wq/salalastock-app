import React, { useState } from 'react';
import { MasterMaterial } from '../types/stock';
import { X, Calendar, Check, Save, Layers, AlertCircle } from 'lucide-react';

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
  const [openingValues, setOpeningValues] = useState<{ [code: string]: number }>(() => {
    const map: { [code: string]: number } = {};
    materials.forEach((m) => {
      map[m.RM_Code] = m.Opening_Stock;
    });
    return map;
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      const map: { [code: string]: number } = {};
      materials.forEach((m) => {
        map[m.RM_Code] = m.Opening_Stock;
      });
      setOpeningValues(map);
      setSavedSuccess(false);
    }
  }, [isOpen, materials]);

  if (!isOpen) return null;

  const handleChange = (code: string, val: number) => {
    setOpeningValues((prev) => ({
      ...prev,
      [code]: Math.max(0, val),
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = Object.entries(openingValues).map(([RM_Code, Opening_Stock]) => ({
      RM_Code,
      Opening_Stock,
    }));
    onSaveOpeningStocks(payload);
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-xl border border-slate-200 relative my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              บันทึกยอดยกมาต้นเดือน (Beginning of Month Opening Stock)
            </h2>
            <p className="text-xs text-slate-500">
              กรอกยอดสต็อกที่นับจริง ณ วันที่ 1 ของเดือน เพื่อใช้เป็นฐานคำนวณ Ending Stock และ Variance
            </p>
          </div>
        </div>

        <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl mb-4 text-xs text-blue-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">ระบบหน้าบ้าน (Staff Entry):</span>{' '}
            พนักงานสามารถกรอกผลนับสต็อกต้นเดือนได้สะดวก โดยไม่สามารถแก้ไขชื่อหรือสูตรของวัตถุดิบได้
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="max-h-[50vh] overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
            <div className="bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-600 uppercase tracking-wider grid grid-cols-12">
              <span className="col-span-3">รหัสวัตถุดิบ</span>
              <span className="col-span-5">ชื่อวัตถุดิบ</span>
              <span className="col-span-4 text-right">ยอดยกมา (Opening)</span>
            </div>

            {materials.map((m) => (
              <div key={m.RM_Code} className="px-4 py-3 grid grid-cols-12 items-center hover:bg-slate-50/80 transition-colors">
                <div className="col-span-3">
                  <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    {m.RM_Code}
                  </span>
                </div>
                <div className="col-span-5">
                  <span className="text-xs font-medium text-slate-800">{m.RM_Name}</span>
                </div>
                <div className="col-span-4 flex items-center justify-end gap-2">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={openingValues[m.RM_Code] ?? m.Opening_Stock}
                    onChange={(e) => handleChange(m.RM_Code, parseFloat(e.target.value) || 0)}
                    className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-bold text-right text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={savedSuccess}
                className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold text-white shadow-xs transition-all ${
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
