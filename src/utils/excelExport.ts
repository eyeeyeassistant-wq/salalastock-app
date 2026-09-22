import * as XLSX from 'xlsx';
import {
  MasterMaterial,
  BOMRecipe,
  DailyProduction,
  StockTransaction,
  MonthlyStockSummary,
  MonthlyStockCountRecord,
  MasterBranch,
  MonthlyProductionSummary,
} from '../types/stock';
import { calculateMonthlyProductionSummaries } from './calculations';

export interface AllExportData {
  materials: MasterMaterial[];
  recipes: BOMRecipe[];
  productions: DailyProduction[];
  transactions: StockTransaction[];
  summaries: MonthlyStockSummary[];
  countRecords?: MonthlyStockCountRecord[];
  branches?: MasterBranch[];
  selectedMonth?: string;
}

/**
 * Helper to auto-fit column widths
 */
function fitColumns(data: any[]): { wch: number }[] {
  if (!data || data.length === 0) return [];
  const keys = Object.keys(data[0]);
  return keys.map((key) => {
    let maxLen = key.length;
    for (let i = 0; i < Math.min(data.length, 100); i++) {
      const val = data[i][key];
      if (val !== undefined && val !== null) {
        const str = String(val);
        // Thai characters take roughly 1.5 visually, or standard length
        if (str.length > maxLen) {
          maxLen = str.length;
        }
      }
    }
    return { wch: Math.min(Math.max(maxLen + 4, 12), 45) };
  });
}

/**
 * Export all system data into a single, comprehensive multi-sheet Excel file (.xlsx)
 */
