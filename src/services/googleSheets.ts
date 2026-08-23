import {
  MasterMaterial,
  BOMRecipe,
  DailyProduction,
  StockTransaction,
} from '../types/stock';

export interface SpreadsheetInfo {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
}

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

/**
 * Creates a brand new Google Spreadsheet containing all 5 pre-configured tabs with formulas,
 * styling, and initial data.
 */
export async function createStockSpreadsheet(
  accessToken: string,
  title: string = 'ระบบสต๊อกและคำนวณวัตถุดิบ (Stock & Variance Tracking)'
): Promise<SpreadsheetInfo> {
  const requestBody = {
    properties: {
      title,
    },
    sheets: [
      {
        properties: {
          title: 'Master_Materials',
          gridProperties: { frozenRowCount: 1, columnCount: 10 },
        },
      },
      {
        properties: {
          title: 'BOM_Recipe',
          gridProperties: { frozenRowCount: 1, columnCount: 10 },
        },
      },
      {
        properties: {
          title: 'Daily_Production',
          gridProperties: { frozenRowCount: 1, columnCount: 12 },
        },
      },
      {
        properties: {
          title: 'Stock_Transactions',
          gridProperties: { frozenRowCount: 1, columnCount: 10 },
        },
      },
      {
        properties: {
          title: 'Monthly_Stock_Summary',
          gridProperties: { frozenRowCount: 1, columnCount: 12 },
        },
      },
    ],
  };

  const response = await fetch(SHEETS_API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to create spreadsheet: ${errText}`);
  }

  const result = await response.json();
  const spreadsheetId = result.spreadsheetId;
  const spreadsheetUrl = result.spreadsheetUrl;

  return {
    spreadsheetId,
    spreadsheetUrl,
    title,
  };
}

/**
 * Populates initial data and live formulas into the newly created Google Spreadsheet
 */
export async function initializeSheetDataAndFormulas(
  accessToken: string,
  spreadsheetId: string,
  materials: MasterMaterial[],
  recipes: BOMRecipe[],
  productions: DailyProduction[],
  transactions: StockTransaction[]
) {
  // 1. Master_Materials rows
  const materialsRows = [
    ['RM_Code', 'RM_Name', 'Unit', 'Opening_Stock', 'Safety_Stock'],
    ...materials.map((m) => [m.RM_Code, m.RM_Name, m.Unit, m.Opening_Stock, m.Safety_Stock]),
  ];

  // 2. BOM_Recipe rows
  const recipeRows = [
    ['Product_Code', 'Product_Name', 'RM_Code', 'Standard_Qty'],
    ...recipes.map((r) => [r.Product_Code, r.Product_Name, r.RM_Code, r.Standard_Qty]),
  ];

  // 3. Daily_Production rows with ARRAYFORMULA in header
  // Total_Dispatched: ={"Total_Dispatched"; ARRAYFORMULA(IF(A2:A="", "", N(D2:D) + N(E2:E)))}
  // Total_Leftover: ={"Total_Leftover"; ARRAYFORMULA(IF(A2:A="", "", N(F2:F) + N(G2:G)))}
  const productionRows = [
    [
      'Date',
      'Product_Code',
      'Produced_Qty',
      'Dispatch_Branch_A',
      'Dispatch_Branch_B',
      'Leftover_Branch_A',
      'Leftover_Branch_B',
      '={"Total_Dispatched"; ARRAYFORMULA(IF(A2:A="", "", N(D2:D) + N(E2:E)))}',
      '={"Total_Leftover"; ARRAYFORMULA(IF(A2:A="", "", N(F2:F) + N(G2:G)))}',
    ],
    ...productions.map((p) => [
      p.Date,
      p.Product_Code,
      p.Produced_Qty,
      p.Dispatch_Branch_A,
      p.Dispatch_Branch_B,
      p.Leftover_Branch_A,
      p.Leftover_Branch_B,
      '', // calculated by ARRAYFORMULA
      '', // calculated by ARRAYFORMULA
    ]),
  ];

  // 4. Stock_Transactions rows
  const transactionRows = [
    ['Date', 'Type', 'RM_Code', 'Qty', 'Recorder', 'Note'],
    ...transactions.map((t) => [t.Date, t.Type, t.RM_Code, t.Qty, t.Recorder, t.Note]),
  ];

  // 5. Monthly_Stock_Summary rows with dynamic formulas
  const summaryHeader = [
    'RM_Code',
    'RM_Name',
    'Unit',
    'Opening_Stock',
    'Total_Receive',
    'Actual_Usage',
    'Expected_Usage',
    'Ending_Stock',
    'Variance',
    'Stock_Status',
  ];

  const summaryRows = [
    summaryHeader,
    ...materials.map((m, idx) => {
      const rowNum = idx + 2;
      return [
        m.RM_Code,
        m.RM_Name,
        m.Unit,
        `=XLOOKUP(A${rowNum}, Master_Materials!$A:$A, Master_Materials!$D:$D, 0)`,
        `=SUMIFS(Stock_Transactions!$D:$D, Stock_Transactions!$C:$C, A${rowNum}, Stock_Transactions!$B:$B, "Receive")`,
        `=SUMIFS(Stock_Transactions!$D:$D, Stock_Transactions!$C:$C, A${rowNum}, Stock_Transactions!$B:$B, "Actual Usage")`,
        `=IFERROR(SUMPRODUCT(SUMIFS(Daily_Production!$C:$C, Daily_Production!$B:$B, FILTER(BOM_Recipe!$A:$A, BOM_Recipe!$C:$C = A${rowNum})), FILTER(BOM_Recipe!$D:$D, BOM_Recipe!$C:$C = A${rowNum})), 0)`,
        `=D${rowNum} + E${rowNum} - F${rowNum}`,
        `=F${rowNum} - G${rowNum}`,
        `=IF(A${rowNum}="", "", IF(H${rowNum} <= XLOOKUP(A${rowNum}, Master_Materials!$A:$A, Master_Materials!$E:$E, 0), "⚠️ วัตถุดิบใกล้หมด (ต้องสั่งเพิ่ม)", "ปกติ"))`,
      ];
    }),
  ];

  // Batch update all data
  const data = [
    { range: 'Master_Materials!A1', values: materialsRows },
    { range: 'BOM_Recipe!A1', values: recipeRows },
    { range: 'Daily_Production!A1', values: productionRows },
    { range: 'Stock_Transactions!A1', values: transactionRows },
    { range: 'Monthly_Stock_Summary!A1', values: summaryRows },
  ];

  const response = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to batch update sheet values: ${err}`);
  }
}

