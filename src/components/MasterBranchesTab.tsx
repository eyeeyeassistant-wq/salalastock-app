import React, { useState, useMemo } from 'react';
import {
  Store,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  MapPin,
} from 'lucide-react';
import { MasterBranch, DailyProduction } from '../types/stock';

interface MasterBranchesTabProps {
  branches: MasterBranch[];
  productions: DailyProduction[];
  onSaveBranch: (branch: MasterBranch) => Promise<void> | void;
  onDeleteBranch: (branchCode: string) => Promise<void> | void;
}

export const MasterBranchesTab: React.FC<MasterBranchesTabProps> = ({
  branches,
  productions,
  onSaveBranch,
  onDeleteBranch,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<MasterBranch | null>(null);

  // Form State
  const [branchCode, setBranchCode] = useState('');
  const [branchName, setBranchName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete State
  const [branchToDelete, setBranchToDelete] = useState<MasterBranch | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Calculate stats
  const totalBranches = branches.length;
  const activeBranchesCount = branches.filter((b) => b.is_active).length;

  // Filtered branches
  const filteredBranches = useMemo(() => {
    if (!searchTerm.trim()) return branches;
    const term = searchTerm.toLowerCase().trim();
    return branches.filter(
      (b) =>
        b.branch_code.toLowerCase().includes(term) ||
        b.branch_name.toLowerCase().includes(term) ||
        (b.note && b.note.toLowerCase().includes(term))
    );
  }, [branches, searchTerm]);

  // Open modal for new
  const handleOpenAdd = () => {
    setEditingBranch(null);
    setBranchCode('');
    setBranchName('');
    setIsActive(true);
    setNote('');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal for edit
  const handleOpenEdit = (b: MasterBranch) => {
    setEditingBranch(b);
    setBranchCode(b.branch_code);
    setBranchName(b.branch_name);
    setIsActive(b.is_active !== false);
    setNote(b.note || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Handle Save
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanCode = branchCode.trim().toUpperCase();
    const cleanName = branchName.trim();

    if (!cleanCode) {
      setFormError('กรุณาระบุรหัสสาขา (เช่น BRANCH_A, BRANCH_C, BKK_01)');
      return;
    }

    if (!cleanName) {
      setFormError('กรุณาระบุชื่อสาขา (เช่น สาขา A, สาขา สยาม, สาขา พระราม 9)');
      return;
    }

    // Check duplicate code when creating new
    if (!editingBranch) {
      const isDuplicate = branches.some(
        (b) => b.branch_code.toUpperCase() === cleanCode
      );
      if (isDuplicate) {
        setFormError(`รหัสสาขา "${cleanCode}" มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSaveBranch({
        id: editingBranch?.id,
        branch_code: cleanCode,
        branch_name: cleanName,
        is_active: isActive,
        note: note.trim(),
      });
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลสาขา');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete
  const handleConfirmDelete = async () => {
    if (!branchToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteBranch(branchToDelete.branch_code);
      setBranchToDelete(null);
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการลบ: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Total dispatches for each branch
  const getBranchDispatchTotal = (code: string) => {
    return productions.reduce((sum, p) => {
      if (code === 'BRANCH_A') return sum + (Number(p.Dispatch_Branch_A) || 0);
      if (code === 'BRANCH_B') return sum + (Number(p.Dispatch_Branch_B) || 0);
      if (p.branch_dispatches && p.branch_dispatches[code] !== undefined) {
        return sum + (Number(p.branch_dispatches[code]) || 0);
      }
      return sum;
    }, 0);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                ข้อมูลสาขาและจุดกระจายสินค้า (Master Branches)
              </h2>
              <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-full border border-blue-200">
                {totalBranches} สาขา
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              จัดการรหัสสาขาและชื่อจุดจัดส่ง สำหรับบันทึกยอดส่งสินค้าประจำวันและดูสถิติ
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มสาขาใหม่</span>
        </button>
      </div>

      {/* Quick Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium block">สาขาทั้งหมดในระบบ</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-slate-900">{totalBranches}</span>
            <span className="text-xs text-slate-500">สาขา</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-emerald-600 font-medium block flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            เปิดรับจัดส่งปกติ
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-emerald-600">{activeBranchesCount}</span>
            <span className="text-xs text-slate-500">สาขา</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-slate-400 font-medium block flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" />
            ปิดการจัดส่งชั่วคราว
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono text-slate-500">
              {totalBranches - activeBranchesCount}
            </span>
            <span className="text-xs text-slate-500">สาขา</span>
          </div>
        </div>
      </div>

      {/* Search & Action Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหารหัส หรือชื่อสาขา..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="text-xs text-slate-500">
          แสดง <span className="font-semibold text-slate-800">{filteredBranches.length}</span> จากทั้งหมด {totalBranches} สาขา
        </div>
      </div>

      {/* Branches Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                <th className="px-4 py-3">ลำดับ</th>
                <th className="px-4 py-3">รหัสสาขา (Code)</th>
                <th className="px-4 py-3">ชื่อสาขา (Name)</th>
                <th className="px-4 py-3 text-center">สถานะ</th>
                <th className="px-4 py-3 text-right">ยอดจัดส่งสะสม</th>
                <th className="px-4 py-3">หมายเหตุ</th>
                <th className="px-4 py-3 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredBranches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                    <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    {searchTerm ? 'ไม่พบสาขาที่ตรงกับการค้นหา' : 'ยังไม่มีข้อมูลสาขาในระบบ กด "เพิ่มสาขาใหม่" เพื่อเริ่มต้น'}
                  </td>
                </tr>
              ) : (
                filteredBranches.map((b, idx) => {
                  const totalDispatched = getBranchDispatchTotal(b.branch_code);
                  return (
                    <tr key={b.branch_code} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">
                          {b.branch_code}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>{b.branch_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {b.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            เปิดใช้งาน
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            ปิดชั่วคราว
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                        {totalDispatched.toLocaleString()} ชิ้น
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {b.note || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(b)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                            title="แก้ไขข้อมูลสาขา"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>แก้ไข</span>
                          </button>
                          <button
                            onClick={() => setBranchToDelete(b)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="ลบสาขา"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Branch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingBranch ? 'แก้ไขข้อมูลสาขา' : 'เพิ่มสาขาใหม่'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingBranch ? `รหัสสาขา: ${editingBranch.branch_code}` : 'กำหนดรหัสและชื่อสาขาเพื่อเริ่มใช้งาน'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  รหัสสาขา (Branch Code) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value)}
                  disabled={!!editingBranch}
                  placeholder="เช่น BRANCH_C, BKK_01, PARAMOUNT"
                  className="w-full px-3 py-2 text-xs font-mono uppercase bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">
                  * ใช้ตัวอักษรภาษาอังกฤษหรือตัวเลข (เช่น BRANCH_A, BRANCH_B, BRANCH_C)
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  ชื่อสาขา (Branch Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="เช่น สาขา A, สาขา สยามสแควร์, สาขา เซ็นทรัล"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">
                    สถานะการเปิดรับสินค้า
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {isActive ? 'พร้อมรับจัดส่งสินค้าประจำวัน' : 'ปิดการจัดส่งชั่วคราว'}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  หมายเหตุ / ที่ตั้ง
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="เช่น สาขาหลัก, เบอร์ติดต่อผู้จัดการ"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : editingBranch ? 'บันทึกการแก้ไข' : 'เพิ่มสาขา'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {branchToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">ยืนยันการลบสาขา</h3>
                <p className="text-xs text-slate-500">
                  คุณต้องการลบสาขา <strong>{branchToDelete.branch_name} ({branchToDelete.branch_code})</strong> ใช่หรือไม่?
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 mb-4">
              * การลบสาขาจะไม่ส่งผลให้ประวัติการผลิตย้อนหลังสูญหาย แต่สาขานี้จะไม่แสดงในรายการเลือกจัดส่งสินค้าใหม่อีกต่อไป
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setBranchToDelete(null)}
                disabled={isDeleting}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors"
              >
                {isDeleting ? 'กำลังลบ...' : 'ยืนยันลบสาขา'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
