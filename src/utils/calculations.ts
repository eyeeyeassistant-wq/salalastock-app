import {
  MasterMaterial,
  MasterBranch,
  BOMRecipe,
  DailyProduction,
  StockTransaction,
  MonthlyStockSummary,
  MonthlyProductionSummary,
} from '../types/stock';

/**
 * Calculates Total_Dispatched & Total_Leftover for a production row
 */
export function calculateProductionRowTotals(item: Partial<DailyProduction>): DailyProduction {
  const branchDispatches = item.branch_dispatches || {};
  let totalDispatched = 0;

  if (Object.keys(branchDispatches).length > 0) {
    totalDispatched = Object.values(branchDispatches).reduce(
      (sum: number, v: any) => sum + (Number(v) || 0),
      0
    );
  } else {
    totalDispatched = (Number(item.Dispatch_Branch_A) || 0) + (Number(item.Dispatch_Branch_B) || 0);
  }

  const leftoverA = Number(item.Leftover_Branch_A) || 0;
  const leftoverB = Number(item.Leftover_Branch_B) || 0;
  const dispatchA = branchDispatches['BRANCH_A'] !== undefined ? Number(branchDispatches['BRANCH_A']) || 0 : (Number(item.Dispatch_Branch_A) || 0);
  const dispatchB = branchDispatches['BRANCH_B'] !== undefined ? Number(branchDispatches['BRANCH_B']) || 0 : (Number(item.Dispatch_Branch_B) || 0);

  return {
    ...item,
    id: item.id || `prod_${item.Date || 'unknown'}_${(item.Product_Code || 'prod').trim()}_${Math.random().toString(36).slice(2, 7)}`,
    Date: String(item.Date || '').trim(),
    Product_Code: String(item.Product_Code || '').trim().toUpperCase(),
    Produced_Qty: Number(item.Produced_Qty) || 0,
    Dispatch_Branch_A: dispatchA,
    Dispatch_Branch_B: dispatchB,
    Leftover_Branch_A: leftoverA,
    Leftover_Branch_B: leftoverB,
    Total_Dispatched: totalDispatched,
    Total_Leftover: leftoverA + leftoverB,
    branch_dispatches: branchDispatches,
  } as DailyProduction;
}

/**
 * Sanitize and deduplicate materials by RM_Code (unique key)
 */
export function sanitizeMaterials(materials: MasterMaterial[] = []): MasterMaterial[] {
  const map = new Map<string, MasterMaterial>();
  const safeMats = Array.isArray(materials) ? materials : [];

  safeMats.forEach((m) => {
    if (!m || !m.RM_Code) return;
    const code = String(m.RM_Code).trim().toUpperCase();
    if (!code) return;

    const existing = map.get(code);
    if (!existing) {
      map.set(code, {
        id: m.id || `mat_${code}`,
        RM_Code: code,
        RM_Name: String(m.RM_Name || '').trim(),
        Unit: String(m.Unit || 'kg').trim(),
        Opening_Stock: Number(m.Opening_Stock) || 0,
        Safety_Stock: Number(m.Safety_Stock) || 0,
      });
    } else {
      // Keep most up-to-date non-empty values
      map.set(code, {
        ...existing,
        RM_Name: m.RM_Name && String(m.RM_Name).trim() ? String(m.RM_Name).trim() : existing.RM_Name,
        Unit: m.Unit && String(m.Unit).trim() ? String(m.Unit).trim() : existing.Unit,
        Opening_Stock: m.Opening_Stock !== undefined ? (Number(m.Opening_Stock) || 0) : existing.Opening_Stock,
        Safety_Stock: m.Safety_Stock !== undefined ? (Number(m.Safety_Stock) || 0) : existing.Safety_Stock,
      });
    }
  });

  return Array.from(map.values());
}

/**
 * Sanitize and deduplicate recipes by Product_Code + RM_Code
 */