/**
 * Appends a new Stock Transaction row to Google Sheets
 */
export async function appendTransactionToSheet(
  accessToken: string,
  spreadsheetId: string,
  tx: StockTransaction
) {
  const row = [tx.Date, tx.Type, tx.RM_Code, tx.Qty, tx.Recorder, tx.Note || ''];
  const response = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values/Stock_Transactions!A:F:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [row],
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to append transaction: ${err}`);
  }
}

/**
 * Appends a new Daily Production row to Google Sheets
 */
export async function appendProductionToSheet(
  accessToken: string,
  spreadsheetId: string,
  prod: DailyProduction
) {
  const row = [
    prod.Date,
    prod.Product_Code,
    prod.Produced_Qty,
    prod.Dispatch_Branch_A,
    prod.Dispatch_Branch_B,
    prod.Leftover_Branch_A,
    prod.Leftover_Branch_B,
    '', // Managed by ARRAYFORMULA
    '', // Managed by ARRAYFORMULA
  ];

  const response = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values/Daily_Production!A:I:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [row],
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to append production: ${err}`);
  }
}

/**
 * Reads all data from the spreadsheet tabs
 */
export async function fetchAllSheetData(
  accessToken: string,
  spreadsheetId: string
): Promise<{
  materials: MasterMaterial[];
  recipes: BOMRecipe[];
  productions: DailyProduction[];
  transactions: StockTransaction[];
}> {
  const ranges = [
    'Master_Materials!A2:E',
    'BOM_Recipe!A2:D',
    'Daily_Production!A2:I',
    'Stock_Transactions!A2:F',
  ];

  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values:batchGet?${ranges
    .map((r) => `ranges=${encodeURIComponent(r)}`)
    .join('&')}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to read sheet data: ${err}`);
  }

  const result = await response.json();
  const valueRanges = result.valueRanges || [];

  // 1. Materials
  const rawMaterials = valueRanges[0]?.values || [];
  const materials: MasterMaterial[] = rawMaterials
    .filter((row: any[]) => row && row[0])
    .map((row: any[]) => ({
      RM_Code: String(row[0] || '').trim(),
      RM_Name: String(row[1] || '').trim(),
      Unit: String(row[2] || '').trim(),
      Opening_Stock: parseFloat(row[3]) || 0,
      Safety_Stock: parseFloat(row[4]) || 0,
    }));

  // 2. Recipes
  const rawRecipes = valueRanges[1]?.values || [];
  const recipes: BOMRecipe[] = rawRecipes
    .filter((row: any[]) => row && row[0])
    .map((row: any[]) => ({
      Product_Code: String(row[0] || '').trim(),
      Product_Name: String(row[1] || '').trim(),
      RM_Code: String(row[2] || '').trim(),
      Standard_Qty: parseFloat(row[3]) || 0,
    }));

  // 3. Productions
  const rawProductions = valueRanges[2]?.values || [];
  const productions: DailyProduction[] = rawProductions
    .filter((row: any[]) => row && row[0])
    .map((row: any[]) => {
      const dispatchA = parseFloat(row[3]) || 0;
      const dispatchB = parseFloat(row[4]) || 0;
      const leftoverA = parseFloat(row[5]) || 0;
      const leftoverB = parseFloat(row[6]) || 0;
      return {
        Date: String(row[0] || '').trim(),
        Product_Code: String(row[1] || '').trim(),
        Produced_Qty: parseFloat(row[2]) || 0,
        Dispatch_Branch_A: dispatchA,
        Dispatch_Branch_B: dispatchB,
        Leftover_Branch_A: leftoverA,
        Leftover_Branch_B: leftoverB,
        Total_Dispatched: parseFloat(row[7]) || dispatchA + dispatchB,
        Total_Leftover: parseFloat(row[8]) || leftoverA + leftoverB,
      };
    });

  // 4. Transactions
  const rawTransactions = valueRanges[3]?.values || [];
  const transactions: StockTransaction[] = rawTransactions
    .filter((row: any[]) => row && row[0])
    .map((row: any[]) => ({
      Date: String(row[0] || '').trim(),
      Type: (String(row[1] || '').trim() === 'Receive' ? 'Receive' : 'Actual Usage') as any,
      RM_Code: String(row[2] || '').trim(),
      Qty: parseFloat(row[3]) || 0,
      Recorder: String(row[4] || '').trim(),
      Note: String(row[5] || '').trim(),
    }));

  return { materials, recipes, productions, transactions };
}
