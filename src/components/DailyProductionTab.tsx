import React, { useState } from 'react';
import {
  DailyProduction,
  BOMRecipe,
  MasterMaterial,
} from '../types/stock';
import {
  CalendarCheck,
  Plus,
  Zap,
  Filter,
  Layers,
  Truck,
  Archive,
  ArrowRight,
  Sparkles,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';

interface DailyProductionTabProps {
  productions: DailyProduction[];
  recipes: BOMRecipe[];
  materials: MasterMaterial[];
  onAddProduction: (prod: DailyProduction) => void;
  onAutoDeductBatch: (production: DailyProduction) => void;
  onOpenNewProdModal: () => void;
  onEditProduction?: (production: DailyProduction, index: number) => void;
  onDeleteProduction?: (index: number) => void;
}

export const DailyProductionTab: React.FC<DailyProductionTabProps> = ({
  productions,
  recipes,
  materials,
  onAddProduction,
  onAutoDeductBatch,
  onOpenNewProdModal,
  onEditProduction,
  onDeleteProduction,
}) => {
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [prodToDelete, setProdToDelete] = useState<{ index: number; prod: DailyProduction } | null>(null);

  // Extract unique products
  const uniqueProducts = Array.from(
    new Set(recipes.map((r) => r.Product_Code))
  ).map((code) => {
    const match = recipes.find((r) => r.Product_Code === code);
    return { code, name: match ? match.Product_Name : code };
  });

  const filteredProductions = productions.filter((p) => {
    if (selectedProduct !== 'all' && p.Product_Code !== selectedProduct) return false;
    if (dateFilter && p.Date !== dateFilter) return false;
    return true;
  });

  const getProductName = (code: string) => {
    const match = recipes.find((r) => r.Product_Code === code);
    return match ? match.Product_Name : code;
  };

  return (
    <div className="space-y-4">
      {/* Top Banner / Actions */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Product Filter */}
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">สินค้าทั้งหมด ({uniqueProducts.length} รายการ)</option>
            {uniqueProducts.map((prod) => (
              <option key={prod.code} value={prod.code}>
                {prod.code} - {prod.name}
              </option>
            ))}
          </select>

          {/* Date Filter */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              ล้างวันที่
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenNewProdModal}
            id="btn-add-daily-production"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ บันทึกการผลิตและส่งสาขา</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <h2 className="text-sm sm:text-base font-bold text-slate-800">
              บันทึกการผลิตและยอดจัดส่งสาขา (Daily Production & Dispatch)
            </h2>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium flex-wrap">
            <span className="flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-blue-600" /> Total_Dispatched (คำนวณอัตโนมัติ = ส่งสาขา A + ส่งสาขา B)
            </span>
            <span className="sm:hidden text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              👉 เลื่อนแนวนอนเพื่อดูครบทุกช่อง
            </span>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[620px]">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[11px] sm:text-xs tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5">วันที่ (Date)</th>
                <th className="px-4 py-3.5">รหัสสินค้า</th>
                <th className="px-4 py-3.5">ชื่อสินค้า</th>
                <th className="px-4 py-3.5 text-right text-slate-900 font-bold">ผลิตจริง (Produced)</th>
                <th className="px-4 py-3.5 text-right">ส่งสาขา A</th>
                <th className="px-4 py-3.5 text-right">ส่งสาขา B</th>
                <th className="px-4 py-3.5 text-right font-bold text-slate-900 bg-slate-100/70">
                  รวมส่ง (Dispatched)
                </th>
                <th className="px-4 py-3.5 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredProductions.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3.5 font-mono text-slate-700 font-medium whitespace-nowrap text-xs sm:text-sm">
                    {p.Date}
                  </td>
                  <td className="px-4 py-3.5 font-mono font-bold text-slate-900 text-xs sm:text-sm">
                    {p.Product_Code}
                  </td>
                  <td className="px-4 py-3.5 font-medium text-slate-900 text-xs sm:text-sm">
                    {getProductName(p.Product_Code)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-blue-700 text-xs sm:text-sm bg-blue-50/30">
                    {p.Produced_Qty.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-slate-700 text-xs sm:text-sm">
                    {(p.Dispatch_Branch_A || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-slate-700 text-xs sm:text-sm">
                    {(p.Dispatch_Branch_B || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900 bg-slate-100/50 text-xs sm:text-sm">
                    {(p.Total_Dispatched || (p.Dispatch_Branch_A || 0) + (p.Dispatch_Branch_B || 0)).toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                      {onEditProduction && (
                        <button
                          onClick={() => onEditProduction(p, idx)}
                          title="แก้ไขรายการผลิตนี้"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors min-h-[32px]"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>แก้ไข</span>
                        </button>
                      )}
                      <button
                        onClick={() => onAutoDeductBatch(p)}
                        title="กดเพื่อตัดสต็อกวัตถุดิบตามสูตร BOM x ยอดผลิตลงใน Stock_Transactions"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors min-h-[32px]"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-600" />
                        <span>ตัดสต็อก</span>
                      </button>
                      {onDeleteProduction && (
                        <button
                          onClick={() => setProdToDelete({ index: idx, prod: p })}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                          title="ลบรายการนี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredProductions.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-sm">
            ยังไม่มีรายการบันทึกการผลิตในเงื่อนไขที่เลือก
          </div>
        )}
      </div>

      {/* In-App Delete Production Confirmation Modal */}
      {prodToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-rose-50 border-b border-rose-100 p-5 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  ยืนยันการลบรายการผลิต
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ระบบจะลบรายการนี้ออกจาก Daily_Production ทันที
                </p>
              </div>
              <button
                onClick={() => setProdToDelete(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-2.5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">วันที่ผลิต:</span>
                  <span className="font-semibold text-slate-800">{prodToDelete.prod.Date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">รหัสสินค้า:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {prodToDelete.prod.Product_Code}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ยอดผลิต:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {prodToDelete.prod.Produced_Qty.toLocaleString()} ชิ้น
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ยอดส่งสาขา A / B:</span>
                  <span className="font-mono text-slate-700">
                    {prodToDelete.prod.Dispatch_Branch_A} / {prodToDelete.prod.Dispatch_Branch_B}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setProdToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteProduction) {
                    onDeleteProduction(prodToDelete.index);
                  }
                  setProdToDelete(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ยืนยันลบรายการ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Card on ARRAYFORMULA */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 text-xs text-slate-800 shadow-xs flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-bold text-slate-900 mb-1">
            เทคนิค Google Sheets ARRAYFORMULA ใน Tab Daily_Production
          </h4>
          <p className="text-slate-600 leading-relaxed">
            ใน Google Sheets รวมยอดส่งสาขา A + B อัตโนมัติโดยใส่สูตรไว้ที่ Row 1 ในส่วน Header:
          </p>
          <div className="mt-2">
            <code className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] block text-slate-800 max-w-xl">
              <span className="text-blue-600 font-bold">Total_Dispatched (Row 1):</span>
              <br />
              {`={"Total_Dispatched"; ARRAYFORMULA(IF(A2:A="", "", N(D2:D) + N(E2:E)))}`}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};
