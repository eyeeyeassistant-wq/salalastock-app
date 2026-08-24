import React from 'react';
import {
  CalendarCheck,
  ArrowDownLeft,
  ArrowUpRight,
  Layers,
  Truck,
  Archive,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Plus,
  Package,
  Clock,
  ShieldCheck,
  Edit2,
  Trash2,
  ClipboardCheck,
  Sparkles,
} from 'lucide-react';
import {
  MasterMaterial,
  DailyProduction,
  StockTransaction,
  BOMRecipe,
  MonthlyStockCountRecord,
} from '../types/stock';

interface StaffPortalTabProps {
  materials: MasterMaterial[];
  recipes: BOMRecipe[];
  productions: DailyProduction[];
  transactions: StockTransaction[];
  stockCountRecords?: MonthlyStockCountRecord[];
  onOpenNewProdModal: () => void;
  onOpenNewTxModal: (type?: 'Receive' | 'Actual Usage') => void;
  onOpenOpeningStockModal: () => void;
  onOpenStockCountModal?: () => void;
  onViewMaterialDetail: (code: string) => void;
  onEditProduction?: (production: DailyProduction, originalIndex: number) => void;
  onDeleteProduction?: (originalIndex: number) => void;
  onEditTransaction?: (transaction: StockTransaction, originalIndex: number) => void;
  onDeleteTransaction?: (originalIndex: number) => void;
}

