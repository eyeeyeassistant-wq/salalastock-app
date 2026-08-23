import React, { useState } from 'react';
import {
  BookOpen,
  Copy,
  Check,
  Code2,
  FileSpreadsheet,
  AlertTriangle,
  Sparkles,
  Layers,
  HelpCircle,
  X,
} from 'lucide-react';

interface FormulaGuideModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  isInlineTab?: boolean;
}

export const FormulaGuideModal: React.FC<FormulaGuideModalProps> = ({
  isOpen = true,
  onClose,
  isInlineTab = false,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formulas = {
    totalReceive: `=SUMIFS(Stock_Transactions!$D:$D, Stock_Transactions!$C:$C, A2, Stock_Transactions!$B:$B, "Receive")`,
    actualUsage: `=SUMIFS(Stock_Transactions!$D:$D, Stock_Transactions!$C:$C, A2, Stock_Transactions!$B:$B, "Actual Usage")`,
    expectedUsage: `=IFERROR(SUMPRODUCT(SUMIFS(Daily_Production!$C:$C, Daily_Production!$B:$B, FILTER(BOM_Recipe!$A:$A, BOM_Recipe!$C:$C = A2)), FILTER(BOM_Recipe!$D:$D, BOM_Recipe!$C:$C = A2)), 0)`,
    endingStock: `=D2 + E2 - F2`,
    variance: `=F2 - G2`,
    stockStatus: `=IF(A2="", "", IF(H2 <= XLOOKUP(A2, Master_Materials!$A:$A, Master_Materials!$E:$E, 0), "⚠️ วัตถุดิบใกล้หมด (ต้องสั่งเพิ่ม)", "ปกติ"))`,
    totalDispatchedArray: `={"Total_Dispatched"; ARRAYFORMULA(IF(A2:A="", "", N(D2:D) + N(E2:E)))}`,
    totalLeftoverArray: `={"Total_Leftover"; ARRAYFORMULA(IF(A2:A="", "", N(F2:F) + N(G2:G)))}`,
    condFormatLowStock: `=$H2 <= XLOOKUP($A2, Master_Materials!$A:$A, Master_Materials!$E:$E, 0)`,
    condFormatVariance: `=$I2 > 0`,
  };

  const content = (
    <div className="space-y-6 text-slate-800">
      {/* Header Overview */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-blue-400">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              คู่มือสูตร Google Sheets & การตั้งค่าระบบตัดสต็อก (Formula Reference)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              คัดลอกสูตรไปวางใน Google Sheets ได้ทันที ครบทั้ง 5 Tab และการตั้งค่าสีอัตโนมัติ
            </p>
          </div>
        </div>
        {!isInlineTab && onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Section 1: Monthly_Stock_Summary Formulas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
              1
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              สรุปสูตรใน Tab "Monthly_Stock_Summary" (ใส่ที่แถว 2 ลงไป)
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">Row 2 Formulas (A2 = RM_Code)</span>
        </div>

        <div className="p-4 space-y-4">
          {/* Column E: Total_Receive */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                1. Total_Receive (คอลัมน์ E) • ผลรวมรับเข้าตามรหัสวัตถุดิบ
              </span>
              <button
                onClick={() => copyToClipboard(formulas.totalReceive, 'receive')}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
              >
                {copiedKey === 'receive' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>{copiedKey === 'receive' ? 'คัดลอกแล้ว!' : 'คัดลอกสูตร'}</span>
              </button>
            </div>
            <code className="block p-2 bg-slate-900 text-emerald-400 font-mono text-xs rounded overflow-x-auto">
              {formulas.totalReceive}
            </code>
            <p className="text-[11px] text-slate-500">
              คำนวณจาก Tab <code>Stock_Transactions</code> เฉพาะแถวที่คอลัมน์ B (Type) = "Receive"
            </p>
          </div>

          {/* Column F: Actual_Usage */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                2. Actual_Usage (คอลัมน์ F) • ยอดที่พนักงานกรอกเบิกใช้จริง
              </span>
              <button
                onClick={() => copyToClipboard(formulas.actualUsage, 'usage')}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
              >
                {copiedKey === 'usage' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>{copiedKey === 'usage' ? 'คัดลอกแล้ว!' : 'คัดลอกสูตร'}</span>
              </button>
            </div>
            <code className="block p-2 bg-slate-900 text-indigo-400 font-mono text-xs rounded overflow-x-auto">
              {formulas.actualUsage}
            </code>
            <p className="text-[11px] text-slate-500">
              คำนวณจาก Tab <code>Stock_Transactions</code> เฉพาะแถวที่คอลัมน์ B (Type) = "Actual Usage"
            </p>
          </div>

          {/* Column G: Expected_Usage */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                3. Expected_Usage (คอลัมน์ G) • ยอดที่ควรเบิกตามสูตร (ยอดผลิต x Standard_Qty)
              </span>
              <button
                onClick={() => copyToClipboard(formulas.expectedUsage, 'expected')}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
              >
                {copiedKey === 'expected' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>{copiedKey === 'expected' ? 'คัดลอกแล้ว!' : 'คัดลอกสูตร'}</span>
              </button>
            </div>
            <code className="block p-2 bg-slate-900 text-purple-300 font-mono text-xs rounded overflow-x-auto">
              {formulas.expectedUsage}
            </code>
            <p className="text-[11px] text-slate-500">
              คำนวณเชื่อมโยงข้าม Tab: หายอดผลิต <code>Produced_Qty</code> ใน Tab Daily_Production คูณกับสัดส่วนในสูตร <code>BOM_Recipe</code>
            </p>
          </div>

          {/* Column H: Ending_Stock */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                4. Ending_Stock (คอลัมน์ H) • สต๊อกคงเหลือสิ้นเดือน
              </span>
              <button
                onClick={() => copyToClipboard(formulas.endingStock, 'ending')}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
              >
                {copiedKey === 'ending' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>{copiedKey === 'ending' ? 'คัดลอกแล้ว!' : 'คัดลอกสูตร'}</span>
              </button>
            </div>
            <code className="block p-2 bg-slate-900 text-amber-300 font-mono text-xs rounded overflow-x-auto">
              {formulas.endingStock}
            </code>
            <p className="text-[11px] text-slate-500">
              <code>= Opening_Stock (D2) + Total_Receive (E2) - Actual_Usage (F2)</code>
            </p>
          </div>

          {/* Column I: Variance */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                5. Variance (คอลัมน์ I) • ผลต่างเบิกขาด/เกิน
              </span>
              <button
                onClick={() => copyToClipboard(formulas.variance, 'variance')}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
              >
                {copiedKey === 'variance' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>{copiedKey === 'variance' ? 'คัดลอกแล้ว!' : 'คัดลอกสูตร'}</span>
              </button>
            </div>
            <code className="block p-2 bg-slate-900 text-rose-300 font-mono text-xs rounded overflow-x-auto">
              {formulas.variance}
            </code>
            <p className="text-[11px] text-slate-500">
              <code>= Actual_Usage (F2) - Expected_Usage (G2)</code> (ค่า <strong>+</strong> = เบิกเกิน/Waste, ค่า <strong>-</strong> = เบิกน้อยกว่าเกณฑ์)
            </p>
          </div>

          {/* Column J: Stock_Status */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                6. Stock_Status (คอลัมน์ J) • สถานะแจ้งเตือนสั่งซื้อวัตถุดิบ
              </span>
              <button
                onClick={() => copyToClipboard(formulas.stockStatus, 'status')}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
              >
                {copiedKey === 'status' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>{copiedKey === 'status' ? 'คัดลอกแล้ว!' : 'คัดลอกสูตร'}</span>
              </button>
            </div>
            <code className="block p-2 bg-slate-900 text-teal-300 font-mono text-xs rounded overflow-x-auto">
              {formulas.stockStatus}
            </code>
            <p className="text-[11px] text-slate-500">
              เปรียบเทียบ Ending_Stock (H2) กับ Safety_Stock จาก Tab <code>Master_Materials</code> ผ่าน <code>XLOOKUP</code>
            </p>
          </div>
        </div>
      </div>

      {/* Section 2: ARRAYFORMULA for Daily_Production */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
              2
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              สูตร ARRAYFORMULA ใน Tab "Daily_Production" (ใส่ที่ Row 1 Header)
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">Row 1 Headers</span>
        </div>

        <div className="p-4 space-y-4">
          {/* Total_Dispatched */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                1. Total_Dispatched (ใส่ที่เซลล์ H1) • ผลรวมจัดส่ง สาขา A + สาขา B อัตโนมัติทั้งคอลัมน์
              </span>
              <button
                onClick={() => copyToClipboard(formulas.totalDispatchedArray, 'dispatchArray')}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
              >
                {copiedKey === 'dispatchArray' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>{copiedKey === 'dispatchArray' ? 'คัดลอกแล้ว!' : 'คัดลอกสูตร'}</span>
              </button>
            </div>
            <code className="block p-2 bg-slate-900 text-emerald-400 font-mono text-xs rounded overflow-x-auto">
              {formulas.totalDispatchedArray}
            </code>
            <p className="text-[11px] text-slate-500">
              วางสูตรนี้ที่เซลล์ <strong>H1</strong> จะได้หัวตารางพร้อมคำนวณ <code>Dispatch_A + Dispatch_B</code> ทุกแถวที่กรอกข้อมูล
            </p>
          </div>

          {/* Total_Leftover */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                2. Total_Leftover (ใส่ที่เซลล์ I1) • ผลรวมของเหลือ สาขา A + สาขา B อัตโนมัติทั้งคอลัมน์
              </span>
              <button
                onClick={() => copyToClipboard(formulas.totalLeftoverArray, 'leftoverArray')}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
              >
                {copiedKey === 'leftoverArray' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>{copiedKey === 'leftoverArray' ? 'คัดลอกแล้ว!' : 'คัดลอกสูตร'}</span>
              </button>
            </div>
            <code className="block p-2 bg-slate-900 text-purple-300 font-mono text-xs rounded overflow-x-auto">
              {formulas.totalLeftoverArray}
            </code>
            <p className="text-[11px] text-slate-500">
              วางสูตรนี้ที่เซลล์ <strong>I1</strong> จะได้หัวตารางพร้อมคำนวณ <code>Leftover_A + Leftover_B</code> ทุกแถวอัตโนมัติ
            </p>
          </div>
        </div>
      </div>

      {/* Section 3: Conditional Formatting Instructions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
              3
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              วิธีตั้งค่า Conditional Formatting (การเปลี่ยนสีเซลล์อัตโนมัติ)
            </h3>
          </div>
          <span className="text-xs text-slate-500">Format &rarr; Conditional formatting</span>
        </div>

        <div className="p-4 space-y-4">
          {/* Rule 1: Low Stock Alert */}
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-rose-950">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>กฎที่ 1: ไฮไลต์สีแดงเมื่อสต๊อกใกล้หมด (Ending_Stock &le; Safety_Stock)</span>
              </div>
              <button
                onClick={() => copyToClipboard(formulas.condFormatLowStock, 'condLow')}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-white border border-rose-300 text-rose-800 hover:bg-rose-100"
              >
                {copiedKey === 'condLow' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>คัดลอกสูตร</span>
              </button>
            </div>

            <ol className="text-xs text-slate-700 space-y-1 list-decimal list-inside pl-1">
              <li>เปิดแท็บ <strong>Monthly_Stock_Summary</strong> ใน Google Sheets</li>
              <li>คลุมช่วงข้อมูล (Apply to range): <code className="bg-white px-1.5 py-0.5 rounded font-mono border">H2:J1000</code></li>
              <li>เลือก Format rules &rarr; <strong>Custom formula is (สูตรที่กำหนดเองคือ)</strong></li>
              <li>ใส่สูตร:</li>
            </ol>
            <code className="block p-2 bg-slate-900 text-rose-300 font-mono text-xs rounded">
              {formulas.condFormatLowStock}
            </code>
            <p className="text-[11px] text-slate-600">
              ตั้งค่าสี Formatting style: พื้นหลังสีแดงอ่อน (<code>#FCE8E6</code>) และตัวอักษรสีแดงเข้ม (<code>#C5221F</code>)
            </p>
          </div>

          {/* Rule 2: Overused / Variance > 0 */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-amber-950">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>กฎที่ 2: ไฮไลต์สีส้ม/แดงเมื่อเบิกวัตถุดิบเกินเกณฑ์ (Variance &gt; 0 เกิด Waste)</span>
              </div>
              <button
                onClick={() => copyToClipboard(formulas.condFormatVariance, 'condVar')}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-white border border-amber-300 text-amber-800 hover:bg-amber-100"
              >
                {copiedKey === 'condVar' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>คัดลอกสูตร</span>
              </button>
            </div>

            <ol className="text-xs text-slate-700 space-y-1 list-decimal list-inside pl-1">
              <li>เปิดแท็บ <strong>Monthly_Stock_Summary</strong> ใน Google Sheets</li>
              <li>คลุมช่วงข้อมูล (Apply to range): <code className="bg-white px-1.5 py-0.5 rounded font-mono border">I2:I1000</code> (คอลัมน์ Variance)</li>
              <li>เลือก Format rules &rarr; <strong>Custom formula is (สูตรที่กำหนดเองคือ)</strong></li>
              <li>ใส่สูตร:</li>
            </ol>
            <code className="block p-2 bg-slate-900 text-amber-300 font-mono text-xs rounded">
              {formulas.condFormatVariance}
            </code>
            <p className="text-[11px] text-slate-600">
              ตั้งค่าสี Formatting style: พื้นหลังสีส้มอ่อน (<code>#FEF7E0</code>) และตัวอักษรสีน้ำตาลส้มเข้ม (<code>#B06000</code>)
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  if (isInlineTab) {
    return content;
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative">
        {content}
      </div>
    </div>
  );
};
