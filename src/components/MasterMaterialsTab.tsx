import React, { useState } from 'react';
import { MasterMaterial, MonthlyStockSummary } from '../types/stock';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Save,
  X,
  Trash2,
} from 'lucide-react';

interface MasterMaterialsTabProps {
  materials: MasterMaterial[];
  summaries: MonthlyStockSummary[];
  onAddMaterial: (mat: MasterMaterial) => void;
  onUpdateMaterial: (mat: MasterMaterial) => void;
  onDeleteMaterial?: (rmCode: string) => void;
}

export const MasterMaterialsTab: React.FC<MasterMaterialsTabProps> = ({
  materials,
  summaries,
  onAddMaterial,
  onUpdateMaterial,
  onDeleteMaterial,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<MasterMaterial | null>(null);
  const [materialToDelete, setMaterialToDelete] = useState<MasterMaterial | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // New Material form state
  const [newRMCode, setNewRMCode] = useState('');
  const [newRMName, setNewRMName] = useState('');
  const [newUnit, setNewUnit] = useState('kg');
  const [newOpening, setNewOpening] = useState<number>(0);
  const [newSafety, setNewSafety] = useState<number>(10);

  const filteredMaterials = materials.filter(
    (m) =>
      m.RM_Code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.RM_Name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRMCode || !newRMName) return;

    const trimmedCode = newRMCode.toUpperCase().trim();
    const existing = materials.find(
      (m) => m.RM_Code && m.RM_Code.toUpperCase().trim() === trimmedCode
    );

    if (existing) {
      onUpdateMaterial({
        RM_Code: trimmedCode,
        RM_Name: newRMName.trim(),
        Unit: newUnit.trim() || 'kg',
        Opening_Stock: Number(newOpening) || 0,
        Safety_Stock: Number(newSafety) || 0,
      });
      setNewRMCode('');
      setNewRMName('');
      setNewOpening(0);
      setNewSafety(10);
      setIsAdding(false);
      setDuplicateWarning(null);
      return;
    }

    onAddMaterial({
      RM_Code: trimmedCode,
      RM_Name: newRMName.trim(),
      Unit: newUnit.trim() || 'kg',
      Opening_Stock: Number(newOpening) || 0,
      Safety_Stock: Number(newSafety) || 0,
    });

    setNewRMCode('');
    setNewRMName('');
    setNewOpening(0);
    setNewSafety(10);
    setIsAdding(false);
    setDuplicateWarning(null);
  };

  const handleStartEdit = (mat: MasterMaterial) => {
    setEditingCode(mat.RM_Code);
    setEditForm({ ...mat });
  };

  const handleSaveEdit = () => {
    if (editForm) {
      onUpdateMaterial(editForm);
      setEditingCode(null);
      setEditForm(null);
    }
  };

  const confirmDelete = () => {
    if (materialToDelete && onDeleteMaterial) {
      onDeleteMaterial(materialToDelete.RM_Code);
      setMaterialToDelete(null);
    }
  };

  const getEndingStock = (rmCode: string) => {
    const summary = summaries.find((s) => s.RM_Code === rmCode);
    return summary ? summary.Ending_Stock : 0;
  };

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative min-w-[240px] flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหารหัส หรือ ชื่อวัตถุดิบ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          id="btn-add-material-master"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>+ เพิ่มวัตถุดิบใหม่ (New Material)</span>
        </button>
      </div>

      {/* Add New Material Form Card */}
      {isAdding && (
        <form
          onSubmit={handleSaveNew}
          className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              เพิ่มรายการวัตถุดิบใหม่เข้า Tab Master_Materials
            </h3>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                RM_Code (รหัสวัตถุดิบ) *
              </label>
              <input
                type="text"
                required
                placeholder="เช่น RM009"
                value={newRMCode}
                onChange={(e) => setNewRMCode(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono uppercase bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                RM_Name (ชื่อวัตถุดิบ) *
              </label>
              <input
                type="text"
                required
                placeholder="เช่น ครีมชีส (Cream Cheese)"
                value={newRMName}
                onChange={(e) => setNewRMName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unit (หน่วยนับ)
              </label>
              <input
                type="text"
                required
                placeholder="kg, L, pcs, tray"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Opening_Stock (ยกมาต้นงวด)
              </label>
              <input
                type="number"
                step="any"
                value={newOpening}
                onChange={(e) => setNewOpening(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Safety_Stock (จุดเตือนขั้นต่ำ)
              </label>
              <input
                type="number"
                step="any"
                value={newSafety}
                onChange={(e) => setNewSafety(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-200/60 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
            >
              บันทึกวัตถุดิบ
            </button>
          </div>
        </form>
      )}

      {/* Materials Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800">
              Tab 1: Master_Materials (ทะเบียนวัตถุดิบและจุดเตือน Safety Stock)
            </h2>
          </div>
          <span className="text-xs font-medium text-slate-500">
            ทั้งหมด {materials.length} รายการ
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] sm:text-xs tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5">RM_Code</th>
                <th className="px-4 py-3.5">RM_Name</th>
                <th className="px-4 py-3.5 text-center">Unit</th>
                <th className="px-4 py-3.5 text-right">Opening_Stock</th>
                <th className="px-4 py-3.5 text-right text-rose-600">
                  Safety_Stock (จุดเตือน)
                </th>
                <th className="px-4 py-3.5 text-right font-bold text-slate-900">
                  คงเหลือปัจจุบัน (Ending)
                </th>
                <th className="px-4 py-3.5 text-center">สถานะความปลอดภัย</th>
                <th className="px-4 py-3.5 text-center">แก้ไข</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredMaterials.map((m) => {
                const ending = getEndingStock(m.RM_Code);
                const isLow = ending <= m.Safety_Stock;
                const isEditing = editingCode === m.RM_Code;

                return (
                  <tr
                    key={m.RM_Code}
                    className={`hover:bg-slate-50 transition-colors ${
                      isLow ? 'bg-rose-50/20' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {m.RM_Code}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm?.RM_Name || ''}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev ? { ...prev, RM_Name: e.target.value } : null
                            )
                          }
                          className="px-2 py-1 border border-slate-300 rounded text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        m.RM_Name
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-slate-500">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm?.Unit || ''}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev ? { ...prev, Unit: e.target.value } : null
                            )
                          }
                          className="px-2 py-1 border border-slate-300 rounded text-xs w-16 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        m.Unit
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">
                      {isEditing ? (
                        <input
                          type="number"
                          step="any"
                          value={editForm?.Opening_Stock || 0}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    Opening_Stock: parseFloat(e.target.value) || 0,
                                  }
                                : null
                            )
                          }
                          className="px-2 py-1 border border-slate-300 rounded text-xs w-24 text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        m.Opening_Stock.toLocaleString()
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-rose-600 font-semibold">
                      {isEditing ? (
                        <input
                          type="number"
                          step="any"
                          value={editForm?.Safety_Stock || 0}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    Safety_Stock: parseFloat(e.target.value) || 0,
                                  }
                                : null
                            )
                          }
                          className="px-2 py-1 border border-slate-300 rounded text-xs w-24 text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        m.Safety_Stock.toLocaleString()
                      )}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono font-bold ${
                        isLow ? 'text-rose-600' : 'text-slate-900'
                      }`}
                    >
                      {ending.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          เตือนใกล้หมด
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          เพียงพอ
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={handleSaveEdit}
                            className="p-1 text-emerald-600 hover:text-emerald-700"
                            title="บันทึก"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingCode(null);
                              setEditForm(null);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-600"
                            title="ยกเลิก"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleStartEdit(m)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="แก้ไขข้อมูล / Safety Stock"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {onDeleteMaterial && (
                            <button
                              onClick={() => setMaterialToDelete(m)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title={`ลบวัตถุดิบ ${m.RM_Code} (${m.RM_Name})`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* In-App Delete Confirmation Modal */}
      {materialToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-rose-50 border-b border-rose-100 p-5 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  ยืนยันการลบวัตถุดิบ
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ระบบจะลบวัตถุดิบนี้ออกจากทะเบียน Master Materials ทันที
                </p>
              </div>
              <button
                onClick={() => setMaterialToDelete(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">รหัสวัตถุดิบ:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {materialToDelete.RM_Code}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ชื่อวัตถุดิบ:</span>
                  <span className="font-semibold text-slate-800">
                    {materialToDelete.RM_Name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ยอดยกมา:</span>
                  <span className="font-mono text-slate-700">
                    {materialToDelete.Opening_Stock.toLocaleString()} {materialToDelete.Unit}
                  </span>
                </div>
              </div>

              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  หากมีสูตรคำนวณ BOM ที่ใช้วัตถุดิบนี้ รายการส่วนผสมที่เกี่ยวข้องจะถูกนำออกด้วย
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setMaterialToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ยืนยันลบวัตถุดิบนี้</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