export function sanitizeRecipes(recipes: BOMRecipe[] = []): BOMRecipe[] {
  const safeRecipes = Array.isArray(recipes) ? recipes : [];
  const map = new Map<string, BOMRecipe>();

  safeRecipes.forEach((r, idx) => {
    if (!r || !r.Product_Code || !r.RM_Code) return;
    const pCode = String(r.Product_Code).trim().toUpperCase();
    const rmCode = String(r.RM_Code).trim().toUpperCase();
    if (!pCode || !rmCode) return;

    const key = `${pCode}___${rmCode}`;
    const existing = map.get(key);
    const stdQty = Number(r.Standard_Qty) || 0;

    if (!existing) {
      map.set(key, {
        id: r.id || `recipe_${pCode}_${rmCode}_${idx}`,
        Product_Code: pCode,
        Product_Name: String(r.Product_Name || '').trim(),
        RM_Code: rmCode,
        Standard_Qty: stdQty,
      });
    } else {
      map.set(key, {
        ...existing,
        Product_Name: r.Product_Name && String(r.Product_Name).trim() ? String(r.Product_Name).trim() : existing.Product_Name,
        Standard_Qty: stdQty > 0 ? stdQty : existing.Standard_Qty,
      });
    }
  });

  return Array.from(map.values());
}

/**
 * Sanitize productions array ensuring stable IDs, valid numbers, valid dates, and deduplicating records
 */
export function sanitizeProductions(productions: DailyProduction[] = []): DailyProduction[] {
  const safeProds = Array.isArray(productions) ? productions : [];
  const mapByBusinessKey = new Map<string, DailyProduction>();

  safeProds.forEach((p) => {
    if (!p || !p.Date || !p.Product_Code) return;
    const pCode = String(p.Product_Code).trim().toUpperCase();
    const date = String(p.Date).trim();
    
    // Business key: Date + Product_Code (Enforces single daily production record per product per day)
    const key = `${date}___${pCode}`;
    const existing = mapByBusinessKey.get(key);

    if (existing) {
      // If the new item has a database/numeric ID, prefer it over a temporary client ID
      const hasNumericDbId = p.id && /^\d+$/.test(String(p.id));
      const existingHasNumericDbId = existing.id && /^\d+$/.test(String(existing.id));

      const mergedDispatches = {
        ...(existing.branch_dispatches || {}),
        ...(p.branch_dispatches || {}),
      };

      const finalItem = {
        ...existing,
        ...p,
        id: hasNumericDbId ? p.id : existingHasNumericDbId ? existing.id : (p.id || existing.id),
        branch_dispatches: mergedDispatches,
      };

      mapByBusinessKey.set(key, finalItem);
      return; // Deduplicate
    }

    mapByBusinessKey.set(key, p);
  });

  return Array.from(mapByBusinessKey.values()).map((p) => {
    return calculateProductionRowTotals(p);
  });
}

/**
 * Sanitize transactions array ensuring stable IDs, valid types, quantities, and deduplicating accidental cloned rows
 */
