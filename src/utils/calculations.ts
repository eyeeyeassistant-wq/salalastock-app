import {
  MasterMaterial,
  BOMRecipe,
  DailyProduction,
  StockTransaction,
  MonthlyStockSummary,
} from '../types/stock';

/**
 * Calculates Total_Dispatched & Total_Leftover for a production row
 */
export function calculateProductionRowTotals(item: Omit<DailyProduction, 'Total_Dispatched' | 'Total_Leftover'>): DailyProduction {
  const dispatchA = Number(item.Dispatch_Branch_A) || 0;
  const dispatchB = Number(item.Dispatch_Branch_B) || 0;
  const leftoverA = Number(item.Leftover_Branch_A) || 0;
  const leftoverB = Number(item.Leftover_Branch_B) || 0;

  return {
    ...item,
    Produced_Qty: Number(item.Produced_Qty) || 0,
    Dispatch_Branch_A: dispatchA,
    Dispatch_Branch_B: dispatchB,
    Leftover_Branch_A: leftoverA,
    Leftover_Branch_B: leftoverB,
    Total_Dispatched: dispatchA + dispatchB,
    Total_Leftover: leftoverA + leftoverB,
  };
}

/**
 * Compute the complete Monthly Stock Summary & Variance for all materials
 */
export function generateMonthlySummary(
  materials: MasterMaterial[],
  recipes: BOMRecipe[],
  productions: DailyProduction[],
  transactions: StockTransaction[],
  physicalCounts?: { [rmCode: string]: number }
): MonthlyStockSummary[] {
  return materials.map((material) => {
    const rmCode = material.RM_Code;

    // 1. Total_Receive: SUMIFS(Stock_Transactions!Qty, RM_Code, "Receive")
    const totalReceive = transactions
      .filter((t) => t.RM_Code === rmCode && t.Type === 'Receive')
      .reduce((sum, t) => sum + (Number(t.Qty) || 0), 0);

    // 2. Actual_Usage: SUMIFS(Stock_Transactions!Qty, RM_Code, "Actual Usage")
    const actualUsage = transactions
      .filter((t) => t.RM_Code === rmCode && t.Type === 'Actual Usage')
      .reduce((sum, t) => sum + (Number(t.Qty) || 0), 0);

    // 3. Expected_Usage: SUM of (Produced_Qty * Standard_Qty) for this RM_Code
    let expectedUsage = 0;
    productions.forEach((prod) => {
      const recipeMatch = recipes.find(
        (r) => r.Product_Code === prod.Product_Code && r.RM_Code === rmCode
      );
      if (recipeMatch) {
        expectedUsage += (Number(prod.Produced_Qty) || 0) * (Number(recipeMatch.Standard_Qty) || 0);
      }
    });

    // 4. Ending_Stock: Opening_Stock + Total_Receive - Actual_Usage
    const openingStock = Number(material.Opening_Stock) || 0;
    const endingStock = openingStock + totalReceive - actualUsage;

    // 5. Variance: Actual_Usage - Expected_Usage (BOM Variance)
    const variance = actualUsage - expectedUsage;

    // 6. Stock_Status: Ending_Stock <= Safety_Stock
    const safetyStock = Number(material.Safety_Stock) || 0;
    const isLowStock = endingStock <= safetyStock;
    const stockStatus: '⚠️ วัตถุดิบใกล้หมด (ต้องสั่งเพิ่ม)' | 'ปกติ' = isLowStock
      ? '⚠️ วัตถุดิบใกล้หมด (ต้องสั่งเพิ่ม)'
      : 'ปกติ';

    const isOverused = variance > 0.001;
    const variancePercentage =
      expectedUsage > 0 ? (variance / expectedUsage) * 100 : 0;

    // 7. Physical Stock Count comparison (ยอดเช็คสต็อกจริงสิ้นเดือน)
    const hasPhysicalCount = physicalCounts !== undefined && physicalCounts[rmCode] !== undefined;
    const physicalCountVal = hasPhysicalCount ? physicalCounts[rmCode] : undefined;
    const physicalVariance = hasPhysicalCount ? Number((physicalCountVal! - endingStock).toFixed(3)) : undefined;
    
    let physicalStatus: 'ตรง' | 'ขาด' | 'เกิน' | 'ยังไม่ตรวจนับ' = 'ยังไม่ตรวจนับ';
    if (hasPhysicalCount) {
      if (Math.abs(physicalVariance!) < 0.001) {
        physicalStatus = 'ตรง';
      } else if (physicalVariance! < 0) {
        physicalStatus = 'ขาด';
      } else {
        physicalStatus = 'เกิน';
      }
    }

    return {
      RM_Code: material.RM_Code,
      RM_Name: material.RM_Name,
      Unit: material.Unit,
      Opening_Stock: openingStock,
      Total_Receive: Number(totalReceive.toFixed(3)),
      Actual_Usage: Number(actualUsage.toFixed(3)),
      Expected_Usage: Number(expectedUsage.toFixed(3)),
      Ending_Stock: Number(endingStock.toFixed(3)),
      Variance: Number(variance.toFixed(3)),
      Stock_Status: stockStatus,
      isLowStock,
      isOverused,
      variancePercentage: Number(variancePercentage.toFixed(1)),
      Physical_Count: physicalCountVal !== undefined ? Number(physicalCountVal.toFixed(3)) : undefined,
      Physical_Variance: physicalVariance,
      Physical_Status: physicalStatus,
    };
  });
}

