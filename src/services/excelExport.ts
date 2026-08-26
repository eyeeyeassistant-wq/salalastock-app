import * as XLSX from 'xlsx';
import {
  MasterMaterial,
  BOMRecipe,
  DailyProduction,
  StockTransaction,
  MonthlyStockCountRecord,
  MonthlyStockSummary,
} from '../types/stock';

export interface FullStockData {
  materials: MasterMaterial[];
  recipes: BOMRecipe[];
  productions: DailyProduction[];
  transactions: StockTransaction[];
  stockCountRecords?: MonthlyStockCountRecord[];
}

/**
 * Export Monthly Stock Summary and Variance directly to a clean formatted Excel (.xlsx) file
 */
export function exportMonthlySummaryToExcel(
  summaries: MonthlyStockSummary[],
  periodLabel: string = 'All_Time'
) {
  const wb = XLSX.utils.book_new();

  const rows = summaries.map((s) => ({
    'รหัสวัตถุดิบ (RM_Code)': s.RM_Code,
    'ชื่อวัตถุดิบ (RM_Name)': s.RM_Name,
    'หน่วยนับ (Unit)': s.Unit,
    'ยอดยกมา (Opening_Stock)': s.Opening_Stock,
    'รับเข้าทั้งหมด (Total_Receive)': s.Total_Receive,
    'เบิกใช้จริง (Actual_Usage)': s.Actual_Usage,
    'ควรใช้ตามสูตร (Expected_Usage)': s.Expected_Usage,
    'คงเหลือสิ้นงวด (Ending_Stock)': s.Ending_Stock,
    'ผลต่าง (Variance)': s.Variance,
    '% ผลต่าง (% Variance)': `${s.variancePercentage}%`,
    'สถานะสต็อก (Stock_Status)': s.Stock_Status,
    'ยอดนับจริง (Physical_Count)': s.Physical_Count !== undefined ? s.Physical_Count : '-',
    'ผลต่างตรวจนับ (Physical_Variance)': s.Physical_Variance !== undefined ? s.Physical_Variance : '-',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Monthly_Stock_Summary');

  const cleanPeriod = periodLabel.replace(/[^a-zA-Z0-9_\u0E00-\u0E7F-]/g, '_');
  const fileName = `Monthly_Stock_Summary_${cleanPeriod}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportFullDataToExcel(data: FullStockData, fileName = 'Stock_Tracking_Backup.xlsx') {
  const wb = XLSX.utils.book_new();

  // 1. Master_Materials
  const matRows = data.materials.map((m) => ({
    RM_Code: m.RM_Code,
    RM_Name: m.RM_Name,
    Unit: m.Unit,
    Opening_Stock: m.Opening_Stock,
    Safety_Stock: m.Safety_Stock,
  }));
  const wsMaterials = XLSX.utils.json_to_sheet(matRows);
  XLSX.utils.book_append_sheet(wb, wsMaterials, 'Master_Materials');

  // 2. BOM_Recipe
  const recipeRows = data.recipes.map((r) => ({
    Product_Code: r.Product_Code,
    Product_Name: r.Product_Name,
    RM_Code: r.RM_Code,
    Standard_Qty: r.Standard_Qty,
  }));
  const wsRecipes = XLSX.utils.json_to_sheet(recipeRows);
  XLSX.utils.book_append_sheet(wb, wsRecipes, 'BOM_Recipe');

  // 3. Daily_Production
  const prodRows = data.productions.map((p) => ({
    Date: p.Date,
    Product_Code: p.Product_Code,
    Produced_Qty: p.Produced_Qty,
    Dispatch_Branch_A: p.Dispatch_Branch_A || 0,
    Dispatch_Branch_B: p.Dispatch_Branch_B || 0,
    Leftover_Branch_A: p.Leftover_Branch_A || 0,
    Leftover_Branch_B: p.Leftover_Branch_B || 0,
    Total_Dispatched: (p.Dispatch_Branch_A || 0) + (p.Dispatch_Branch_B || 0),
    Total_Leftover: (p.Leftover_Branch_A || 0) + (p.Leftover_Branch_B || 0),
  }));
  const wsProd = XLSX.utils.json_to_sheet(prodRows);
  XLSX.utils.book_append_sheet(wb, wsProd, 'Daily_Production');

  // 4. Stock_Transactions
  const txRows = data.transactions.map((t) => ({
    Date: t.Date,
    Type: t.Type,
    RM_Code: t.RM_Code,
    Qty: t.Qty,
    Recorder: t.Recorder || '',
    Note: t.Note || '',
  }));
  const wsTx = XLSX.utils.json_to_sheet(txRows);
  XLSX.utils.book_append_sheet(wb, wsTx, 'Stock_Transactions');

  // 5. Monthly_Stock_Count
  const countRows: any[] = [];
  (data.stockCountRecords || []).forEach((c) => {
    (c.Items || []).forEach((it) => {
      countRows.push({
        Month: c.Month,
        Count_Date: c.Count_Date,
        Counted_By: c.Counted_By,
        RM_Code: it.RM_Code,
        RM_Name: it.RM_Name || '',
        Unit: it.Unit || '',
        Counted_Qty: it.Counted_Qty,
        System_Qty: it.System_Qty,
        Variance: it.Variance,
        Note: it.Note || c.Note || '',
      });
    });
  });
  const wsCount = XLSX.utils.json_to_sheet(countRows.length > 0 ? countRows : [{ Month: '', RM_Code: '', RM_Name: '', Counted_Qty: 0 }]);
  XLSX.utils.book_append_sheet(wb, wsCount, 'Monthly_Stock_Count');

  // Write file
  XLSX.writeFile(wb, fileName);
}

export async function parseExcelImport(file: File): Promise<Partial<FullStockData>> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });

  const result: Partial<FullStockData> = {};

  if (wb.SheetNames.includes('Master_Materials')) {
    const raw: any[] = XLSX.utils.sheet_to_json(wb.Sheets['Master_Materials']);
    result.materials = raw
      .filter((r) => r.RM_Code)
      .map((r) => ({
        RM_Code: String(r.RM_Code).trim(),
        RM_Name: String(r.RM_Name || '').trim(),
        Unit: String(r.Unit || '').trim(),
        Opening_Stock: parseFloat(r.Opening_Stock) || 0,
        Safety_Stock: parseFloat(r.Safety_Stock) || 0,
      }));
  }

  if (wb.SheetNames.includes('BOM_Recipe')) {
    const raw: any[] = XLSX.utils.sheet_to_json(wb.Sheets['BOM_Recipe']);
    result.recipes = raw
      .filter((r) => r.Product_Code && r.RM_Code)
      .map((r) => ({
        Product_Code: String(r.Product_Code).trim(),
        Product_Name: String(r.Product_Name || '').trim(),
        RM_Code: String(r.RM_Code).trim(),
        Standard_Qty: parseFloat(r.Standard_Qty) || 0,
      }));
  }

  if (wb.SheetNames.includes('Daily_Production')) {
    const raw: any[] = XLSX.utils.sheet_to_json(wb.Sheets['Daily_Production']);
    result.productions = raw
      .filter((r) => r.Date && r.Product_Code)
      .map((r) => {
        const dA = parseFloat(r.Dispatch_Branch_A) || 0;
        const dB = parseFloat(r.Dispatch_Branch_B) || 0;
        const lA = parseFloat(r.Leftover_Branch_A) || 0;
        const lB = parseFloat(r.Leftover_Branch_B) || 0;
        return {
          Date: String(r.Date).trim(),
          Product_Code: String(r.Product_Code).trim(),
          Produced_Qty: parseFloat(r.Produced_Qty) || 0,
          Dispatch_Branch_A: dA,
          Dispatch_Branch_B: dB,
          Leftover_Branch_A: lA,
          Leftover_Branch_B: lB,
          Total_Dispatched: parseFloat(r.Total_Dispatched) || dA + dB,
          Total_Leftover: parseFloat(r.Total_Leftover) || lA + lB,
        };
      });
  }

  if (wb.SheetNames.includes('Stock_Transactions')) {
    const raw: any[] = XLSX.utils.sheet_to_json(wb.Sheets['Stock_Transactions']);
    result.transactions = raw
      .filter((r) => r.Date && r.RM_Code)
      .map((r) => ({
        Date: String(r.Date).trim(),
        Type: (String(r.Type).trim() === 'Receive' ? 'Receive' : 'Actual Usage') as any,
        RM_Code: String(r.RM_Code).trim(),
        Qty: parseFloat(r.Qty) || 0,
        Recorder: String(r.Recorder || '').trim(),
        Note: String(r.Note || '').trim(),
      }));
  }

  return result;
}