export function sanitizeTransactions(transactions: StockTransaction[] = []): StockTransaction[] {
  const safeTxs = Array.isArray(transactions) ? transactions : [];
  const uniqueTxs: StockTransaction[] = [];
  const seenSignatures = new Map<string, StockTransaction>();
  const seenIds = new Set<string>();

  safeTxs.forEach((t, idx) => {
    if (!t || !t.Date || !t.RM_Code || !t.Type) return;
    const date = String(t.Date).trim();
    const type: 'Actual Usage' | 'Receive' = t.Type === 'Actual Usage' ? 'Actual Usage' : 'Receive';
    const rmCode = String(t.RM_Code).trim().toUpperCase();
    const qty = Number(t.Qty) || 0;
    const note = String(t.Note || '').trim();
    const recorder = String(t.Recorder || '').trim();

    // Check duplicate by primary ID
    if (t.id && seenIds.has(String(t.id))) {
      return; // Skip duplicate ID
    }

    // Signature representing this specific transaction event (normalized quantity)
    const sig = `${date}___${type}___${rmCode}___${qty.toFixed(3)}___${note}`;

    const existing = seenSignatures.get(sig);
    if (existing) {
      // If the incoming transaction has a numeric database ID while existing had a temporary id, prefer the database one
      if (t.id && /^\d+$/.test(String(t.id)) && (!existing.id || !/^\d+$/.test(String(existing.id)))) {
        const itemIdx = uniqueTxs.indexOf(existing);
        if (itemIdx !== -1) {
          const updated = { ...existing, id: t.id };
          uniqueTxs[itemIdx] = updated;
          seenSignatures.set(sig, updated);
          seenIds.add(String(t.id));
        }
      }
      return; // Skip duplicate clone!
    }

    const cleanTx: StockTransaction = {
      id: t.id || `tx_${date}_${rmCode}_${idx}_${Math.random().toString(36).slice(2, 7)}`,
      productionId: t.productionId || undefined,
      Date: date,
      Type: type,
      RM_Code: rmCode,
      Qty: qty,
      Recorder: recorder,
      Note: note,
    };

    if (cleanTx.id) seenIds.add(String(cleanTx.id));
    seenSignatures.set(sig, cleanTx);
    uniqueTxs.push(cleanTx);
  });

  return uniqueTxs;
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
  const cleanMaterials = sanitizeMaterials(materials);
  const cleanRecipes = sanitizeRecipes(recipes);
  const safeProductions = Array.isArray(productions) ? productions : [];
  const safeTransactions = Array.isArray(transactions) ? transactions : [];

  return cleanMaterials.map((material) => {
    const rmCode = (material.RM_Code || '').trim().toUpperCase();

    // 1. Total_Receive: SUMIFS(Stock_Transactions!Qty, RM_Code, "Receive")
    const totalReceive = safeTransactions
      .filter((t) => {
        if (!t || !t.RM_Code) return false;
        const tCode = String(t.RM_Code).trim().toUpperCase();
        const tType = String(t.Type || '').trim().toLowerCase();
        return tCode === rmCode && tType === 'receive';
      })
      .reduce((sum, t) => sum + (Number(t.Qty) || 0), 0);

    // 2. Actual_Usage: SUMIFS(Stock_Transactions!Qty, RM_Code, "Actual Usage")
    // Intelligent handling: Distinguish between manual withdrawal entries by staff and automated BOM deductions.
    // If staff has entered manual withdrawal transactions, we use the manual entries (real warehouse withdrawals).
    // The auto-deduct transaction is only used as a fallback if no manual transactions were recorded for this material.
    const usageTxs = safeTransactions.filter((t) => {
      if (!t || !t.RM_Code) return false;
      const tCode = String(t.RM_Code).trim().toUpperCase();
      const tType = String(t.Type || '').trim().toLowerCase();
      return (
        tCode === rmCode &&
        (tType === 'actual usage' || tType === 'actual_usage' || tType === 'usage' || tType === 'actualusage')
      );
    });

    const isAutoTx = (t: StockTransaction): boolean => {
      const rec = String(t.Recorder || '').toLowerCase();
      const note = String(t.Note || '').toLowerCase();
      return (
        rec.includes('auto') ||
        rec.includes('อัตโนมัติ') ||
        note.includes('ตัดสต็อกตามยอดผลิต') ||
        Boolean(t.productionId)
      );
    };

    const manualUsageTxs = usageTxs.filter((t) => !isAutoTx(t));
    const autoUsageTxs = usageTxs.filter((t) => isAutoTx(t));

    let actualUsage = 0;
    if (manualUsageTxs.length > 0) {
      // Manual transactions entered by staff represent the actual real-world withdrawal
      actualUsage = manualUsageTxs.reduce((sum, t) => sum + (Number(t.Qty) || 0), 0);
    } else if (autoUsageTxs.length > 0) {
      // If no manual entry exists, fall back to auto-deducted BOM amounts
      actualUsage = autoUsageTxs.reduce((sum, t) => sum + (Number(t.Qty) || 0), 0);
    }
    actualUsage = Number(actualUsage.toFixed(3));

    // 3. Expected_Usage: SUM of (Produced_Qty * Standard_Qty) for this RM_Code across all productions and recipes
    let expectedUsage = 0;
    safeProductions.forEach((prod) => {
      if (!prod) return;
      const pCode = String(prod.Product_Code || '').trim().toUpperCase();
      const prodQty = Number(prod.Produced_Qty) || 0;
      if (prodQty <= 0 || !pCode) return;

      const matchingRecipes = cleanRecipes.filter((r) => {
        const rRmCode = String(r.RM_Code || '').trim().toUpperCase();
        if (rRmCode !== rmCode) return false;

        const rProdCode = String(r.Product_Code || '').trim().toUpperCase();
        const rProdName = String(r.Product_Name || '').trim().toUpperCase();

        // Exact matches
        if (rProdCode && rProdCode === pCode) return true;
        if (rProdName && rProdName === pCode) return true;

        // Partial / Prefix matches (e.g. "P001 - แร๊ปไก่" matching "P001" or "แร๊ปไก่")
        if (rProdCode && (pCode.startsWith(rProdCode) || pCode.includes(rProdCode))) return true;
        if (rProdName && (pCode.includes(rProdName) || rProdName.includes(pCode))) return true;

        return false;
      });

      matchingRecipes.forEach((r) => {
        const stdQty = Number(r.Standard_Qty) || 0;
        expectedUsage += prodQty * stdQty;
      });
    });
    expectedUsage = Number(expectedUsage.toFixed(3));

    // 4. Ending_Stock: Opening_Stock + Total_Receive - Actual_Usage
    const openingStock = Number(material.Opening_Stock) || 0;
    const endingStock = Number((openingStock + totalReceive - actualUsage).toFixed(3));

    // 5. Variance: Actual_Usage - Expected_Usage (ยอดเบิกจริง ลบด้วย ยอดที่ควรเบิกตามสูตร)
    // Positive (+) = Overused / Waste (เบิกเกินสูตร)
    // Negative (-) = Underused / Saved (เบิกประหยัดกว่าสูตร)
    // Zero (0) = Exact Match (เบิกตรงตามสูตร)
    const variance = Number((actualUsage - expectedUsage).toFixed(3));

    // 6. Stock_Status: Ending_Stock <= Safety_Stock
    const safetyStock = Number(material.Safety_Stock) || 0;
    const isLowStock = safetyStock > 0 && endingStock <= safetyStock;
    const stockStatus: '⚠️ วัตถุดิบใกล้หมด (ต้องสั่งเพิ่ม)' | 'ปกติ' = isLowStock
      ? '⚠️ วัตถุดิบใกล้หมด (ต้องสั่งเพิ่ม)'
      : 'ปกติ';

    const isOverused = variance > 0.001;
    const variancePercentage =
      expectedUsage > 0
        ? Number(((variance / expectedUsage) * 100).toFixed(1))
        : actualUsage > 0
        ? 100
        : 0;

    // 7. Physical Stock Count comparison (ยอดเช็คสต็อกจริงสิ้นเดือน)
    const hasPhysicalCount =
      physicalCounts !== undefined &&
      (physicalCounts[rmCode] !== undefined ||
        physicalCounts[material.RM_Code] !== undefined ||
        physicalCounts[rmCode.toLowerCase()] !== undefined);

    const physicalCountVal = hasPhysicalCount
      ? physicalCounts![rmCode] !== undefined
        ? physicalCounts![rmCode]
        : physicalCounts![material.RM_Code] !== undefined
        ? physicalCounts![material.RM_Code]
        : physicalCounts![rmCode.toLowerCase()]
      : undefined;

    const physicalVariance =
      physicalCountVal !== undefined ? Number((physicalCountVal - endingStock).toFixed(3)) : undefined;

    let physicalStatus: 'ตรง' | 'ขาด' | 'เกิน' | 'ยังไม่ตรวจนับ' = 'ยังไม่ตรวจนับ';
    if (physicalCountVal !== undefined && physicalVariance !== undefined) {
      if (Math.abs(physicalVariance) < 0.001) {
        physicalStatus = 'ตรง';
      } else if (physicalVariance < 0) {
        physicalStatus = 'ขาด';
      } else {
        physicalStatus = 'เกิน';
      }
    }

    return {
      RM_Code: material.RM_Code,
      RM_Name: material.RM_Name,
      Unit: material.Unit,
      Opening_Stock: Number(openingStock.toFixed(3)),
      Total_Receive: Number(totalReceive.toFixed(3)),
      Actual_Usage: Number(actualUsage.toFixed(3)),
      Expected_Usage: Number(expectedUsage.toFixed(3)),
      Ending_Stock: Number(endingStock.toFixed(3)),
      Variance: Number(variance.toFixed(3)),
      Safety_Stock: Number(safetyStock.toFixed(3)),
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

/**
 * Calculate Monthly Production & Branch Dispatches Summary per Menu (Product)
 * ผลรวมการผลิตแต่ละเมนูแต่ละสาขาทั้งเดือน
 */
export function calculateMonthlyProductionSummaries(
  productions: DailyProduction[] = [],
  recipes: BOMRecipe[] = [],
  branchesOrMonth: MasterBranch[] | string = [],
  maybeMonth?: string
): MonthlyProductionSummary[] {
  let selectedMonth = 'all';
  if (typeof branchesOrMonth === 'string') {
    selectedMonth = branchesOrMonth;
  } else if (typeof maybeMonth === 'string') {
    selectedMonth = maybeMonth;
  }

  const safeProds = Array.isArray(productions) ? productions : [];
  
  // Filter productions for selected month if specified
  const filteredProds = (!selectedMonth || selectedMonth === 'all')
    ? safeProds
    : safeProds.filter((p) => p && typeof p.Date === 'string' && p.Date.startsWith(selectedMonth));

  // Map product codes to names from recipes
  const productNameMap = new Map<string, string>();
  (recipes || []).forEach((r) => {
    if (r && r.Product_Code) {
      const code = r.Product_Code.trim().toUpperCase();
      if (!productNameMap.has(code) && r.Product_Name) {
        productNameMap.set(code, r.Product_Name.trim());
      }
    }
  });

  // Group by Product_Code
  const groupMap = new Map<
    string,
    {
      productCode: string;
      totalProduced: number;
      branchDispatches: Record<string, number>;
      totalDispatched: number;
      dates: Set<string>;
    }
  >();

  filteredProds.forEach((p) => {
    if (!p || !p.Product_Code) return;
    const code = p.Product_Code.trim().toUpperCase();
    if (!groupMap.has(code)) {
      groupMap.set(code, {
        productCode: code,
        totalProduced: 0,
        branchDispatches: {},
        totalDispatched: 0,
        dates: new Set(),
      });
    }

    const item = groupMap.get(code)!;
    item.totalProduced += Number(p.Produced_Qty) || 0;
    if (p.Date) item.dates.add(p.Date);

    // Calculate dispatches
    let rowDispatched = 0;
    if (p.branch_dispatches && Object.keys(p.branch_dispatches).length > 0) {
      Object.entries(p.branch_dispatches).forEach(([bCode, val]) => {
        const num = Number(val) || 0;
        item.branchDispatches[bCode] = (item.branchDispatches[bCode] || 0) + num;
        rowDispatched += num;
      });
    } else {
      const dispA = Number(p.Dispatch_Branch_A) || 0;
      const dispB = Number(p.Dispatch_Branch_B) || 0;
      item.branchDispatches['BRANCH_A'] = (item.branchDispatches['BRANCH_A'] || 0) + dispA;
      item.branchDispatches['BRANCH_B'] = (item.branchDispatches['BRANCH_B'] || 0) + dispB;
      rowDispatched = dispA + dispB;
    }

    if (p.Total_Dispatched !== undefined && Number(p.Total_Dispatched) > 0) {
      item.totalDispatched += Number(p.Total_Dispatched) || 0;
    } else {
      item.totalDispatched += rowDispatched;
    }
  });

  const monthLabel = selectedMonth && selectedMonth !== 'all' ? selectedMonth : new Date().toISOString().substring(0, 7);

  const results: MonthlyProductionSummary[] = Array.from(groupMap.values()).map((g) => {
    const prodName = productNameMap.get(g.productCode) || g.productCode;
    const pct = g.totalProduced > 0 ? Number(((g.totalDispatched / g.totalProduced) * 100).toFixed(1)) : 0;

    return {
      id: `${monthLabel}_${g.productCode}`,
      Month: monthLabel,
      Product_Code: g.productCode,
      Product_Name: prodName,
      Total_Produced_Qty: g.totalProduced,
      branch_dispatches: g.branchDispatches,
      Total_Dispatched_Qty: g.totalDispatched,
      Days_Produced_Count: g.dates.size,
      Dispatch_Percentage: pct,
    };
  });

  return results.sort((a, b) => b.Total_Produced_Qty - a.Total_Produced_Qty);
}
