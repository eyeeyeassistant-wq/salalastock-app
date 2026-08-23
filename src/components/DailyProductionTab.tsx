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
            <CalendarCheck className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800">
              Tab 3: Daily_Production (บันทึกการผลิต จัดส่ง และของเหลือรายสาขา)
            </h2>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-blue-600" /> Total_Dispatched (คำนวณอัตโนมัติ)
            </span>
            <span className="flex items-center gap-1">
              <Archive className="w-3.5 h-3.5 text-purple-600" /> Total_Leftover (คำนวณอัตโนมัติ)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] sm:text-xs tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Product_Code</th>
                <th className="px-4 py-3.5">Product_Name</th>
                <th className="px-4 py-3.5 text-right text-slate-900">Produced_Qty</th>
                <th className="px-3.5 py-3.5 text-right">Dispatch_Branch_A</th>
                <th className="px-3.5 py-3.5 text-right">Dispatch_Branch_B</th>
                <th className="px-3.5 py-3.5 text-right">Leftover_Branch_A</th>
                <th className="px-3.5 py-3.5 text-right">Leftover_Branch_B</th>
                <th className="px-4 py-3.5 text-right font-bold text-slate-900 bg-slate-100/70">
                  Total_Dispatched (สูตร)
                </th>
                <th className="px-4 py-3.5 text-right font-bold text-slate-900 bg-slate-100/70">
                  Total_Leftover (สูตร)
                </th>
                <th className="px-4 py-3.5 text-center">ตัดสต็อกอัตโนมัติ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredProductions.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                    {p.Date}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">
                    {p.Product_Code}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {getProductName(p.Product_Code)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                    {p.Produced_Qty.toLocaleString()}
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono text-slate-600">
                    {p.Dispatch_Branch_A.toLocaleString()}
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono text-slate-600">
                    {p.Dispatch_Branch_B.toLocaleString()}
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono text-slate-600">
                    {p.Leftover_Branch_A.toLocaleString()}
                  </td>
                  <td className="px-3.5 py-3 text-right font-mono text-slate-600">
                    {p.Leftover_Branch_B.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 bg-slate-50/50">
                    {p.Total_Dispatched.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 bg-slate-50/50">
                    {p.Total_Leftover.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {onEditProduction && (
                        <button
                          onClick={() => onEditProduction(p, idx)}
                          title="แก้ไขรายการผลิตนี้"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          แก้ไข
                        </button>
                      )}
                      <button
                        onClick={() => onAutoDeductBatch(p)}
                        title="กดเพื่อตัดสต็อกวัตถุดิบตามสูตร BOM x ยอดผลิตลงใน Stock_Transactions"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors"
                      >
                        <Zap className="w-3 h-3 text-amber-600" />
                        ตัดสต็อกอัตโนมัติ
                      </button>
                      {onDeleteProduction && (
                        <button
                          onClick={() => {
                            if (window.confirm(`ต้องการลบรายการผลิต ${p.Product_Code} วันที่ ${p.Date} หรือไม่?`)) {
                              onDeleteProduction(idx);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          title="ลบรายการนี้"
                        >
                          <X className="w-3.5 h-3.5" />
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

      {/* Info Card on ARRAYFORMULA */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 text-xs text-slate-800 shadow-xs flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-bold text-slate-900 mb-1">
            เทคนิค Google Sheets ARRAYFORMULA ใน Tab Daily_Production
          </h4>
          <p className="text-slate-600 leading-relaxed">
            ใน Google Sheets ไม่จำเป็นต้องลากสูตรลงมาทีละแถว สามารถใส่สูตรไว้ที่ Row 1 ในส่วน Header ได้ทันที:
          </p>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
            <code className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] block text-slate-800">
              <span className="text-blue-600 font-bold">Total_Dispatched:</span>
              <br />
              {`={"Total_Dispatched"; ARRAYFORMULA(IF(A2:A="", "", N(D2:D) + N(E2:E)))}`}
            </code>
            <code className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] block text-slate-800">
              <span className="text-blue-600 font-bold">Total_Leftover:</span>
              <br />
              {`={"Total_Leftover"; ARRAYFORMULA(IF(A2:A="", "", N(F2:F) + N(G2:G)))}`}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};
