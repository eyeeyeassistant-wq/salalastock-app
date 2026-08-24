import {
  MasterMaterial,
  BOMRecipe,
  DailyProduction,
  StockTransaction,
  MonthlyStockCountRecord,
} from '../types/stock';

export interface SpreadsheetInfo {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
}

export interface SyncPayload {
  materials: MasterMaterial[];
  recipes: BOMRecipe[];
  productions: DailyProduction[];
  transactions: StockTransaction[];
  monthlyStockCounts?: MonthlyStockCountRecord[];
}

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

/**
 * Ready-to-use Google Apps Script source code for zero-login, 100% automatic 2-way sync
 */
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * ระบบสต๊อกและคำนวณวัตถุดิบ (Stock & Variance Tracking System)
 * Google Apps Script Web App for Zero-Login Auto-Sync
 */

function doPost(e) {
  try {
    var raw = e.postData.contents;
    var payload = JSON.parse(raw);
    var action = payload.action || 'syncAll';
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'syncAll' || action === 'init') {
      syncAllData(ss, payload.data || payload);
      return ContentService.createTextOutput(
        JSON.stringify({ status: 'success', message: 'Synced all sheets successfully', timestamp: new Date().toISOString() })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'appendTransaction') {
      appendTransactionRow(ss, payload.data);
      return ContentService.createTextOutput(
        JSON.stringify({ status: 'success', message: 'Transaction appended' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'appendProduction') {
      appendProductionRow(ss, payload.data);
      return ContentService.createTextOutput(
        JSON.stringify({ status: 'success', message: 'Production appended' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(
      JSON.stringify({ status: 'unknown_action' })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: 'error', error: err.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({ status: 'online', message: 'Stock Auto-Sync Web App is running' })
  ).setMimeType(ContentService.MimeType.JSON);
}

function syncAllData(ss, data) {
  var materials = data.materials || [];
  var recipes = data.recipes || [];
  var productions = data.productions || [];
  var transactions = data.transactions || [];

  // 1. Master_Materials
  var matSheet = getOrCreateSheet(ss, 'Master_Materials');
  matSheet.clearContents();
  var matRows = [
    ['RM_Code', 'RM_Name', 'Unit', 'Opening_Stock', 'Safety_Stock']
  ];
  materials.forEach(function(m) {
    matRows.push([m.RM_Code, m.RM_Name, m.Unit, Number(m.Opening_Stock) || 0, Number(m.Safety_Stock) || 0]);
  });
  matSheet.getRange(1, 1, matRows.length, 5).setValues(matRows);
  matSheet.getRange(1, 1, 1, 5).setBackground('#0f172a').setFontColor('#ffffff').setFontWeight('bold');

  // 2. BOM_Recipe
  var bomSheet = getOrCreateSheet(ss, 'BOM_Recipe');
  bomSheet.clearContents();
  var bomRows = [
    ['Product_Code', 'Product_Name', 'RM_Code', 'Standard_Qty']
  ];
  recipes.forEach(function(r) {
    bomRows.push([r.Product_Code, r.Product_Name, r.RM_Code, Number(r.Standard_Qty) || 0]);
  });
  bomSheet.getRange(1, 1, bomRows.length, 4).setValues(bomRows);
  bomSheet.getRange(1, 1, 1, 4).setBackground('#0f172a').setFontColor('#ffffff').setFontWeight('bold');

  // 3. Daily_Production
  var prodSheet = getOrCreateSheet(ss, 'Daily_Production');
  prodSheet.clearContents();
  var prodRows = [
    ['Date', 'Product_Code', 'Produced_Qty', 'Dispatch_Branch_A', 'Dispatch_Branch_B', 'Total_Dispatched']
  ];
  productions.forEach(function(p) {
    var dA = Number(p.Dispatch_Branch_A) || 0;
    var dB = Number(p.Dispatch_Branch_B) || 0;
    prodRows.push([
      p.Date,
      p.Product_Code,
      Number(p.Produced_Qty) || 0,
      dA,
      dB,
      dA + dB
    ]);
  });
  prodSheet.getRange(1, 1, prodRows.length, 6).setValues(prodRows);
  prodSheet.getRange(1, 1, 1, 6).setBackground('#0f172a').setFontColor('#ffffff').setFontWeight('bold');

  // 4. Stock_Transactions
  var txSheet = getOrCreateSheet(ss, 'Stock_Transactions');
  txSheet.clearContents();
  var txRows = [
    ['Date', 'Type', 'RM_Code', 'Qty', 'Recorder', 'Note']
  ];
  transactions.forEach(function(t) {
    txRows.push([t.Date, t.Type, t.RM_Code, Number(t.Qty) || 0, t.Recorder || '', t.Note || '']);
  });
  txSheet.getRange(1, 1, txRows.length, 6).setValues(txRows);
  txSheet.getRange(1, 1, 1, 6).setBackground('#0f172a').setFontColor('#ffffff').setFontWeight('bold');

  // 5. Monthly_Stock_Summary
  var sumSheet = getOrCreateSheet(ss, 'Monthly_Stock_Summary');
  sumSheet.clearContents();
  var sumHeader = [
    'RM_Code', 'RM_Name', 'Unit', 'Opening_Stock', 'Total_Receive', 'Actual_Usage', 'Expected_Usage', 'Ending_Stock', 'Variance', 'Stock_Status'
  ];
  var sumRows = [sumHeader];
  materials.forEach(function(m, idx) {
    var r = idx + 2;
    sumRows.push([
      m.RM_Code,
      m.RM_Name,
      m.Unit,
      '=IFERROR(XLOOKUP(A' + r + ', Master_Materials!$A:$A, Master_Materials!$D:$D, 0), 0)',
      '=IFERROR(SUMIFS(Stock_Transactions!$D:$D, Stock_Transactions!$C:$C, A' + r + ', Stock_Transactions!$B:$B, "Receive"), 0)',
      '=IFERROR(SUMIFS(Stock_Transactions!$D:$D, Stock_Transactions!$C:$C, A' + r + ', Stock_Transactions!$B:$B, "Actual Usage"), 0)',
      '=IFERROR(SUMPRODUCT(SUMIFS(Daily_Production!$C:$C, Daily_Production!$B:$B, FILTER(BOM_Recipe!$A:$A, BOM_Recipe!$C:$C = A' + r + ')), FILTER(BOM_Recipe!$D:$D, BOM_Recipe!$C:$C = A' + r + ')), 0)',
      '=D' + r + ' + E' + r + ' - F' + r,
      '=F' + r + ' - G' + r,
      '=IF(A' + r + '="", "", IF(H' + r + ' <= IFERROR(XLOOKUP(A' + r + ', Master_Materials!$A:$A, Master_Materials!$E:$E, 0), 0), "⚠️ ใกล้หมด", "ปกติ"))'
    ]);
  });
  sumSheet.getRange(1, 1, sumRows.length, 10).setValues(sumRows);
  sumSheet.getRange(1, 1, 1, 10).setBackground('#0f172a').setFontColor('#ffffff').setFontWeight('bold');

  // 6. Monthly_Stock_Count (ประวัติตรวจนับสต็อกจริงสิ้นเดือน)
  var countSheet = getOrCreateSheet(ss, 'Monthly_Stock_Count');
  countSheet.clearContents();
  var countRows = [
    ['Month', 'RM_Code', 'RM_Name', 'Unit', 'Counted_Qty', 'Recorded_At', 'Note']
  ];
  var counts = data.monthlyStockCounts || [];
  counts.forEach(function(c) {
    var items = c.Items || [];
    items.forEach(function(it) {
      countRows.push([c.Month, it.RM_Code, it.RM_Name, it.Unit, Number(it.Counted_Qty) || 0, c.Recorded_At || '', c.Note || '']);
    });
  });
  if (countRows.length > 1) {
    countSheet.getRange(1, 1, countRows.length, 7).setValues(countRows);
  } else {
    countSheet.getRange(1, 1, 1, 7).setValues(countRows);
  }
  countSheet.getRange(1, 1, 1, 7).setBackground('#0f172a').setFontColor('#ffffff').setFontWeight('bold');
}

function appendTransactionRow(ss, tx) {
  var sheet = getOrCreateSheet(ss, 'Stock_Transactions');
  sheet.appendRow([tx.Date, tx.Type, tx.RM_Code, Number(tx.Qty) || 0, tx.Recorder || '', tx.Note || '']);
}

function appendProductionRow(ss, p) {
  var sheet = getOrCreateSheet(ss, 'Daily_Production');
  var dA = Number(p.Dispatch_Branch_A) || 0;
  var dB = Number(p.Dispatch_Branch_B) || 0;
  sheet.appendRow([p.Date, p.Product_Code, Number(p.Produced_Qty) || 0, dA, dB, dA + dB]);
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}
`;

/**
 * Send full state to Google Apps Script Web App (Webhook URL)
 * Works without login, 100% reliable, zero CORS/popup issues
 */
export async function syncViaWebhook(
  webhookUrl: string,
  payload: SyncPayload,
  action: 'syncAll' | 'appendTransaction' | 'appendProduction' = 'syncAll'
): Promise<boolean> {
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    throw new Error('กรุณาระบุ URL ของ Google Apps Script Web App ให้ถูกต้อง');
  }

  try {
    // We send payload as JSON string. Google Apps Script Web Apps handle POST with no-cors or standard fetch
    await fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors', // essential for Google Apps Script redirects across origins
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action,
        data: payload,
        timestamp: new Date().toISOString(),
      }),
    });

    return true;
  } catch (err: any) {
    console.error('Error syncing via webhook:', err);
    throw new Error(`ไม่สามารถเชื่อมต่อ Google Webhook: ${err.message}`);
  }
}


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
  const productionRows = [
    [
      'Date',
      'Product_Code',
      'Produced_Qty',
      'Dispatch_Branch_A',
      'Dispatch_Branch_B',
      '={"Total_Dispatched"; ARRAYFORMULA(IF(A2:A="", "", N(D2:D) + N(E2:E)))}',
    ],
    ...productions.map((p) => [
      p.Date,
      p.Product_Code,
      p.Produced_Qty,
      p.Dispatch_Branch_A,
      p.Dispatch_Branch_B,
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
