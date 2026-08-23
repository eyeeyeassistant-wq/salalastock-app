import React, { useState, useEffect } from 'react';
import { BOMRecipe, DailyProduction, MasterMaterial } from '../types/stock';
import {
  CalendarCheck,
  Truck,
  Archive,
  Zap,
  X,
  Sparkles,
  Edit,
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
  const [producedQty, setProducedQty] = useState<number>(50);
  const [dispatchA, setDispatchA] = useState<number>(25);
  const [dispatchB, setDispatchB] = useState<number>(25);
  const [leftoverA, setLeftoverA] = useState<number>(0);
  const [leftoverB, setLeftoverB] = useState<number>(0);
  const [autoDeduct, setAutoDeduct] = useState(false);

  useEffect(() => {
    if (initialData) {
      setDate(initialData.Date);
      setProductCode(initialData.Product_Code);
      setProducedQty(initialData.Produced_Qty);
      setDispatchA(initialData.Dispatch_Branch_A);
      setDispatchB(initialData.Dispatch_Branch_B);
      setLeftoverA(initialData.Leftover_Branch_A);
      setLeftoverB(initialData.Leftover_Branch_B);
      setAutoDeduct(false);
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setProductCode(productCodes[0] || '');
      setProducedQty(50);
      setDispatchA(25);
      setDispatchB(25);
      setLeftoverA(0);
      setLeftoverB(0);
      setAutoDeduct(true);
    }
  }, [initialData, isOpen, recipes]);

  if (!isOpen) return null;

  const totalDispatched = (Number(dispatchA) || 0) + (Number(dispatchB) || 0);
  const totalLeftover = (Number(leftoverA) || 0) + (Number(leftoverB) || 0);

  const currentRecipeItems = recipes.filter((r) => r.Product_Code === productCode);
  const productName = currentRecipeItems[0]?.Product_Name || productCode;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productCode || producedQty <= 0) return;

    onSave(
      {
        Date: date,
        Product_Code: productCode,
        Produced_Qty: Number(producedQty),
        Dispatch_Branch_A: Number(dispatchA) || 0,
        Dispatch_Branch_B: Number(dispatchB) || 0,
        Leftover_Branch_A: Number(leftoverA) || 0,
        Leftover_Branch_B: Number(leftoverB) || 0,
        Total_Dispatched: totalDispatched,
        Total_Leftover: totalLeftover,
      },
      autoDeduct
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-slate-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {initialData ? 'แก้ไขข้อมูลการผลิตและส่งสาขา' : 'บันทึกยอดผลิต จัดส่ง และของเหลือสาขา'}
            </h2>
            <p className="text-xs text-slate-500">
              Tab <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">Daily_Production</code> {initialData ? '(อัปเดตข้อมูลที่แก้ไข)' : 'พร้อมระบบคำนวณและตัดสต็อกอัตโนมัติ'}
            </p>
          </div>
        </div>

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
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                สินค้าที่ผลิต (Product_Code) *
              </label>
              <select
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {productCodes.map((code) => {
                  const r = recipes.find((item) => item.Product_Code === code);
                  return (
                    <option key={code} value={code}>
                      {code} - {r?.Product_Name}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Produced Qty */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ยอดผลิตจริง (Produced_Qty) *
            </label>
            <div className="relative">
              <input
                type="number"
                step="1"
                min="1"
                required
                value={producedQty}
                onChange={(e) => setProducedQty(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                ชิ้น
              </span>
            </div>
          </div>

          {/* Dispatch Branch A & B */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-900">
              <span className="flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-blue-600" />
                การจัดส่งรายสาขา (Dispatch)
              </span>
              <span className="font-mono text-slate-800">
                รวมจัดส่ง (สูตร): {totalDispatched} ชิ้น
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Dispatch_Branch_A (สาขา A)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={dispatchA}
                  onChange={(e) => setDispatchA(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Dispatch_Branch_B (สาขา B)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={dispatchB}
                  onChange={(e) => setDispatchB(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Leftover Branch A & B */}
          <div className="p-3.5 bg-purple-50/40 border border-purple-200/70 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-purple-950">
              <span className="flex items-center gap-1.5">
                <Archive className="w-4 h-4 text-purple-700" />
                ของเหลือหน้าร้าน (Leftover)
              </span>
              <span className="font-mono text-purple-800">
                รวมของเหลือ (สูตร): {totalLeftover} ชิ้น
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Leftover_Branch_A (สาขา A)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={leftoverA}
                  onChange={(e) => setLeftoverA(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Leftover_Branch_B (สาขา B)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={leftoverB}
                  onChange={(e) => setLeftoverB(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Auto-Deduct Checkbox */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 cursor-pointer">
            <input
              type="checkbox"
              checked={autoDeduct}
              onChange={(e) => setAutoDeduct(e.target.checked)}
              className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
            />
            <div className="text-xs">
              <span className="font-bold text-amber-950 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                ตัดสต็อกวัตถุดิบอัตโนมัติ (Auto-deduct) ตามสูตร BOM ทันที
              </span>
              <p className="text-[11px] text-amber-800 mt-0.5">
                ระบบจะสร้างรายการเบิก (Actual Usage) ใน <code className="font-mono bg-amber-100/60 px-1 py-0.5 rounded">Stock_Transactions</code> ครบทุกวัตถุดิบในสูตรของสินค้านี้
              </p>
            </div>
          </label>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all"
            >
              บันทึกการผลิต
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
