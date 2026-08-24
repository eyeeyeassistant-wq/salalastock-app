import React, { useState } from 'react';
import {
  StockTransaction,
  MasterMaterial,
  TransactionType,
} from '../types/stock';
import {
  ArrowLeftRight,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Filter,
  UserCheck,
  FileText,
  Edit2,
  X,
} from 'lucide-react';

interface StockTransactionsTabProps {
  transactions: StockTransaction[];
  materials: MasterMaterial[];
  onOpenNewTxModal: (initialType?: TransactionType) => void;
  onEditTransaction?: (transaction: StockTransaction, index: number) => void;
  onDeleteTransaction?: (index: number) => void;
}

export const StockTransactionsTab: React.FC<StockTransactionsTabProps> = ({
  transactions,
  materials,
  onOpenNewTxModal,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Receive' | 'Actual Usage'>('all');
  const [materialFilter, setMaterialFilter] = useState<string>('all');

  const filteredTransactions = transactions
    .filter((tx) => {
      if (typeFilter !== 'all' && tx.Type !== typeFilter) return false;
      if (materialFilter !== 'all' && tx.RM_Code !== materialFilter) return false;

      const term = searchTerm.toLowerCase();
      const matchSearch =
        tx.RM_Code.toLowerCase().includes(term) ||
        tx.Recorder.toLowerCase().includes(term) ||
        tx.Note.toLowerCase().includes(term);

      return matchSearch;
    })
    .sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());

  const getMaterialName = (rmCode: string) => {
    const mat = materials.find((m) => m.RM_Code === rmCode);
    return mat ? `${mat.RM_Name} (${mat.Unit})` : rmCode;
  };

  const totalReceiveCount = transactions.filter((t) => t.Type === 'Receive').length;
  const totalUsageCount = transactions.filter((t) => t.Type === 'Actual Usage').length;

  return (
    <div className="space-y-4">
      {/* Top Filter & Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาผู้บันทึก, หมายเหตุ, รหัส..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-medium text-slate-600">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-md transition-colors min-h-[34px] ${
                typeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
              }`}
            >
              ทั้งหมด ({transactions.length})
            </button>
            <button
              onClick={() => setTypeFilter('Receive')}
              className={`px-3 py-1.5 rounded-md transition-colors min-h-[34px] ${
                typeFilter === 'Receive'
                  ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                  : 'hover:text-emerald-700'
              }`}
            >
              รับเข้า ({totalReceiveCount})
            </button>
            <button
              onClick={() => setTypeFilter('Actual Usage')}
              className={`px-3 py-1.5 rounded-md transition-colors min-h-[34px] ${
                typeFilter === 'Actual Usage'
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'hover:text-blue-700'
              }`}
            >
              เบิกใช้จริง ({totalUsageCount})
            </button>
          </div>

          {/* Material Select Filter */}
          <select
            value={materialFilter}
            onChange={(e) => setMaterialFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[38px]"
          >
            <option value="all">วัตถุดิบทั้งหมด ({materials.length} รายการ)</option>
            {materials.map((m) => (
              <option key={m.RM_Code} value={m.RM_Code}>
                {m.RM_Code} - {m.RM_Name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => onOpenNewTxModal('Receive')}
            id="btn-add-receive-tx"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors min-h-[40px]"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>+ รับเข้า (Receive)</span>
          </button>
          <button
            onClick={() => onOpenNewTxModal('Actual Usage')}
            id="btn-add-usage-tx"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors min-h-[40px]"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>+ เบิกใช้จริง</span>
          </button>
        </div>
      </div>

      {/* Main Transactions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-blue-600 shrink-0" />
            <h2 className="text-sm sm:text-base font-bold text-slate-800">
              บันทึกเคลื่อนไหวรับเข้า / เบิกใช้วัตถุดิบ (Stock Transactions)
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className="sm:hidden text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
              👉 ปัดซ้าย-ขวาเพื่อดูตาราง
            </span>
            <span>แสดง {filteredTransactions.length} รายการ</span>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[650px]">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[11px] sm:text-xs tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5">วันที่ (Date)</th>
                <th className="px-4 py-3.5">ประเภท</th>
                <th className="px-4 py-3.5">รหัสวัตถุดิบ</th>
                <th className="px-4 py-3.5">ชื่อวัตถุดิบ</th>
                <th className="px-4 py-3.5 text-right font-bold">จำนวน</th>
                <th className="px-4 py-3.5">ผู้บันทึก</th>
                <th className="px-4 py-3.5">หมายเหตุ</th>
                <th className="px-4 py-3.5 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredTransactions.map((tx, idx) => {
                const isReceive = tx.Type === 'Receive';
                return (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-slate-700 font-medium whitespace-nowrap text-xs sm:text-sm">
                      {tx.Date}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {isReceive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                          <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                          Receive (รับเข้า)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                          <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
                          Actual Usage (เบิกจริง)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-900 text-xs sm:text-sm">
                      {tx.RM_Code}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-900 text-xs sm:text-sm">
                      {getMaterialName(tx.RM_Code)}
                    </td>
                    <td
                      className={`px-4 py-3.5 text-right font-mono font-bold text-xs sm:text-sm ${
                        isReceive ? 'text-emerald-700' : 'text-slate-900'
                      }`}
                    >
                      {isReceive ? '+' : '-'}
                      {tx.Qty.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 text-xs sm:text-sm">
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{tx.Recorder || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs sm:text-sm">
                      {tx.Note || '-'}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                        {onEditTransaction && (
                          <button
                            onClick={() => onEditTransaction(tx, idx)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors min-h-[32px]"
                            title="แก้ไขรายการนี้"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>แก้ไข</span>
                          </button>
                        )}
                        {onDeleteTransaction && (
                          <button
                            onClick={() => {
                              if (window.confirm(`ต้องการลบรายการ ${tx.Type} สำหรับ ${tx.RM_Code} วันที่ ${tx.Date} หรือไม่?`)) {
                                onDeleteTransaction(idx);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                            title="ลบรายการนี้"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredTransactions.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-sm">
            ไม่พบรายการเคลื่อนไหวสต๊อกในเงื่อนไขนี้
          </div>
        )}
      </div>
    </div>
  );
};
