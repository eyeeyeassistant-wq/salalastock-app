export interface MasterMaterial {
  id?: string;
  RM_Code: string;
  RM_Name: string;
  Unit: string;
  Opening_Stock: number;
  Safety_Stock: number;
}

export interface BOMRecipe {
  id?: string;
  Product_Code: string;
  Product_Name: string;
  RM_Code: string;
  Standard_Qty: number;
}

export interface DailyProduction {
  id?: string;
  Date: string; // YYYY-MM-DD
  Product_Code: string;
  Produced_Qty: number;
  Dispatch_Branch_A: number;
  Dispatch_Branch_B: number;
  Leftover_Branch_A?: number;
  Leftover_Branch_B?: number;
  Total_Dispatched?: number; // Formula: Dispatch_A + Dispatch_B
  Total_Leftover?: number; // Formula: Leftover_A + Leftover_B
}

export type TransactionType = 'Receive' | 'Actual Usage';

export interface StockTransaction {
  id?: string;
  Date: string; // YYYY-MM-DD
  Type: TransactionType;
  RM_Code: string;
  Qty: number;
  Recorder: string;
  Note: string;
}

export interface PhysicalStockCountItem {
  RM_Code: string;
  RM_Name?: string;
  Unit?: string;
  System_Qty: number; // ยอดสต็อกคำนวณตามระบบ
  Counted_Qty: number; // ยอดนับจริงสิ้นเดือน
  Variance: number; // ผลต่าง (Counted_Qty - System_Qty)
  Note?: string;
}

export interface MonthlyStockCountRecord {
  id?: string;
  Month: string; // YYYY-MM
  Count_Date: string; // YYYY-MM-DD
  Counted_By: string; // ผู้ตรวจนับ
  Note?: string;
  Items: PhysicalStockCountItem[];
  CreatedAt: string;
  AppliedAsOpening?: boolean;
}

export interface MonthlyStockSummary {
  RM_Code: string;
  RM_Name: string;
  Unit: string;
  Opening_Stock: number;
  Total_Receive: number;
  Actual_Usage: number;
  Expected_Usage: number;
  Ending_Stock: number;
  Variance: number;
  Stock_Status: '⚠️ วัตถุดิบใกล้หมด (ต้องสั่งเพิ่ม)' | 'ปกติ';
  isLowStock: boolean;
  isOverused: boolean;
  variancePercentage: number;
  Physical_Count?: number; // ยอดตรวจนับจริงสิ้นเดือน
  Physical_Variance?: number; // ผลต่างตรวจนับ (Physical_Count - Ending_Stock)
  Physical_Status?: 'ตรง' | 'ขาด' | 'เกิน' | 'ยังไม่ตรวจนับ';
}

export type UserRole = 'staff' | 'admin';

export type ActiveTab =
  | 'dashboard'
  | 'production'
  | 'transactions'
  | 'summary'
  | 'stock-count'
  | 'materials'
  | 'recipes'
  | 'formulas';