/**
 * Calculate required ingredient quantities for a given batch of product
 */
export function calculateIngredientsForBatch(
  productCode: string,
  qty: number,
  recipes: BOMRecipe[]
): Array<{ rmCode: string; standardQtyPerUnit: number; totalRequired: number }> {
  const matchedRecipes = recipes.filter((r) => r.Product_Code === productCode);
  return matchedRecipes.map((r) => ({
    rmCode: r.RM_Code,
    standardQtyPerUnit: r.Standard_Qty,
    totalRequired: Number((r.Standard_Qty * qty).toFixed(3)),
  }));
}

/**
 * Extract all distinct YYYY-MM months available in production and transaction records
 */
export function getAvailableMonths(
  productions: DailyProduction[] = [],
  transactions: StockTransaction[] = []
): string[] {
  const months = new Set<string>();
  const safeProds = Array.isArray(productions) ? productions : [];
  const safeTxs = Array.isArray(transactions) ? transactions : [];

  safeProds.forEach((p) => {
    if (p && typeof p.Date === 'string' && p.Date.length >= 7) {
      months.add(p.Date.substring(0, 7));
    }
  });
  safeTxs.forEach((t) => {
    if (t && typeof t.Date === 'string' && t.Date.length >= 7) {
      months.add(t.Date.substring(0, 7));
    }
  });
  
  if (months.size === 0) {
    const today = new Date().toISOString().substring(0, 7);
    months.add(today);
  }

  return Array.from(months).sort().reverse();
}

/**
 * Filter and compute summary for a specific month (YYYY-MM) or all
 */
export function generateMonthlySummaryForPeriod(
  materials: MasterMaterial[] = [],
  recipes: BOMRecipe[] = [],
  productions: DailyProduction[] = [],
  transactions: StockTransaction[] = [],
  selectedMonth: string = 'all', // 'all' or 'YYYY-MM'
  physicalCounts?: { [rmCode: string]: number }
): MonthlyStockSummary[] {
  const safeProds = Array.isArray(productions) ? productions : [];
  const safeTxs = Array.isArray(transactions) ? transactions : [];

  const filteredProductions = (!selectedMonth || selectedMonth === 'all')
    ? safeProds
    : safeProds.filter((p) => p && typeof p.Date === 'string' && p.Date.startsWith(selectedMonth));

  const filteredTransactions = (!selectedMonth || selectedMonth === 'all')
    ? safeTxs
    : safeTxs.filter((t) => t && typeof t.Date === 'string' && t.Date.startsWith(selectedMonth));

  return generateMonthlySummary(materials || [], recipes || [], filteredProductions, filteredTransactions, physicalCounts);
}
