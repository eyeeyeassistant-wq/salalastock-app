import React, { useState } from 'react';
import { BOMRecipe, MasterMaterial } from '../types/stock';
import {
  Sparkles,
  Plus,
  Search,
  Calculator,
  Layers,
  ChevronRight,
  X,
  Package,
  Trash2,
} from 'lucide-react';

interface BOMRecipeTabProps {
  recipes: BOMRecipe[];
  materials: MasterMaterial[];
  onAddRecipe: (recipe: BOMRecipe) => void;
  onDeleteRecipeItem?: (productCode: string, rmCode: string) => void;
}

export const BOMRecipeTab: React.FC<BOMRecipeTabProps> = ({
  recipes,
  materials,
  onAddRecipe,
  onDeleteRecipeItem,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductFilter, setSelectedProductFilter] = useState('all');
  const [isAdding, setIsAdding] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<{
    productCode: string;
    productName: string;
    rmCode: string;
    rmName: string;
  } | null>(null);

  // New Recipe Form
  const [newProdCode, setNewProdCode] = useState('');
  const [newProdName, setNewProdName] = useState('');
  const [newRMCode, setNewRMCode] = useState(materials[0]?.RM_Code || '');
  const [newStandardQty, setNewStandardQty] = useState<number>(0.1);

  // Simulation Calculator state
  const [simProduct, setSimProduct] = useState(recipes[0]?.Product_Code || '');
  const [simQty, setSimQty] = useState<number>(100);

  // Grouped products
  const productCodes: string[] = Array.from(new Set(recipes.map((r) => r.Product_Code)));

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdCode || !newProdName || !newRMCode || newStandardQty <= 0) return;

    onAddRecipe({
      Product_Code: newProdCode.toUpperCase().trim(),
      Product_Name: newProdName.trim(),
      RM_Code: newRMCode,
      Standard_Qty: Number(newStandardQty),
    });

    setNewStandardQty(0.1);
    setIsAdding(false);
  };

  const getMaterialName = (rmCode: string) => {
    const mat = materials.find((m) => m.RM_Code === rmCode);
    return mat ? `${mat.RM_Name} (${mat.Unit})` : rmCode;
  };

  const getMaterialUnit = (rmCode: string) => {
    const mat = materials.find((m) => m.RM_Code === rmCode);
    return mat ? mat.Unit : '';
  };

  // Sim ingredients
  const simIngredients = recipes
    .filter((r) => r.Product_Code === simProduct)
    .map((r) => ({
      ...r,
      totalNeeded: (r.Standard_Qty * simQty).toFixed(3),
      unit: getMaterialUnit(r.RM_Code),
      matName: getMaterialName(r.RM_Code),
    }));

  return (
    <div className="space-y-6">
      {/* Top Filter and Add Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <div className="relative min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อสินค้าหรือรหัส..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedProductFilter}
            onChange={(e) => setSelectedProductFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">สินค้าทั้งหมด ({productCodes.length} รายการ)</option>
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

        <button
          onClick={() => setIsAdding(!isAdding)}
          id="btn-add-bom-recipe"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>+ เพิ่มส่วนผสมในสูตร (Add BOM Item)</span>
        </button>
      </div>

      {/* Add Form */}
      {isAdding && (
        <form
          onSubmit={handleSaveNew}
          className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              เพิ่มส่วนประกอบวัตถุดิบเข้า Tab BOM_Recipe
            </h3>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product_Code (รหัสสินค้า) *
              </label>
              <input
                type="text"
                required
                placeholder="เช่น P001"
                value={newProdCode}
                onChange={(e) => setNewProdCode(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono uppercase bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product_Name (ชื่อสินค้า) *
              </label>
              <input
                type="text"
                required
                placeholder="เช่น เค้กช็อกโกแลตหน้านิ่ม"
                value={newProdName}
                onChange={(e) => setNewProdName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                RM_Code (เลือกวัตถุดิบ) *
              </label>
              <select
                value={newRMCode}
                onChange={(e) => setNewRMCode(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {materials.map((m) => (
                  <option key={m.RM_Code} value={m.RM_Code}>
                    {m.RM_Code} - {m.RM_Name} ({m.Unit})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Standard_Qty (ปริมาณต่อ 1 ชิ้น) *
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="0.25"
                value={newStandardQty}
                onChange={(e) => setNewStandardQty(parseFloat(e.target.value) || 0)}
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
              บันทึกสูตร
            </button>
          </div>
        </form>
      )}

      {/* Grouped Product BOM Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {productCodes
          .filter((code) => {
            if (selectedProductFilter !== 'all' && code !== selectedProductFilter) return false;
            const r = recipes.find((item) => item.Product_Code === code);
            if (
              searchTerm &&
              !code.toLowerCase().includes(searchTerm.toLowerCase()) &&
              !r?.Product_Name.toLowerCase().includes(searchTerm.toLowerCase())
            ) {
              return false;
            }
            return true;
          })
          .map((code) => {
            const productItems = recipes.filter((r) => r.Product_Code === code);
            const productName = productItems[0]?.Product_Name || code;

            return (
              <div
                key={code}
                className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                        {code}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-1">{productName}</h3>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      {productItems.length} วัตถุดิบ
                    </span>
                  </div>

                  <div className="p-3 divide-y divide-slate-100 text-xs">
                    {productItems.map((item, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900 font-mono">
                            {item.RM_Code}
                          </div>
                          <div className="text-slate-600 text-[11px]">
                            {getMaterialName(item.RM_Code)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className="font-mono font-bold text-slate-900">
                              {item.Standard_Qty.toLocaleString()}
                            </span>
                            <span className="text-slate-400 ml-1 text-[11px]">
                              {getMaterialUnit(item.RM_Code)} / ชิ้น
                            </span>
                          </div>
                          {onDeleteRecipeItem && (
                            <button
                              onClick={() =>
                                setRecipeToDelete({
                                  productCode: item.Product_Code,
                                  productName: item.Product_Name || '',
                                  rmCode: item.RM_Code,
                                  rmName: getMaterialName(item.RM_Code),
                                })
                              }
                              className="text-slate-300 hover:text-rose-600 hover:bg-rose-50 p-1 rounded transition-colors"
                              title={`ลบส่วนผสม ${item.RM_Code} ออกจากสูตร ${item.Product_Code}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
                  <button
                    onClick={() => {
                      setSimProduct(code);
                      setSimQty(50);
                    }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 transition-colors"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    จำลองคำนวณวัตถุดิบสำหรับสินค้านี้
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      {/* Interactive Batch Simulation Calculator */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                เครื่องมือจำลองการใช้วัตถุดิบตามยอดผลิต (Batch Ingredient Estimator)
              </h3>
              <p className="text-xs text-slate-500">
                คำนวณสูตร Standard_Qty x Produced_Qty ตรงตามสูตร Expected_Usage
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={simProduct}
              onChange={(e) => setSimProduct(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {productCodes.map((code) => {
                const r = recipes.find((i) => i.Product_Code === code);
                return (
                  <option key={code} value={code}>
                    {code} - {r?.Product_Name}
                  </option>
                );
              })}
            </select>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="1"
                value={simQty}
                onChange={(e) => setSimQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-slate-700 font-medium">ชิ้น</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {simIngredients.map((item, idx) => (
            <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="text-[11px] font-mono text-blue-600 font-bold">{item.RM_Code}</div>
              <div className="text-xs font-semibold text-slate-800 truncate">{item.matName}</div>
              <div className="mt-1 text-sm font-bold text-slate-900 font-mono">
                {item.totalNeeded} <span className="text-xs text-slate-500 font-normal">{item.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* In-App Delete Recipe Item Confirmation Modal */}
      {recipeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-rose-50 border-b border-rose-100 p-5 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  ยืนยันการลบส่วนผสมในสูตร
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ระบบจะลบวัตถุดิบนี้ออกจากสูตรมาตรฐาน (BOM Recipe)
                </p>
              </div>
              <button
                onClick={() => setRecipeToDelete(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">รหัสสินค้า:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {recipeToDelete.productCode} {recipeToDelete.productName ? `(${recipeToDelete.productName})` : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ส่วนผสมที่ต้องการลบ:</span>
                  <span className="font-mono font-bold text-rose-700">
                    {recipeToDelete.rmCode} {recipeToDelete.rmName ? `(${recipeToDelete.rmName})` : ''}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRecipeToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteRecipeItem) {
                    onDeleteRecipeItem(recipeToDelete.productCode, recipeToDelete.rmCode);
                  }
                  setRecipeToDelete(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ยืนยันลบส่วนผสม</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