export const StaffPortalTab: React.FC<StaffPortalTabProps> = ({
  materials,
  recipes,
  productions,
  transactions,
  stockCountRecords = [],
  onOpenNewProdModal,
  onOpenNewTxModal,
  onOpenOpeningStockModal,
  onOpenStockCountModal,
  onViewMaterialDetail,
  onEditProduction,
  onDeleteProduction,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  // Calculate ending stock for staff view
  const getMaterialStats = (rmCode: string) => {
    const mat = materials.find((m) => m.RM_Code === rmCode);
    if (!mat) return { ending: 0, safety: 0, isLow: false, unit: '' };

    const totalRec = transactions
      .filter((t) => t.RM_Code === rmCode && t.Type === 'Receive')
      .reduce((sum, t) => sum + t.Qty, 0);

    const totalUse = transactions
      .filter((t) => t.RM_Code === rmCode && t.Type === 'Actual Usage')
      .reduce((sum, t) => sum + t.Qty, 0);

    const ending = mat.Opening_Stock + totalRec - totalUse;
    return {
      ending,
      safety: mat.Safety_Stock,
      isLow: ending <= mat.Safety_Stock,
      unit: mat.Unit,
    };
  };

  const lowStockMaterials = materials.filter((m) => {
    const { isLow } = getMaterialStats(m.RM_Code);
    return isLow;
  });

  const recentProductions = [...productions].slice(-5).reverse();
  const recentTransactions = [...transactions].slice(-5).reverse();
  const latestStockCount = stockCountRecords.length > 0 ? stockCountRecords[stockCountRecords.length - 1] : null;

  return (
    <div className="space-y-6">
      {/* Welcome & Role Info Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>โหมดหน้าบ้านสำหรับพนักงาน (Staff Daily Operations Portal)</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              บันทึกการผลิตประจำวัน, ยอดจัดส่งสาขา และการเบิก-รับวัตถุดิบ
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl">
              พนักงานมีหน้าที่กรอกยอดประจำวันอย่างรวดเร็ว ตรวจนับสต็อกจริงสิ้นเดือนเพื่อยกยอด และดูแลการเบิกรับวัตถุดิบ
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 px-4 py-3 rounded-xl">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="text-xs">
              <div className="font-semibold text-slate-200">สูตร & ทะเบียนสินค้า</div>
              <div className="text-slate-400 text-[11px]">จัดการโดย Admin หลังบ้าน</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Main Action Cards for Staff */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">
            3 เมนูกรอกข้อมูลประจำวันสำหรับพนักงาน (Daily Entry Actions)
          </h3>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            เลือกเมนูที่ต้องการบันทึกข้อมูล
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Daily Production & Dispatch */}
          <button
            onClick={onOpenNewProdModal}
            id="btn-staff-daily-prod"
            className="group text-left bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-500 hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                การผลิต & ขนส่ง
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                บันทึกยอดผลิต & จัดส่งสาขา
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                กรอกยอดผลิต (ชิ้น) และกระจายส่งสาขา A / B พร้อมระบบตัดสต็อกตามสูตร BOM อัตโนมัติ (ไม่ต้องกรอกของเหลือแล้ว)
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1 text-xs sm:text-sm font-bold text-blue-600">
              <Plus className="w-4 h-4" />
              <span>บันทึกยอดผลิตและจัดส่ง</span>
            </div>
          </button>

          {/* Card 2: Material Receive */}
          <button
            onClick={() => onOpenNewTxModal('Receive')}
            id="btn-staff-receive"
            className="group text-left bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-500 hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <ArrowDownLeft className="w-6 h-6" />
              </div>
              <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">
                รับของเข้าคลัง
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                บันทึกรับวัตถุดิบ (Receive)
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                ลงบันทึกเมื่อมีวัตถุดิบ บรรจุภัณฑ์ หรือสินค้าส่งตรงมาจากซัพพลายเออร์เข้าคลัง
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1 text-xs sm:text-sm font-bold text-emerald-600">
              <Plus className="w-4 h-4" />
              <span>บันทึกรับวัตถุดิบเข้า</span>
            </div>
          </button>

          {/* Card 3: Material Usage */}
          <button
            onClick={() => onOpenNewTxModal('Actual Usage')}
            id="btn-staff-usage"
            className="group text-left bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-500 hover:shadow-md transition-all relative overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <ArrowUpRight className="w-6 h-6" />
              </div>
              <div className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">
                เบิกใช้จริง / ของเสีย
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                เบิกใช้จริง (Actual Usage)
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                บันทึกการชั่งใช้จริงหน้าเตา หรือเบิกเคสเสีย เพื่อนำไปเปรียบเทียบผลต่าง Variance
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1 text-xs sm:text-sm font-bold text-amber-600">
              <Plus className="w-4 h-4" />
              <span>บันทึกเบิกใช้จริง</span>
            </div>
          </button>
        </div>
      </div>

      {/* Safety Stock Alert Section (Only shows items that need attention) */}
      {lowStockMaterials.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <h3 className="text-sm font-bold text-rose-900">
              แจ้งเตือนสต็อกวัตถุดิบใกล้หมด (Safety Stock Alert) - {lowStockMaterials.length} รายการ
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {lowStockMaterials.map((mat) => {
              const stats = getMaterialStats(mat.RM_Code);
              return (
                <div
                  key={mat.RM_Code}
                  onClick={() => onViewMaterialDetail(mat.RM_Code)}
                  className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-xs cursor-pointer hover:border-rose-400 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-900 line-clamp-1">
                      {mat.RM_Name}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                      ใกล้หมด
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-xs text-slate-500">คงเหลือปัจจุบัน:</span>
                    <span className="text-sm font-bold text-rose-600 font-mono">
                      {stats.ending.toLocaleString()} {mat.Unit}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between text-[11px] text-slate-400">
                    <span>จุดสั่งซื้อ (Safety):</span>
                    <span className="font-mono">{mat.Safety_Stock.toLocaleString()} {mat.Unit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2-Column Tables: Today's Logs (Productions & Transactions) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Productions */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">
                รายการบันทึกการผลิตล่าสุด (5 รายการล่าสุด)
              </h3>
            </div>
            <button
              onClick={onOpenNewProdModal}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่ม</span>
            </button>
          </div>

          {recentProductions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              ยังไม่มีประวัติการผลิต คลิก "+ เพิ่ม" เพื่อบันทึกยอดแรก
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentProductions.map((p, idx) => {
                const originalIndex = productions.length - 1 - idx;
                return (
                  <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">{p.Product_Code}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500 font-mono">{p.Date}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-600 flex items-center gap-3">
                        <span>ผลิต: <b className="text-slate-900 font-mono">{p.Produced_Qty.toLocaleString()} ชิ้น</b></span>
                        <span>ส่ง A: <b className="font-mono">{p.Dispatch_Branch_A}</b></span>
                        <span>ส่ง B: <b className="font-mono">{p.Dispatch_Branch_B}</b></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {onEditProduction && (
                        <button
                          onClick={() => onEditProduction(p, originalIndex)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="แก้ไขรายการผลิตนี้"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeleteProduction && (
                        <button
                          onClick={() => onDeleteProduction(originalIndex)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="ลบรายการผลิตนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Stock Transactions */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">
                รายการเบิก/รับ วัตถุดิบล่าสุด (5 รายการล่าสุด)
              </h3>
            </div>
            <button
              onClick={() => onOpenNewTxModal('Receive')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่ม</span>
            </button>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              ยังไม่มีประวัติการเบิก/รับวัตถุดิบ
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentTransactions.map((tx, idx) => {
                const originalIndex = transactions.length - 1 - idx;
                const mat = materials.find((m) => m.RM_Code === tx.RM_Code);
                const isReceive = tx.Type === 'Receive';

                return (
                  <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isReceive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isReceive ? 'รับเข้า (Receive)' : 'เบิกใช้จริง (Actual Use)'}
                        </span>
                        <span className="text-xs font-bold text-slate-800">{mat?.RM_Name || tx.RM_Code}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500 font-mono">{tx.Date}</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        จำนวน: <b className="text-slate-900 font-mono">{tx.Qty.toLocaleString()} {mat?.Unit || ''}</b>
                        {tx.Note && <span className="text-slate-400 text-[11px] ml-2">({tx.Note})</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {onEditTransaction && (
                        <button
                          onClick={() => onEditTransaction(tx, originalIndex)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="แก้ไขรายการนี้"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeleteTransaction && (
                        <button
                          onClick={() => onDeleteTransaction(originalIndex)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="ลบรายการนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

