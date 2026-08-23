import React from 'react';
import {
  Package,
  AlertTriangle,
  TrendingDown,
  Calendar,
  Truck,
  Archive,
} from 'lucide-react';
import { MonthlyStockSummary, DailyProduction } from '../types/stock';

interface OverviewCardsProps {
  summaries: MonthlyStockSummary[];
  productions: DailyProduction[];
  onSelectFilter?: (filterType: 'all' | 'lowStock' | 'overused') => void;
  activeFilter?: string;
}

export const OverviewCards: React.FC<OverviewCardsProps> = ({
  summaries,
  productions,
  onSelectFilter,
  activeFilter,
}) => {
  const totalMaterials = summaries.length;
  const lowStockItems = summaries.filter((s) => s.isLowStock);
  const overusedItems = summaries.filter((s) => s.isOverused);

  const totalProduced = productions.reduce((acc, p) => acc + (p.Produced_Qty || 0), 0);
  const totalDispatched = productions.reduce((acc, p) => acc + (p.Total_Dispatched || 0), 0);
  const totalLeftover = productions.reduce((acc, p) => acc + (p.Total_Leftover || 0), 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
      {/* 1. Total Materials */}
      <div
        onClick={() => onSelectFilter && onSelectFilter('all')}
        className={`bg-white rounded-xl p-4 sm:p-5 border transition-all cursor-pointer shadow-xs ${
          activeFilter === 'all'
            ? 'border-blue-600 ring-2 ring-blue-600/10'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">วัตถุดิบทั้งหมด</span>
          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <Package className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-slate-900">{totalMaterials}</div>
        <div className="text-[11px] text-slate-400 mt-1">Master Materials</div>
      </div>

      {/* 2. Low Stock Alerts */}
      <div
        onClick={() => onSelectFilter && onSelectFilter('lowStock')}
        className={`bg-white rounded-xl p-4 sm:p-5 border transition-all cursor-pointer shadow-xs ${
          lowStockItems.length > 0
            ? 'border-red-200 hover:border-red-300 bg-red-50/20'
            : 'border-slate-200 hover:border-slate-300'
        } ${activeFilter === 'lowStock' ? 'ring-2 ring-red-500/20 border-red-500' : ''}`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">⚠️ สต๊อกใกล้หมด</span>
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              lowStockItems.length > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-red-600">{lowStockItems.length}</div>
        <div className="text-[11px] text-red-600 mt-1 font-medium">
          {lowStockItems.length > 0 ? 'ต่ำกว่า Safety Stock' : 'ทุกรายการเพียงพอ'}
        </div>
      </div>

      {/* 3. Overused / Variance > 0 */}
      <div
        onClick={() => onSelectFilter && onSelectFilter('overused')}
        className={`bg-white rounded-xl p-4 sm:p-5 border transition-all cursor-pointer shadow-xs ${
          overusedItems.length > 0
            ? 'border-amber-200 hover:border-amber-300 bg-amber-50/20'
            : 'border-slate-200 hover:border-slate-300'
        } ${activeFilter === 'overused' ? 'ring-2 ring-amber-500/20 border-amber-500' : ''}`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">เบิกเกินเกณฑ์</span>
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              overusedItems.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-amber-600">{overusedItems.length}</div>
        <div className="text-[11px] text-amber-600 mt-1 font-medium">
          {overusedItems.length > 0 ? 'พบ Waste ในการผลิต' : 'คุมต้นทุนได้ตามสูตร'}
        </div>
      </div>

      {/* 4. Total Produced */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">ยอดผลิตสะสม</span>
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <Calendar className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-slate-900">{totalProduced.toLocaleString()}</div>
        <div className="text-[11px] text-slate-400 mt-1">ชิ้น / ผลิตภัณฑ์รวม</div>
      </div>

      {/* 5. Total Dispatched */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">ยอดส่งสาขารวม</span>
          <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Truck className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-slate-900">{totalDispatched.toLocaleString()}</div>
        <div className="text-[11px] text-slate-400 mt-1">สาขา A + สาขา B</div>
      </div>

      {/* 6. Total Leftover */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">ของเหลือหน้าร้าน</span>
          <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
            <Archive className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-slate-900">{totalLeftover.toLocaleString()}</div>
        <div className="text-[11px] text-slate-400 mt-1">ของเหลือรวม 2 สาขา</div>
      </div>
    </div>
  );
};
