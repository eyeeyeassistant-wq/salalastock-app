import React from 'react';
import {
  MasterMaterial,
  BOMRecipe,
  DailyProduction,
  StockTransaction,
  MonthlyStockSummary,
} from '../types/stock';
import {
  Package,
  Layers,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  X,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

interface MaterialDetailModalProps {
  rmCode: string | null;
  onClose: () => void;
  materials: MasterMaterial[];
  recipes: BOMRecipe[];
  productions: DailyProduction[];
  transactions: StockTransaction[];
  summaries: MonthlyStockSummary[];
}

export const MaterialDetailModal: React.FC<MaterialDetailModalProps> = ({
  rmCode,
  onClose,
  materials,
  recipes,
  productions,
  transactions,
  summaries,
}) => {
  if (!rmCode) return null;

  const material = materials.find((m) => m.RM_Code === rmCode);
  const summary = summaries.find((s) => s.RM_Code === rmCode);

  if (!material || !summary) return null;

  // Filter transactions for this RM_Code
  const rmTransactions = transactions
    .filter((t) => t.RM_Code === rmCode)
    .sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());

  // Filter recipes using this RM_Code
  const matchedRecipes = recipes.filter((r) => r.RM_Code === rmCode);

  // Expected usage breakdown by production
  const productionBreakdown = productions
    .map((prod) => {
      const match = recipes.find(
        (r) => r.Product_Code === prod.Product_Code && r.RM_Code === rmCode
      );
      if (!match) return null;
      const expected = prod.Produced_Qty * match.Standard_Qty;
      return {
        date: prod.Date,
        productCode: prod.Product_Code,
        productName: match.Product_Name,
        producedQty: prod.Produced_Qty,
        standardQty: match.Standard_Qty,
        expectedUsage: expected,
      };
    })
    .filter(Boolean);

  const isOverused = summary.Variance > 0.001;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative border border-slate-200 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 rounded">
                {material.RM_Code}
              </span>
              <h2 className="text-base font-bold text-slate-900">{material.RM_Name}</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              หน่วยนับ: {material.Unit} • จุดเตือนสั่งซื้อ (Safety Stock): {material.Safety_Stock} {material.Unit}
            </p>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[11px] text-slate-500">Opening (ยกมา)</span>
            <div className="text-base font-bold font-mono text-slate-800">
              {summary.Opening_Stock.toLocaleString()}
            </div>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <span className="text-[11px] text-emerald-700 font-semibold">Total Receive (+)</span>
            <div className="text-base font-bold font-mono text-emerald-800">
              +{summary.Total_Receive.toLocaleString()}
            </div>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <span className="text-[11px] text-blue-700 font-semibold">Actual Usage (-)</span>
            <div className="text-base font-bold font-mono text-blue-800">
              {summary.Actual_Usage.toLocaleString()}
            </div>
          </div>
          <div
            className={`p-3 border rounded-xl ${
              summary.isLowStock
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-slate-900 border-slate-900 text-white'
            }`}
          >
            <span className="text-[11px] opacity-80 font-medium">Ending Stock</span>
            <div className="text-base font-bold font-mono">
              {summary.Ending_Stock.toLocaleString()} {material.Unit}
            </div>
          </div>
        </div>

        {/* Variance Analysis Box */}
        <div
          className={`p-4 rounded-xl border mb-6 ${
            isOverused
              ? 'bg-rose-50/60 border-rose-200 text-rose-950'
              : 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xs">
              {isOverused ? (
                <TrendingUp className="w-4 h-4 text-rose-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-emerald-600" />
              )}
              <span>การวิเคราะห์ผลต่าง (Variance Breakdown)</span>
            </div>
            <span
              className={`font-mono font-bold text-sm px-2.5 py-0.5 rounded ${
                isOverused ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {isOverused ? `+${summary.Variance}` : summary.Variance} {material.Unit}
            </span>
          </div>
          <div className="mt-2 text-xs space-y-1">
            <div className="flex justify-between">
              <span>ยอดเบิกใช้จริง (Actual Usage):</span>
              <span className="font-mono font-bold">{summary.Actual_Usage} {material.Unit}</span>
            </div>
            <div className="flex justify-between">
              <span>ยอดที่ควรเบิกตามสูตร (Expected Usage):</span>
              <span className="font-mono font-bold">{summary.Expected_Usage} {material.Unit}</span>
            </div>
            <div className="pt-1 text-[11px] text-slate-600">
              {isOverused
                ? `⚠️ เกิดผลต่างเกินเกณฑ์ ${summary.Variance} ${material.Unit} (${summary.variancePercentage}%) อาจเกิดจากของเสียในกระบวนการผลิตหรือการชั่งตวงเกินสูตร`
                : '✅ การใช้วัตถุดิบอยู่ในเกณฑ์ควบคุมมาตรฐาน ไม่มีของเสียผิดปกติ'}
            </div>
          </div>
        </div>

        {/* Production Expected Usage Sources */}
        <div className="space-y-2 mb-6">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            ที่มาของการคำนวณ Expected Usage จากยอดผลิต (Daily Production)
          </h4>
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">สินค้า</th>
                  <th className="p-2.5 text-right">ยอดผลิต</th>
                  <th className="p-2.5 text-right">สูตร/ชิ้น</th>
                  <th className="p-2.5 text-right font-bold text-blue-700">Expected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {productionBreakdown.map((item: any, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-2.5 font-mono text-slate-500">{item.date}</td>
                    <td className="p-2.5 font-medium text-slate-900">{item.productName}</td>
                    <td className="p-2.5 text-right font-mono">{item.producedQty} ชิ้น</td>
                    <td className="p-2.5 text-right font-mono">{item.standardQty}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-blue-700">
                      {item.expectedUsage.toFixed(3)} {material.Unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Transactions for this Material */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-800">
            ประวัติการเคลื่อนไหวล่าสุด (Stock Transactions)
          </h4>
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">ประเภท</th>
                  <th className="p-2.5 text-right">จำนวน</th>
                  <th className="p-2.5">ผู้บันทึก</th>
                  <th className="p-2.5">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rmTransactions.slice(0, 8).map((tx, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-2.5 font-mono text-slate-500">{tx.Date}</td>
                    <td className="p-2.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                          tx.Type === 'Receive'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {tx.Type === 'Receive' ? '+' : '-'} {tx.Type}
                      </span>
                    </td>
                    <td
                      className={`p-2.5 text-right font-mono font-bold ${
                        tx.Type === 'Receive' ? 'text-emerald-700' : 'text-blue-700'
                      }`}
                    >
                      {tx.Qty} {material.Unit}
                    </td>
                    <td className="p-2.5 text-slate-600">{tx.Recorder}</td>
                    <td className="p-2.5 text-slate-500 text-[11px]">{tx.Note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