export function exportAllDataToExcel({
  materials = [],
  recipes = [],
  productions = [],
  transactions = [],
  summaries = [],
  countRecords = [],
  branches = [],
  selectedMonth = 'all',
}: AllExportData): void {
  const wb = XLSX.utils.book_new();
  const dateStr = new Date().toISOString().substring(0, 10);
  const branchMap = new Map<string, string>();
  branches.forEach((b) => {
    branchMap.set(b.branch_code, b.branch_name);
  });

  // Material map for quick name lookup
  const matMap = new Map<string, MasterMaterial>();
  materials.forEach((m) => {
    matMap.set(m.RM_Code.trim().toUpperCase(), m);
  });

  // Recipe Product Name Map
  const prodNameMap = new Map<string, string>();
  recipes.forEach((r) => {
    if (r.Product_Code && r.Product_Name) {
      prodNameMap.set(r.Product_Code.trim().toUpperCase(), r.Product_Name.trim());
    }
  });

  // -------------------------------------------------------------
  // Sheet 1: สรุปสต็อก & Variance (Monthly Stock & Variance Summary)
  // -------------------------------------------------------------
  const summaryRows = summaries.map((s, idx) => ({
    'ลำดับ': idx + 1,
    'รหัสวัตถุดิบ (RM_Code)': s.RM_Code,
    'ชื่อวัตถุดิบ': s.RM_Name,
    'หน่วยนับ': s.Unit,
    'ยอดยกมา (Opening)': s.Opening_Stock,
    'รับเข้าทั้งหมด (Receive)': s.Total_Receive,
    'เบิกใช้จริง (Actual Usage)': s.Actual_Usage,
    'ควรใช้ตามสูตร (Expected Usage)': s.Expected_Usage,
    'คงเหลือปลายงวด (Ending)': s.Ending_Stock,
    'ผลต่าง (Variance)': s.Variance,
    '% ผลต่าง': `${s.variancePercentage}%`,
    'จุดเตือนสั่งซื้อ (Safety Stock)': s.Safety_Stock,
    'สถานะสต็อก': s.Stock_Status,
    'นับจริงสิ้นเดือน': s.Physical_Count ?? '-',
    'ผลต่างนับจริง': s.Physical_Variance ?? '-',
    'สถานะการตรวจนับ': s.Physical_Status ?? 'ยังไม่ตรวจนับ',
  }));

  if (summaryRows.length > 0) {
    const ws = XLSX.utils.json_to_sheet(summaryRows);
    ws['!cols'] = fitColumns(summaryRows);
    XLSX.utils.book_append_sheet(wb, ws, 'สรุปสต็อก_Variance');
  }

  // -------------------------------------------------------------
  // Sheet 2: สรุปผลผลิตรายเดือน (แยกเมนูและสาขา)
  // -------------------------------------------------------------
  const monthlyProdSummaries = calculateMonthlyProductionSummaries(
    productions,
    recipes,
    selectedMonth
  );

  const monthlyProdRows = monthlyProdSummaries.map((mp, idx) => {
    const row: Record<string, any> = {
      'ลำดับ': idx + 1,
      'งวดเดือน': mp.Month,
      'รหัสสินค้า': mp.Product_Code,
      'ชื่อสินค้า': mp.Product_Name,
      'จำนวนที่ผลิตรวมทั้งเดือน': mp.Total_Produced_Qty,
      'จำนวนวันที่ผลิต': mp.Days_Produced_Count,
    };

    // Add branch dispatch columns dynamically
    if (branches.length > 0) {
      branches.forEach((b) => {
        const qty = mp.branch_dispatches?.[b.branch_code] || 0;
        row[`ส่ง ${b.branch_name}`] = qty;
      });
    } else {
      row['ส่ง สาขา A'] = mp.branch_dispatches?.['BRANCH_A'] || 0;
      row['ส่ง สาขา B'] = mp.branch_dispatches?.['BRANCH_B'] || 0;
    }

    row['รวมส่งทุกสาขาทั้งเดือน'] = mp.Total_Dispatched_Qty;
    row['อัตราการจัดส่ง (%)'] = `${mp.Dispatch_Percentage || 0}%`;
    return row;
  });

  if (monthlyProdRows.length > 0) {
    const ws = XLSX.utils.json_to_sheet(monthlyProdRows);
    ws['!cols'] = fitColumns(monthlyProdRows);
    XLSX.utils.book_append_sheet(wb, ws, 'สรุปผลิตรายเดือน');
  }

  // -------------------------------------------------------------
  // Sheet 3: บันทึกผลิตรายวัน & ยอดส่งสาขา (Daily Production)
  // -------------------------------------------------------------
  const sortedProds = [...productions].sort((a, b) => b.Date.localeCompare(a.Date));
  const dailyProdRows = sortedProds.map((p, idx) => {
    const pCode = p.Product_Code.trim().toUpperCase();
    const pName = prodNameMap.get(pCode) || pCode;
    const row: Record<string, any> = {
      'ลำดับ': idx + 1,
      'วันที่': p.Date,
      'รหัสสินค้า': p.Product_Code,
      'ชื่อสินค้า': pName,
      'จำนวนผลิต (ชิ้น)': p.Produced_Qty,
      'ผู้ผลิต / เชฟผู้รับผิดชอบ': p.Producer_Name || '-',
    };

    // Dynamic branches
    if (branches.length > 0) {
      branches.forEach((b) => {
        const qty = p.branch_dispatches?.[b.branch_code] ?? (
          b.branch_code === 'BRANCH_A' ? p.Dispatch_Branch_A :
          b.branch_code === 'BRANCH_B' ? p.Dispatch_Branch_B : 0
        );
        row[`ส่ง ${b.branch_name}`] = Number(qty) || 0;
      });
    } else {
      row['ส่ง สาขา A'] = p.Dispatch_Branch_A;
      row['ส่ง สาขา B'] = p.Dispatch_Branch_B;
    }

    row['รวมส่งทุกสาขา'] = p.Total_Dispatched || 0;
    return row;
  });

  if (dailyProdRows.length > 0) {
    const ws = XLSX.utils.json_to_sheet(dailyProdRows);
    ws['!cols'] = fitColumns(dailyProdRows);
    XLSX.utils.book_append_sheet(wb, ws, 'บันทึกผลิตรายวัน');
  }

  // -------------------------------------------------------------
  // Sheet 4: ประวัติการรับเข้าและเบิกใช้ (Stock Transactions)
  // -------------------------------------------------------------
  const sortedTxs = [...transactions].sort((a, b) => b.Date.localeCompare(a.Date));
  const txRows = sortedTxs.map((t, idx) => {
    const rmCode = t.RM_Code.trim().toUpperCase();
    const mat = matMap.get(rmCode);
    const typeLabel = t.Type === 'Receive' ? 'รับเข้า (Receive)' : 'เบิกใช้จริง (Actual Usage)';
    const unitPrice = t.Unit_Price;
    const totalAmount = t.Total_Amount ?? (unitPrice && t.Qty ? Number((t.Qty * unitPrice).toFixed(2)) : undefined);
    return {
      'ลำดับ': idx + 1,
      'วันที่': t.Date,
      'ประเภทรายการ': typeLabel,
      'รหัสวัตถุดิบ': t.RM_Code,
      'ชื่อวัตถุดิบ': mat?.RM_Name || t.RM_Code,
      'จำนวน': t.Qty,
      'หน่วยนับ': mat?.Unit || '-',
      'ราคาต่อหน่วย (บาท)': unitPrice !== undefined ? unitPrice : '-',
      'มูลค่ารวม (บาท)': totalAmount !== undefined ? totalAmount : '-',
      'สาเหตุ / วัตถุประสงค์': t.Reason_Type || (t.Type === 'Receive' ? 'PURCHASE_RECEIVE' : 'PRODUCTION'),
      'หมายเลข Lot / แบทช์': t.Lot_No || '-',
      'วันหมดอายุ': t.Expiry_Date || '-',
      'ผู้บันทึก': t.Recorder || '-',
      'หมายเหตุ / อ้างอิง': t.Note || '-',
    };
  });

  if (txRows.length > 0) {
    const ws = XLSX.utils.json_to_sheet(txRows);
    ws['!cols'] = fitColumns(txRows);
    XLSX.utils.book_append_sheet(wb, ws, 'รายการเบิกรับสต็อก');
  }

  // -------------------------------------------------------------
  // Sheet 5: ตรวจนับสต็อกจริงสิ้นเดือน (Physical Stock Counts)
  // -------------------------------------------------------------
  const countItemsRows: any[] = [];
  countRecords.forEach((rec) => {
    (rec.Items || []).forEach((item, itemIdx) => {
      countItemsRows.push({
        'งวดเดือน': rec.Month,
        'วันที่ตรวจนับ': rec.Count_Date,
        'ผู้ตรวจนับ': rec.Counted_By,
        'รหัสวัตถุดิบ': item.RM_Code,
        'ชื่อวัตถุดิบ': item.RM_Name || item.RM_Code,
        'หน่วยนับ': item.Unit || '-',
        'ยอดตามระบบ': item.System_Qty,
        'ยอดนับจริง': item.Counted_Qty,
        'ผลต่าง (นับจริง - ระบบ)': item.Variance,
        'สถานะ': item.Variance === 0 ? 'ตรง' : item.Variance < 0 ? 'ขาด' : 'เกิน',
        'หมายเหตุ': item.Note || rec.Note || '-',
      });
    });
  });

  if (countItemsRows.length > 0) {
    const ws = XLSX.utils.json_to_sheet(countItemsRows);
    ws['!cols'] = fitColumns(countItemsRows);
    XLSX.utils.book_append_sheet(wb, ws, 'ตรวจนับสต็อกจริง');
  }

  // -------------------------------------------------------------
  // Sheet 6: ทะเบียนวัตถุดิบ (Master Materials)
  // -------------------------------------------------------------
  const matRows = materials.map((m, idx) => ({
    'ลำดับ': idx + 1,
    'รหัสวัตถุดิบ (RM_Code)': m.RM_Code,
    'ชื่อวัตถุดิบ': m.RM_Name,
    'หน่วยนับ': m.Unit,
    'ยอดยกมาเริ่มต้น (Opening Stock)': m.Opening_Stock,
    'จุดเตือนสต็อกขั้นต่ำ (Safety Stock)': m.Safety_Stock,
  }));

  if (matRows.length > 0) {
    const ws = XLSX.utils.json_to_sheet(matRows);
    ws['!cols'] = fitColumns(matRows);
    XLSX.utils.book_append_sheet(wb, ws, 'ทะเบียนวัตถุดิบ');
  }

  // -------------------------------------------------------------
  // Sheet 7: สูตรการผลิตมาตรฐาน (BOM Recipe)
  // -------------------------------------------------------------
  const recipeRows = recipes.map((r, idx) => {
    const rm = matMap.get(r.RM_Code.trim().toUpperCase());
    return {
      'ลำดับ': idx + 1,
      'รหัสสินค้า': r.Product_Code,
      'ชื่อสินค้า': r.Product_Name,
      'รหัสวัตถุดิบ': r.RM_Code,
      'ชื่อวัตถุดิบ': rm?.RM_Name || r.RM_Code,
      'ปริมาณมาตรฐานต่อ 1 ชิ้น': r.Standard_Qty,
      'หน่วยนับ': rm?.Unit || '-',
    };
  });

  if (recipeRows.length > 0) {
    const ws = XLSX.utils.json_to_sheet(recipeRows);
    ws['!cols'] = fitColumns(recipeRows);
    XLSX.utils.book_append_sheet(wb, ws, 'สูตรการผลิต_BOM');
  }

  // -------------------------------------------------------------
  // Sheet 8: ข้อมูลสาขา (Master Branches)
  // -------------------------------------------------------------
  const branchRows = branches.map((b, idx) => ({
    'ลำดับ': idx + 1,
    'รหัสสาขา': b.branch_code,
    'ชื่อสาขา': b.branch_name,
    'สถานะ': b.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน',
    'หมายเหตุ': b.note || '-',
  }));

  if (branchRows.length > 0) {
    const ws = XLSX.utils.json_to_sheet(branchRows);
    ws['!cols'] = fitColumns(branchRows);
    XLSX.utils.book_append_sheet(wb, ws, 'ข้อมูลสาขา');
  }

  // Trigger browser download
  const fileName = `Stock_Report_Complete_${selectedMonth !== 'all' ? selectedMonth + '_' : ''}${dateStr}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Export specific tab: Daily Production
 */
export function exportDailyProductionToExcel(
  productions: DailyProduction[],
  recipes: BOMRecipe[],
  branches: MasterBranch[] = []
): void {
  const wb = XLSX.utils.book_new();
  const prodNameMap = new Map<string, string>();
  recipes.forEach((r) => {
    if (r.Product_Code && r.Product_Name) {
      prodNameMap.set(r.Product_Code.trim().toUpperCase(), r.Product_Name.trim());
    }
  });

  const sortedProds = [...productions].sort((a, b) => b.Date.localeCompare(a.Date));
  const rows = sortedProds.map((p, idx) => {
    const pCode = p.Product_Code.trim().toUpperCase();
    const pName = prodNameMap.get(pCode) || pCode;
    const row: Record<string, any> = {
      'ลำดับ': idx + 1,
      'วันที่': p.Date,
      'รหัสสินค้า': p.Product_Code,
      'ชื่อสินค้า': pName,
      'จำนวนผลิต (ชิ้น)': p.Produced_Qty,
      'ผู้ผลิต / เชฟผู้รับผิดชอบ': p.Producer_Name || '-',
    };

    if (branches.length > 0) {
      branches.forEach((b) => {
        const qty = p.branch_dispatches?.[b.branch_code] ?? (
          b.branch_code === 'BRANCH_A' ? p.Dispatch_Branch_A :
          b.branch_code === 'BRANCH_B' ? p.Dispatch_Branch_B : 0
        );
        row[`ส่ง ${b.branch_name}`] = Number(qty) || 0;
      });
    } else {
      row['ส่ง สาขา A'] = p.Dispatch_Branch_A;
      row['ส่ง สาขา B'] = p.Dispatch_Branch_B;
    }

    row['รวมส่งทุกสาขา'] = p.Total_Dispatched || 0;
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = fitColumns(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'บันทึกผลิตรายวัน');
  XLSX.writeFile(wb, `Daily_Production_${new Date().toISOString().substring(0, 10)}.xlsx`);
}

/**
 * Export specific tab: Monthly Stock Summary & Variance
 */
export function exportMonthlySummaryToExcel(
  summaries: MonthlyStockSummary[],
  monthLabel: string = 'Current'
): void {
  const wb = XLSX.utils.book_new();
  const rows = summaries.map((s, idx) => ({
    'ลำดับ': idx + 1,
    'รหัสวัตถุดิบ (RM_Code)': s.RM_Code,
    'ชื่อวัตถุดิบ': s.RM_Name,
    'หน่วยนับ': s.Unit,
    'ยอดยกมา (Opening)': s.Opening_Stock,
    'รับเข้าทั้งหมด (Receive)': s.Total_Receive,
    'เบิกใช้จริง (Actual Usage)': s.Actual_Usage,
    'ควรใช้ตามสูตร (Expected Usage)': s.Expected_Usage,
    'คงเหลือปลายงวด (Ending)': s.Ending_Stock,
    'ผลต่าง (Variance)': s.Variance,
    '% ผลต่าง': `${s.variancePercentage}%`,
    'จุดเตือนสั่งซื้อ (Safety Stock)': s.Safety_Stock,
    'สถานะสต็อก': s.Stock_Status,
    'นับจริงสิ้นเดือน': s.Physical_Count ?? '-',
    'ผลต่างนับจริง': s.Physical_Variance ?? '-',
    'สถานะการตรวจนับ': s.Physical_Status ?? 'ยังไม่ตรวจนับ',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = fitColumns(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'สรุปสต็อก_Variance');
  XLSX.writeFile(wb, `Stock_Summary_${monthLabel}_${new Date().toISOString().substring(0, 10)}.xlsx`);
}

/**
 * Export specific tab: Stock Transactions
 */
export function exportStockTransactionsToExcel(
  transactions: StockTransaction[],
  materials: MasterMaterial[]
): void {
  const wb = XLSX.utils.book_new();
  const matMap = new Map<string, MasterMaterial>();
  materials.forEach((m) => matMap.set(m.RM_Code.trim().toUpperCase(), m));

  const sortedTxs = [...transactions].sort((a, b) => b.Date.localeCompare(a.Date));
  const rows = sortedTxs.map((t, idx) => {
    const mat = matMap.get(t.RM_Code.trim().toUpperCase());
    const unitPrice = t.Unit_Price;
    const totalAmount = t.Total_Amount ?? (unitPrice && t.Qty ? Number((t.Qty * unitPrice).toFixed(2)) : undefined);
    return {
      'ลำดับ': idx + 1,
      'วันที่': t.Date,
      'ประเภทรายการ': t.Type === 'Receive' ? 'รับเข้า (Receive)' : 'เบิกใช้จริง (Actual Usage)',
      'รหัสวัตถุดิบ': t.RM_Code,
      'ชื่อวัตถุดิบ': mat?.RM_Name || t.RM_Code,
      'จำนวน': t.Qty,
      'หน่วยนับ': mat?.Unit || '-',
      'ราคาต่อหน่วย (บาท)': unitPrice !== undefined ? unitPrice : '-',
      'มูลค่ารวม (บาท)': totalAmount !== undefined ? totalAmount : '-',
      'สาเหตุ / วัตถุประสงค์': t.Reason_Type || (t.Type === 'Receive' ? 'PURCHASE_RECEIVE' : 'PRODUCTION'),
      'หมายเลข Lot / แบทช์': t.Lot_No || '-',
      'วันหมดอายุ': t.Expiry_Date || '-',
      'ผู้บันทึก': t.Recorder || '-',
      'หมายเหตุ': t.Note || '-',
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = fitColumns(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'รายการเบิกรับสต็อก');
  XLSX.writeFile(wb, `Stock_Transactions_${new Date().toISOString().substring(0, 10)}.xlsx`);
}

/**
 * Export Monthly Production & Branch Dispatches Summary per Menu to Excel (.xlsx)
 */
export function exportMonthlyProductionSummaryToExcel(
  summaries: MonthlyProductionSummary[],
  branches: MasterBranch[] = [],
  periodLabel: string = 'Monthly'
): void {
  const wb = XLSX.utils.book_new();

  const activeBranches = branches.filter((b) => b.is_active !== false);
  const branchList = activeBranches.length > 0
    ? activeBranches
    : [
        { branch_code: 'BRANCH_A', branch_name: 'สาขา A' },
        { branch_code: 'BRANCH_B', branch_name: 'สาขา B' },
      ];

  const rows = summaries.map((s, idx) => {
    const row: Record<string, any> = {
      'ลำดับ (No.)': idx + 1,
      'เดือน (Month)': s.Month,
      'รหัสสินค้า (Product_Code)': s.Product_Code,
      'ชื่อเมนู/สินค้า (Product_Name)': s.Product_Name,
      'ยอดผลิตรวมทั้งเดือน (Produced_Qty)': s.Total_Produced_Qty,
    };

    branchList.forEach((b) => {
      const dispatchQty = s.branch_dispatches?.[b.branch_code] ?? 0;
      row[`ส่ง ${b.branch_name} (${b.branch_code})`] = dispatchQty;
    });

    row['รวมยอดจัดส่งทุกสาขา (Total_Dispatched)'] = s.Total_Dispatched_Qty;
    row['จำนวนวันที่ผลิต (Days_Produced)'] = s.Days_Produced_Count;
    row['สัดส่วนกระจายสินค้า (% Dispatched)'] = `${s.Dispatch_Percentage || 0}%`;

    return row;
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = fitColumns(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Monthly_Production_Summary');

  const cleanPeriod = periodLabel.replace(/[^a-zA-Z0-9_\u0E00-\u0E7F-]/g, '_');
  const fileName = `Monthly_Production_Summary_${cleanPeriod}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportFullDataToExcel(
  data: {
    materials: MasterMaterial[];
    recipes: BOMRecipe[];
    productions: DailyProduction[];
    transactions: StockTransaction[];
    stockCountRecords?: MonthlyStockCountRecord[];
    branches?: MasterBranch[];
  },
  fileName = 'Stock_Tracking_Backup.xlsx'
): void {
  exportAllDataToExcel({
    materials: data.materials,
    recipes: data.recipes,
    productions: data.productions,
    transactions: data.transactions,
    summaries: [],
    countRecords: data.stockCountRecords,
    branches: data.branches,
  });
}

