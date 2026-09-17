export interface MasterMaterial {
  id?: string;
  RM_Code: string;
  RM_Name: string;
  Unit: string;
  Opening_Stock: number;
  Safety_Stock: number;
  Unit_Price?: number; // ราคาต้นทุนต่อหน่วย (บาท)
  Supplier_Name?: string; // ซัพพลายเออร์ / ร้านค้าที่ซื้อ
}

export interface BOMRecipe {
  id?: string;
  Product_Code: string;
  Product_Name: string;
  RM_Code: string;
  Standard_Qty: number;
  effective_date?: string; // วันที่เริ่มมีผลบังคับใช้สูตรนี้ (YYYY-MM-DD) สำหรับการปรับปรุงสูตรในอนาคต
  note?: string; // บันทึกเหตุผลการปรับปรุงสูตร (เช่น ปรับลดหวาน, เพิ่มปริมาณ)
}

export interface MasterBranch {
  id?: string;
  branch_code: string;
  branch_name: string;
  is_active: boolean;
  note?: string;
  created_at?: string;
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
  Total_Dispatched?: number; // Formula: Dispatch_A + Dispatch_B + other branches
  Total_Leftover?: number; // Formula: Leftover_A + Leftover_B
  branch_dispatches?: Record<string, number>; // Dynamic dispatches per branch: { [branch_code]: quantity }
  Producer_Name?: string; // ผู้ผลิต / ผู้รับผิดชอบเมนูในแต่ละวัน (Chef / Operator / Shift)
}

export type TransactionType = 'Receive' | 'Actual Usage';

export type UsageReasonType =
  | 'PRODUCTION'
  | 'WASTE_SPOILED'
  | 'SAMPLE_TEST'
  | 'ADJUSTMENT'
  | 'OTHER';

export interface StockTransaction {
  id?: string;
  Date: string; // YYYY-MM-DD
  Type: TransactionType;
  RM_Code: string;
  Qty: number;
  Recorder: string;
  Note: string;
  productionId?: string;
  Unit_Price?: number; // ราคาซื้อต่อหน่วย (บาท)
  Total_Amount?: number; // ราคารวม (บาท)
  Reason_Type?: UsageReasonType | string; // เหตุผลการเบิก / ประเภทความเคลื่อนไหว
  Lot_No?: string; // เลขล็อต (Lot Number)
  Expiry_Date?: string; // วันหมดอายุ (Expiry Date: YYYY-MM-DD)
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
  Safety_Stock: number; // จุดเตือนสั่งซื้อขั้นต่ำ (Safety Stock)
  Stock_Status: '⚠️ วัตถุดิบใกล้หมด (ต้องสั่งเพิ่ม)' | 'ปกติ';
  isLowStock: boolean;
  isOverused: boolean;
  variancePercentage: number;
  Physical_Count?: number; // ยอดตรวจนับจริงสิ้นเดือน
  Physical_Variance?: number; // ผลต่างตรวจนับ (Physical_Count - Ending_Stock)
  Physical_Status?: 'ตรง' | 'ขาด' | 'เกิน' | 'ยังไม่ตรวจนับ';
}

export type UserRole = 'staff' | 'admin';

export interface MonthlyProductionSummary {
  id?: string;
  Month: string; // YYYY-MM
  Product_Code: string;
  Product_Name: string;
  Total_Produced_Qty: number;
  branch_dispatches?: Record<string, number>; // { [branch_code]: quantity }
  Total_Dispatched_Qty: number;
  Days_Produced_Count: number;
  Dispatch_Percentage?: number;
  created_at?: string;
  updated_at?: string;
}

export interface MonthlyInventorySnapshot {
  id?: string;
  Month: string; // YYYY-MM
  RM_Code: string;
  RM_Name: string;
  Unit: string;
  Opening_Stock: number;
  Total_Receive: number;
  Actual_Usage: number;
  Expected_Usage: number;
  Ending_Stock: number;
  Variance: number;
  Variance_Percentage: number;
  Safety_Stock: number;
  Stock_Status: string;
  Physical_Count?: number;
  Physical_Variance?: number;
  Physical_Status?: string;
  closed_at?: string;
  closed_by?: string;
}

export interface StockCountSessionHeader {
  id: string;
  Month: string; // YYYY-MM
  Count_Date: string; // YYYY-MM-DD
  Counted_By: string;
  Total_Items_Counted: number;
  Discrepancy_Items_Count: number;
  Status: 'draft' | 'completed' | 'applied_to_opening';
  Note?: string;
  created_at?: string;
}

export interface SystemSettingItem {
  key: string;
  value: string;
  updated_at?: string;
}

export type ActiveTab =
  | 'dashboard'
  | 'production'
  | 'transactions'
  | 'summary'
  | 'stock-count'
  | 'materials'
  | 'recipes'
  | 'branches';
