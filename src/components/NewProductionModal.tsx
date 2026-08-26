import React, { useState, useEffect, useMemo } from 'react';
import { BOMRecipe, DailyProduction, MasterMaterial } from '../types/stock';
import {
  CalendarCheck,
  Truck,
  Zap,
  X,
  Check,
  Package,
} from 'lucide-react';

interface NewProductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipes: BOMRecipe[];
  materials: MasterMaterial[];
  initialData?: DailyProduction | null;
  onSave: (production: DailyProduction, autoDeduct: boolean) => void;
}

export const NewProductionModal: React.FC<NewProductionModalProps> = ({
  isOpen,
  onClose,
  recipes,
  materials,
  initialData,
  onSave,
}) => {
  // Unique products
  const productCodes: string[] = Array.from(new Set(recipes.map((r) => r.Product_Code)));

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [productCode, setProductCode] = useState(productCodes[0] || '');
  const [producedQtyStr, setProducedQtyStr] = useState<string>('50');
  const [dispatchAStr, setDispatchAStr] = useState<string>('25');
  const [dispatchBStr, setDispatchBStr] = useState<string>('25');
  const [autoDeduct, setAutoDeduct] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      if (initialData) {
        setDate(initialData.Date);
        setProductCode(initialData.Product_Code);
        setProducedQtyStr(initialData.Produced_Qty.toString());
        setDispatchAStr((initialData.Dispatch_Branch_A || 0).toString());
        setDispatchBStr((initialData.Dispatch_Branch_B || 0).toString());
        setAutoDeduct(true); // Default to auto-updating ingredient deductions on edit
      } else {
        setDate(new Date().toISOString().split('T')[0]);
        setProductCode(productCodes[0] || '');
        setProducedQtyStr('50');
        setDispatchAStr('25');
        setDispatchBStr('25');
        setAutoDeduct(true);
      }
    }
  }, [isOpen, initialData]);

  const numProduced = useMemo(() => {
    const v = parseFloat(producedQtyStr.replace(',', '.'));
    return isNaN(v) ? 0 : v;
  }, [producedQtyStr]);

  const numDispatchA = useMemo(() => {
    const v = parseFloat(dispatchAStr.replace(',', '.'));
    return isNaN(v) ? 0 : v;
  }, [dispatchAStr]);

  const numDispatchB = useMemo(() => {
    const v = parseFloat(dispatchBStr.replace(',', '.'));
    return isNaN(v) ? 0 : v;
  }, [dispatchBStr]);

  const totalDispatched = numDispatchA + numDispatchB;

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!productCode) {
      setErrorMsg('กรุณาเลือกสินค้าที่ผลิต');
      return;
    }

    if (numProduced <= 0) {
      setErrorMsg('กรุณากรอกยอดผลิตที่มากกว่า 0');
      return;
    }

    onSave(
      {
        Date: date,
        Product_Code: productCode,
        Produced_Qty: numProduced,
        Dispatch_Branch_A: numDispatchA,
        Dispatch_Branch_B: numDispatchB,
        Leftover_Branch_A: 0,
        Leftover_Branch_B: 0,
        Total_Dispatched: totalDispatched,
        Total_Leftover: 0,
      },
      autoDeduct
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative border border-slate-200 my-auto">
        <button
          onClick={onClose}
          type="button"
          aria-label="Close modal"
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4 pr-8">
          <div className="w-11 h-11 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700 shrink-0 border border-blue-200 shadow-xs">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              {initialData ? 'แก้ไขข้อมูลการผลิตและส่งสาขา' : 'บันทึกยอดผลิตและจัดส่งสาขา'}
            </h2>
            <p className="text-xs text-slate-500">
              บันทึกยอดผลิตจริง และกระจายส่งสาขา A / B
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date & Product */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                วันที่ผลิต (Date) *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                สินค้าที่ผลิต (Product_Code) *
              </label>
              <select
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {productCodes.map((code) => {
                  const r = recipes.find((item) => item.Product_Code === code);
                  return (
                    <option key={code} value={code}>
                      {code} - {r?.Product_Name || code}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Produced Qty (Direct Typing) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                ยอดผลิตจริง (Produced_Qty) *
              </label>
              <span className="text-[11px] text-blue-600 font-medium">
                ✏️ พิมพ์ตัวเลขได้โดยตรง
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                value={producedQtyStr}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  setProducedQtyStr(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="เช่น 50"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-lg font-mono font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-500">
                ชิ้น
              </span>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] text-slate-500">เลือกเร็ว:</span>
              {[10, 25, 50, 100, 200].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setProducedQtyStr(v.toString())}
                  className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 active:scale-95 transition-all"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Dispatch Branch A & B */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-900">
              <span className="flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-blue-600" />
                การจัดส่งกระจายสินค้า (Dispatch)
              </span>
              <span className="font-mono text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200 text-xs">
                รวมจัดส่ง: {totalDispatched.toLocaleString()} ชิ้น
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ส่งสาขา A (ชิ้น)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={dispatchAStr}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setDispatchAStr(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ส่งสาขา B (ชิ้น)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={dispatchBStr}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setDispatchBStr(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                />
              </div>
            </div>
          </div>

          {/* Auto-Deduct Checkbox */}
          <label className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 cursor-pointer">
            <input
              type="checkbox"
              checked={autoDeduct}
              onChange={(e) => setAutoDeduct(e.target.checked)}
              className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            <div className="text-xs">
              <span className="font-bold text-amber-950 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                {initialData
                  ? 'อัปเดต / ปรับยอดตัดสต็อกวัตถุดิบอัตโนมัติตามยอดผลิตใหม่นี้'
                  : 'ตัดสต็อกวัตถุดิบอัตโนมัติ (Auto-deduct) ตามสูตร BOM ทันที'}
              </span>
              <p className="text-[11px] text-amber-800 mt-0.5">
                {initialData
                  ? 'ระบบจะคำนวณและปรับเปลี่ยนยอดเบิกใช้จริง (Actual Usage) ของวัตถุดิบทุกรายการในสูตรให้ตรงกับยอดผลิตใหม่ทันที'
                  : 'ระบบจะสร้างรายการเบิก (Actual Usage) อัตโนมัติใน Tab เบิก/รับสต็อก ครบทุกวัตถุดิบในสูตร'}
              </p>
            </div>
          </label>

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
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all flex items-center gap-1.5 active:scale-98"
            >
              <Check className="w-4 h-4" />
              <span>บันทึกการผลิตและส่งสาขา</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
