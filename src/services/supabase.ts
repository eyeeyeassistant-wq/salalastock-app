import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  MasterMaterial,
  BOMRecipe,
  DailyProduction,
  StockTransaction,
  PhysicalStockCountItem,
  MonthlyStockCountRecord,
  MasterBranch,
  MonthlyProductionSummary,
  MonthlyInventorySnapshot,
  StockCountSessionHeader,
  MonthlyStockSummary,
} from '../types/stock';

// Environment variable and default fallback configuration
// Handles both raw URLs and project dashboard links copied by users
export function sanitizeSupabaseUrl(input?: string): string {
  let url = (input || '').trim();
  // Strip enclosing quotes, brackets
  url = url.replace(/^[\["']+|[\]"']+$/g, '').trim();

  // If user pasted dashboard link: https://supabase.com/dashboard/project/nnoioxyixmpfyhozysrm/settings/api-keys
  const match = url.match(/supabase\.com\/dashboard\/project\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://${match[1]}.supabase.co`;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url.replace(/\/+$/, '');
  }

  // Default project URL provided by user
  return 'https://nnoioxyixmpfyhozysrm.supabase.co';
}

export function sanitizeSupabaseKey(input?: string): string {
  let key = (input || '').trim();
  key = key.replace(/^[\["']+|[\]"']+$/g, '').trim();
  if (key) return key;
  // Default anon publishable key provided by user
  return 'sb_publishable_JMQhGiYIq88sSGc1GEL10w_DbBViPWZ';
}

// Config getters
export function getSupabaseConfig(): { url: string; anonKey: string } {
  const envUrl =
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL);

  const envKey =
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const storedUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('supabase_url') : null;
  const storedKey = typeof localStorage !== 'undefined' ? localStorage.getItem('supabase_anon_key') : null;

  return {
    url: sanitizeSupabaseUrl(storedUrl || envUrl || 'https://nnoioxyixmpfyhozysrm.supabase.co'),
    anonKey: sanitizeSupabaseKey(storedKey || envKey || 'sb_publishable_JMQhGiYIq88sSGc1GEL10w_DbBViPWZ'),
  };
}

export function setSupabaseConfig(url: string, anonKey: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('supabase_url', sanitizeSupabaseUrl(url));
    localStorage.setItem('supabase_anon_key', sanitizeSupabaseKey(anonKey));
  }
  supabaseInstance = null; // reset client cache
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  const { url, anonKey } = getSupabaseConfig();
  if (!supabaseInstance) {
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return supabaseInstance;
}

// SQL Schema Definition for easy copy/paste into Database SQL Console
export const NEW_TABLES_SQL_SCHEMA = `-- ============================================================
-- SQL Schema สำหรับ 4 ตารางใหม่ (สรุปยอดผลิต/สต็อก/รอบตรวจนับ/ตั้งค่า)
-- นำโค้ดนี้ไปรันใน Supabase SQL Editor หากเคยรัน 6 ตารางแรกไปแล้ว
-- ============================================================

-- 7. Table: monthly_production_summary (สรุปผลรวมการผลิตแต่ละเมนูและยอดส่งสาขารายเดือน)
CREATE TABLE IF NOT EXISTS monthly_production_summary (
  id TEXT PRIMARY KEY,
  month TEXT NOT NULL,
  product_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  total_produced_qty NUMERIC DEFAULT 0,
  branch_dispatches JSONB DEFAULT '{}'::jsonb,
  total_dispatched_qty NUMERIC DEFAULT 0,
  days_produced_count INTEGER DEFAULT 0,
  dispatch_percentage NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_monthly_prod_month ON monthly_production_summary(month);

-- 8. Table: monthly_inventory_summary (ผลสรุปคำนวณสต็อกและ Variance ปิดงวดรายเดือน)
CREATE TABLE IF NOT EXISTS monthly_inventory_summary (
  id TEXT PRIMARY KEY,
  month TEXT NOT NULL,
  rm_code TEXT NOT NULL,
  rm_name TEXT NOT NULL,
  unit TEXT NOT NULL,
  opening_stock NUMERIC DEFAULT 0,
  total_receive NUMERIC DEFAULT 0,
  actual_usage NUMERIC DEFAULT 0,
  expected_usage NUMERIC DEFAULT 0,
  ending_stock NUMERIC DEFAULT 0,
  variance NUMERIC DEFAULT 0,
  variance_percentage NUMERIC DEFAULT 0,
  safety_stock NUMERIC DEFAULT 0,
  stock_status TEXT,
  physical_count NUMERIC,
  physical_variance NUMERIC,
  physical_status TEXT,
  closed_at TIMESTAMPTZ DEFAULT NOW(),
  closed_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_monthly_inv_month ON monthly_inventory_summary(month);

-- 9. Table: stock_count_sessions (รอบเอกสารการตรวจนับสต็อกสิ้นเดือน)
CREATE TABLE IF NOT EXISTS stock_count_sessions (
  id TEXT PRIMARY KEY,
  month TEXT NOT NULL,
  count_date TEXT NOT NULL,
  counted_by TEXT NOT NULL,
  total_items_counted INTEGER DEFAULT 0,
  discrepancy_items_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completed',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Table: system_settings (การตั้งค่าระบบส่วนกลางและ LINE Notify)
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) & Allow Anonymous Access
ALTER TABLE monthly_production_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on monthly_production_summary" ON monthly_production_summary;
CREATE POLICY "Allow anon all on monthly_production_summary" ON monthly_production_summary FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE monthly_inventory_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on monthly_inventory_summary" ON monthly_inventory_summary;
CREATE POLICY "Allow anon all on monthly_inventory_summary" ON monthly_inventory_summary FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE stock_count_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on stock_count_sessions" ON stock_count_sessions;
CREATE POLICY "Allow anon all on stock_count_sessions" ON stock_count_sessions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on system_settings" ON system_settings;
CREATE POLICY "Allow anon all on system_settings" ON system_settings FOR ALL USING (true) WITH CHECK (true);
`;

export const SUPABASE_SQL_SCHEMA = `-- ============================================================
-- SQL Schema for Complete Stock & Production Tracking System (10 Tables)
-- Execute this in your Database SQL Console / Query Editor
-- ============================================================

-- 1. Table: master_materials
CREATE TABLE IF NOT EXISTS master_materials (
  rm_code TEXT PRIMARY KEY,
  rm_name TEXT NOT NULL,
  unit TEXT NOT NULL,
  opening_stock NUMERIC DEFAULT 0,
  safety_stock NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table: bom_recipe
CREATE TABLE IF NOT EXISTS bom_recipe (
  id TEXT PRIMARY KEY,
  product_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  rm_code TEXT NOT NULL,
  standard_qty NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table: master_branches (ข้อมูลสาขาและจุดกระจายสินค้า)
CREATE TABLE IF NOT EXISTS master_branches (
  id TEXT PRIMARY KEY,
  branch_code TEXT UNIQUE NOT NULL,
  branch_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table: daily_production (บันทึกยอดผลิตและกระจายส่งสาขาแบบ Dynamic ไม่จำกัดสาขา)
CREATE TABLE IF NOT EXISTS daily_production (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  product_code TEXT NOT NULL,
  produced_qty NUMERIC DEFAULT 0,
  total_dispatched NUMERIC DEFAULT 0,
  branch_dispatches JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_daily_production_date ON daily_production(date);
CREATE INDEX IF NOT EXISTS idx_daily_production_product ON daily_production(product_code);

-- 5. Table: stock_transactions
CREATE TABLE IF NOT EXISTS stock_transactions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Receive', 'Actual Usage')),
  rm_code TEXT NOT NULL,
  qty NUMERIC DEFAULT 0,
  recorder TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Table: monthly_stock_counts
CREATE TABLE IF NOT EXISTS monthly_stock_counts (
  id TEXT PRIMARY KEY,
  count_date TEXT NOT NULL,
  rm_code TEXT NOT NULL,
  system_stock NUMERIC DEFAULT 0,
  actual_count NUMERIC DEFAULT 0,
  discrepancy NUMERIC DEFAULT 0,
  recorder TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Table: monthly_production_summary (สรุปผลรวมการผลิตแต่ละเมนูและยอดส่งสาขารายเดือน)
CREATE TABLE IF NOT EXISTS monthly_production_summary (
  id TEXT PRIMARY KEY,
  month TEXT NOT NULL,
  product_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  total_produced_qty NUMERIC DEFAULT 0,
  branch_dispatches JSONB DEFAULT '{}'::jsonb,
  total_dispatched_qty NUMERIC DEFAULT 0,
  days_produced_count INTEGER DEFAULT 0,
  dispatch_percentage NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_monthly_prod_month ON monthly_production_summary(month);

-- 8. Table: monthly_inventory_summary (ผลสรุปคำนวณสต็อกและ Variance ปิดงวดรายเดือน)
CREATE TABLE IF NOT EXISTS monthly_inventory_summary (
  id TEXT PRIMARY KEY,
  month TEXT NOT NULL,
  rm_code TEXT NOT NULL,
  rm_name TEXT NOT NULL,
  unit TEXT NOT NULL,
  opening_stock NUMERIC DEFAULT 0,
  total_receive NUMERIC DEFAULT 0,
  actual_usage NUMERIC DEFAULT 0,
  expected_usage NUMERIC DEFAULT 0,
  ending_stock NUMERIC DEFAULT 0,
  variance NUMERIC DEFAULT 0,
  variance_percentage NUMERIC DEFAULT 0,
  safety_stock NUMERIC DEFAULT 0,
  stock_status TEXT,
  physical_count NUMERIC,
  physical_variance NUMERIC,
  physical_status TEXT,
  closed_at TIMESTAMPTZ DEFAULT NOW(),
  closed_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_monthly_inv_month ON monthly_inventory_summary(month);

-- 9. Table: stock_count_sessions (รอบเอกสารการตรวจนับสต็อกสิ้นเดือน)
CREATE TABLE IF NOT EXISTS stock_count_sessions (
  id TEXT PRIMARY KEY,
  month TEXT NOT NULL,
  count_date TEXT NOT NULL,
  counted_by TEXT NOT NULL,
  total_items_counted INTEGER DEFAULT 0,
  discrepancy_items_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completed',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Table: system_settings (การตั้งค่าระบบส่วนกลางและ LINE Notify)
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) & Allow Public Anonymous Access
ALTER TABLE master_materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on master_materials" ON master_materials;
CREATE POLICY "Allow anon all on master_materials" ON master_materials FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE bom_recipe ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on bom_recipe" ON bom_recipe;
CREATE POLICY "Allow anon all on bom_recipe" ON bom_recipe FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE daily_production ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on daily_production" ON daily_production;
CREATE POLICY "Allow anon all on daily_production" ON daily_production FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on stock_transactions" ON stock_transactions;
CREATE POLICY "Allow anon all on stock_transactions" ON stock_transactions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE monthly_stock_counts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on monthly_stock_counts" ON monthly_stock_counts;
CREATE POLICY "Allow anon all on monthly_stock_counts" ON monthly_stock_counts FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE master_branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on master_branches" ON master_branches;
CREATE POLICY "Allow anon all on master_branches" ON master_branches FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE monthly_production_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on monthly_production_summary" ON monthly_production_summary;
CREATE POLICY "Allow anon all on monthly_production_summary" ON monthly_production_summary FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE monthly_inventory_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on monthly_inventory_summary" ON monthly_inventory_summary;
CREATE POLICY "Allow anon all on monthly_inventory_summary" ON monthly_inventory_summary FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE stock_count_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on stock_count_sessions" ON stock_count_sessions;
CREATE POLICY "Allow anon all on stock_count_sessions" ON stock_count_sessions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on system_settings" ON system_settings;
CREATE POLICY "Allow anon all on system_settings" ON system_settings FOR ALL USING (true) WITH CHECK (true);

-- ใส่ข้อมูลสาขาเริ่มต้น (สามารถเพิ่ม/แก้/ลบ สาขาได้ตามต้องการในเมนูจัดการสาขา)
INSERT INTO master_branches (id, branch_code, branch_name, is_active, note)
VALUES 
  ('br_branch_a', 'BRANCH_A', 'สาขา A', true, 'สาขาเริ่มต้น A'),
  ('br_branch_b', 'BRANCH_B', 'สาขา B', true, 'สาขาเริ่มต้น B')
ON CONFLICT (branch_code) DO NOTHING;
`;

export const MIGRATION_SQL_SCHEMA = `-- ============================================================
-- SQL Migration & Complete Setup: อัปเกรดฐานข้อมูลเดิม + สร้างตารางที่ขาดทั้งหมด (ครบ 10 ตาราง)
-- สามารถนำโค้ดนี้ไปรันใน Supabase SQL Editor ได้ทันที (ปลอดภัย รันซ้ำได้)
-- ============================================================

-- 1. Table: master_materials (ทะเบียนวัตถุดิบ)
CREATE TABLE IF NOT EXISTS master_materials (
  rm_code TEXT PRIMARY KEY,
  rm_name TEXT NOT NULL,
  unit TEXT NOT NULL,
  opening_stock NUMERIC DEFAULT 0,
  safety_stock NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table: bom_recipe (สูตรการผลิตมาตรฐาน BOM)
CREATE TABLE IF NOT EXISTS bom_recipe (
  id TEXT PRIMARY KEY,
  product_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  rm_code TEXT NOT NULL,
  standard_qty NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table: master_branches (ทะเบียนสาขาและจุดกระจายสินค้า)
CREATE TABLE IF NOT EXISTS master_branches (
  id TEXT PRIMARY KEY,
  branch_code TEXT UNIQUE NOT NULL,
  branch_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO master_branches (id, branch_code, branch_name, is_active, note)
VALUES 
  ('br_branch_a', 'BRANCH_A', 'สาขา A', true, 'สาขาเริ่มต้น A'),
  ('br_branch_b', 'BRANCH_B', 'สาขา B', true, 'สาขาเริ่มต้น B')
ON CONFLICT (branch_code) DO NOTHING;

-- 4. Table: daily_production (สร้างตารางใหม่หากยังไม่มี หรืออัปเกรดตารางเดิม)
CREATE TABLE IF NOT EXISTS daily_production (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  product_code TEXT NOT NULL,
  produced_qty NUMERIC DEFAULT 0,
  total_dispatched NUMERIC DEFAULT 0,
  branch_dispatches JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_daily_production_date ON daily_production(date);
CREATE INDEX IF NOT EXISTS idx_daily_production_product ON daily_production(product_code);

-- เพิ่มคอลัมน์ branch_dispatches (JSONB) และ total_dispatched ให้ตารางเดิมหากเคยสร้างไว้แล้ว
ALTER TABLE daily_production ADD COLUMN IF NOT EXISTS branch_dispatches JSONB DEFAULT '{}'::jsonb;
ALTER TABLE daily_production ADD COLUMN IF NOT EXISTS total_dispatched NUMERIC DEFAULT 0;

-- ย้ายข้อมูลเก่าจาก dispatch_branch_a และ dispatch_branch_b เข้าสู่ branch_dispatches JSONB
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'daily_production' AND column_name = 'dispatch_branch_a'
  ) THEN
    UPDATE daily_production 
    SET 
      branch_dispatches = jsonb_build_object(
        'BRANCH_A', COALESCE(dispatch_branch_a, 0),
        'BRANCH_B', COALESCE(dispatch_branch_b, 0)
      ),
      total_dispatched = COALESCE(dispatch_branch_a, 0) + COALESCE(dispatch_branch_b, 0)
    WHERE branch_dispatches IS NULL OR branch_dispatches = '{}'::jsonb;

    -- ลบคอลัมน์ dispatch_branch_a และ dispatch_branch_b ออก
    ALTER TABLE daily_production DROP COLUMN IF EXISTS dispatch_branch_a;
    ALTER TABLE daily_production DROP COLUMN IF EXISTS dispatch_branch_b;
  END IF;
END $$;

-- 5. Table: stock_transactions (ประวัติรับเข้า/เบิกใช้จริง)
CREATE TABLE IF NOT EXISTS stock_transactions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Receive', 'Actual Usage')),
  rm_code TEXT NOT NULL,
  qty NUMERIC DEFAULT 0,
  recorder TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stock_tx_date ON stock_transactions(date);
CREATE INDEX IF NOT EXISTS idx_stock_tx_rm_code ON stock_transactions(rm_code);

-- 6. Table: monthly_stock_counts (ตรวจนับสต็อกจริงสิ้นเดือน)
CREATE TABLE IF NOT EXISTS monthly_stock_counts (
  id TEXT PRIMARY KEY,
  count_date TEXT NOT NULL,
  rm_code TEXT NOT NULL,
  system_stock NUMERIC DEFAULT 0,
  actual_count NUMERIC DEFAULT 0,
  discrepancy NUMERIC DEFAULT 0,
  recorder TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Table: monthly_production_summary (สรุปยอดผลิตแต่ละเมนูแต่ละสาขารายเดือน)
CREATE TABLE IF NOT EXISTS monthly_production_summary (
  id TEXT PRIMARY KEY,
  month TEXT NOT NULL,
  product_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  total_produced_qty NUMERIC DEFAULT 0,
  branch_dispatches JSONB DEFAULT '{}'::jsonb,
  total_dispatched_qty NUMERIC DEFAULT 0,
  days_produced_count INTEGER DEFAULT 0,
  dispatch_percentage NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_monthly_prod_month ON monthly_production_summary(month);

-- 8. Table: monthly_inventory_summary (ผลสรุปคำนวณสต็อกและ Variance ปิดงวดรายเดือน)
CREATE TABLE IF NOT EXISTS monthly_inventory_summary (
  id TEXT PRIMARY KEY,
  month TEXT NOT NULL,
  rm_code TEXT NOT NULL,
  rm_name TEXT NOT NULL,
  unit TEXT NOT NULL,
  opening_stock NUMERIC DEFAULT 0,
  total_receive NUMERIC DEFAULT 0,
  actual_usage NUMERIC DEFAULT 0,
  expected_usage NUMERIC DEFAULT 0,
  ending_stock NUMERIC DEFAULT 0,
  variance NUMERIC DEFAULT 0,
  variance_percentage NUMERIC DEFAULT 0,
  safety_stock NUMERIC DEFAULT 0,
  stock_status TEXT,
  physical_count NUMERIC,
  physical_variance NUMERIC,
  physical_status TEXT,
  closed_at TIMESTAMPTZ DEFAULT NOW(),
  closed_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_monthly_inv_month ON monthly_inventory_summary(month);

-- 9. Table: stock_count_sessions (รอบเอกสารการตรวจนับสิ้นเดือน)
CREATE TABLE IF NOT EXISTS stock_count_sessions (
  id TEXT PRIMARY KEY,
  month TEXT NOT NULL,
  count_date TEXT NOT NULL,
  counted_by TEXT NOT NULL,
  total_items_counted INTEGER DEFAULT 0,
  discrepancy_items_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completed',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Table: system_settings (การตั้งค่าระบบส่วนกลาง)
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. เปิดสิทธิ์ Row Level Security (RLS) สำหรับทั้ง 10 ตาราง
ALTER TABLE master_materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on master_materials" ON master_materials;
CREATE POLICY "Allow anon all on master_materials" ON master_materials FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE bom_recipe ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on bom_recipe" ON bom_recipe;
CREATE POLICY "Allow anon all on bom_recipe" ON bom_recipe FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE master_branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on master_branches" ON master_branches;
CREATE POLICY "Allow anon all on master_branches" ON master_branches FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE daily_production ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on daily_production" ON daily_production;
CREATE POLICY "Allow anon all on daily_production" ON daily_production FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on stock_transactions" ON stock_transactions;
CREATE POLICY "Allow anon all on stock_transactions" ON stock_transactions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE monthly_stock_counts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on monthly_stock_counts" ON monthly_stock_counts;
CREATE POLICY "Allow anon all on monthly_stock_counts" ON monthly_stock_counts FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE monthly_production_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on monthly_production_summary" ON monthly_production_summary;
CREATE POLICY "Allow anon all on monthly_production_summary" ON monthly_production_summary FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE monthly_inventory_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on monthly_inventory_summary" ON monthly_inventory_summary;
CREATE POLICY "Allow anon all on monthly_inventory_summary" ON monthly_inventory_summary FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE stock_count_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on stock_count_sessions" ON stock_count_sessions;
CREATE POLICY "Allow anon all on stock_count_sessions" ON stock_count_sessions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on system_settings" ON system_settings;
CREATE POLICY "Allow anon all on system_settings" ON system_settings FOR ALL USING (true) WITH CHECK (true);
`;

/**
 * Safe helper that wraps a Supabase query with transient network retry
 */
async function withNetworkRetry<T = any[]>(
  queryFn: () => PromiseLike<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
  try {
    let res = await queryFn();
    const isNetworkErr =
      res?.error &&
      (res.error.message?.includes('Failed to fetch') ||
        res.error.details?.includes('Failed to fetch') ||
        res.error.message?.includes('NetworkError') ||
        res.error.code === '');

    if (isNetworkErr) {
      // Retry once after a brief delay
      await new Promise((resolve) => setTimeout(resolve, 350));
      try {
        res = await queryFn();
      } catch (retryCatch: any) {
        return { data: null, error: { message: retryCatch?.message || 'Network error' } };
      }
    }
    return res;
  } catch (err: any) {
    return { data: null, error: { message: err?.message || 'Unexpected network error' } };
  }
}

/**
 * Test Supabase connection and check table availability
 */
export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  tables: Record<string, boolean>;
  error?: string;
}> {
  try {
    const supabase = getSupabaseClient();
    const tables: Record<string, boolean> = {
      master_materials: false,
      bom_recipe: false,
      daily_production: false,
      stock_transactions: false,
      monthly_stock_counts: false,
      master_branches: false,
      monthly_production_summary: false,
      monthly_inventory_summary: false,
      stock_count_sessions: false,
      system_settings: false,
    };

    // Run table checks in parallel
    const [
      matRes,
      bomRes,
      prodRes,
      txRes,
      countRes,
      branchRes,
      prodSumRes,
      invSumRes,
      sessionRes,
      settingRes,
    ] = await Promise.all([
      supabase.from('master_materials').select('rm_code').limit(1),
      supabase.from('bom_recipe').select('id').limit(1),
      supabase.from('daily_production').select('id').limit(1),
      supabase.from('stock_transactions').select('id').limit(1),
      supabase.from('monthly_stock_counts').select('id').limit(1),
      supabase.from('master_branches').select('id').limit(1),
      supabase.from('monthly_production_summary').select('id').limit(1),
      supabase.from('monthly_inventory_summary').select('id').limit(1),
      supabase.from('stock_count_sessions').select('id').limit(1),
      supabase.from('system_settings').select('key').limit(1),
    ]);

    tables.master_materials = !matRes.error;
    tables.bom_recipe = !bomRes.error;
    tables.daily_production = !prodRes.error;
    tables.stock_transactions = !txRes.error;
    tables.monthly_stock_counts = !countRes.error;
    tables.master_branches = !branchRes.error;
    tables.monthly_production_summary = !prodSumRes.error;
    tables.monthly_inventory_summary = !invSumRes.error;
    tables.stock_count_sessions = !sessionRes.error;
    tables.system_settings = !settingRes.error;

    // Check if network is down or completely unreachable
    const allResponses = [
      matRes,
      bomRes,
      prodRes,
      txRes,
      countRes,
      branchRes,
      prodSumRes,
      invSumRes,
      sessionRes,
      settingRes,
    ];
    const isNetworkDown = allResponses.every(
      (r) =>
        r.error &&
        (r.error.message?.includes('Failed to fetch') ||
          r.error.details?.includes('Failed to fetch') ||
          r.error.message?.includes('NetworkError'))
    );

    if (isNetworkDown) {
      return {
        success: false,
        message: 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้ (Network / Offline) ระบบใช้งานข้อมูลในเครื่องให้อัตโนมัติ',
        tables,
        error: 'Network connection unavailable',
      };
    }

    const allOk = Object.values(tables).every(Boolean);
    const coreOk =
      tables.master_materials &&
      tables.bom_recipe &&
      tables.daily_production &&
      tables.stock_transactions &&
      tables.monthly_stock_counts &&
      tables.master_branches;
    const someOk = Object.values(tables).some(Boolean);

    if (allOk) {
      return { success: true, message: 'เชื่อมต่อฐานข้อมูลกลางสำเร็จ พร้อมใช้งานครบทั้ง 10 ตาราง', tables };
    }
    if (coreOk) {
      return {
        success: true,
        message: 'ตารางหลัก 6 ตารางพร้อมใช้งาน (สามารถรัน SQL เพิ่มเติมเพื่อสร้าง 4 ตารางสรุปย้อนหลัง & ตั้งค่าได้)',
        tables,
      };
    }
    if (someOk) {
      return {
        success: true,
        message: 'เชื่อมต่อฐานข้อมูลได้บางส่วน กรุณาตรวจสอบหรือรัน SQL Schema ให้ครบถ้วน',
        tables,
        error: matRes.error?.message || bomRes.error?.message,
      };
    }

    return {
      success: false,
      message: 'เชื่อมต่อได้ แต่ยังไม่พบตารางข้อมูลในระบบ กรุณาคัดลอก SQL Schema ไปรันใน SQL Editor',
      tables,
      error: matRes.error?.message || 'Tables not found',
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้: ' + (err?.message || 'Network error'),
      tables: {
        master_materials: false,
        bom_recipe: false,
        daily_production: false,
        stock_transactions: false,
        monthly_stock_counts: false,
        master_branches: false,
        monthly_production_summary: false,
        monthly_inventory_summary: false,
        stock_count_sessions: false,
        system_settings: false,
      },
      error: err?.message,
    };
  }
}

// -------------------------------------------------------------
// 1. MASTER MATERIALS CRUD
// -------------------------------------------------------------
export async function fetchMasterMaterials(): Promise<MasterMaterial[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await withNetworkRetry<any[]>(() =>
      supabase.from('master_materials').select('*').order('rm_code', { ascending: true })
    );

    if (error) {
      console.warn('Notice: master_materials remote fetch unavailable, using local cache:', error.message || error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.rm_code,
      RM_Code: row.rm_code,
      RM_Name: row.rm_name,
      Unit: row.unit,
      Opening_Stock: Number(row.opening_stock) || 0,
      Safety_Stock: Number(row.safety_stock) || 0,
    }));
  } catch (err: any) {
    console.warn('Notice: Network error fetching master_materials, using local data:', err?.message || err);
    return [];
  }
}

export async function upsertMasterMaterial(mat: MasterMaterial): Promise<void> {
  const supabase = getSupabaseClient();
  const payload = {
    rm_code: mat.RM_Code.trim().toUpperCase(),
    rm_name: mat.RM_Name.trim(),
    unit: mat.Unit.trim(),
    opening_stock: Number(mat.Opening_Stock) || 0,
    safety_stock: Number(mat.Safety_Stock) || 0,
  };

  const { error } = await supabase.from('master_materials').upsert(payload, { onConflict: 'rm_code' });
  if (error) {
    console.error('Error upserting master_materials:', error);
    throw error;
  }
}

export async function deleteMasterMaterial(rm_code: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('master_materials').delete().eq('rm_code', rm_code.trim().toUpperCase());
  if (error) {
    console.error('Error deleting master_materials:', error);
    throw error;
  }
}

export async function updateMaterialOpeningStock(rm_code: string, newOpening: number): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('master_materials')
    .update({ opening_stock: Number(newOpening) || 0 })
    .eq('rm_code', rm_code.trim().toUpperCase());

  if (error) {
    console.error('Error updating material opening stock:', error);
    throw error;
  }
}

// -------------------------------------------------------------
// 2. BOM RECIPE CRUD
// -------------------------------------------------------------
export async function fetchBOMRecipes(): Promise<BOMRecipe[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await withNetworkRetry<any[]>(() =>
      supabase.from('bom_recipe').select('*').order('id', { ascending: true })
    );

    if (error) {
      console.warn('Notice: bom_recipe remote fetch unavailable, using local cache:', error.message || error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: String(row.id),
      Product_Code: row.product_code || row.product_name || '',
      Product_Name: row.product_name || row.product_code || '',
      RM_Code: (row.rm_code || '').trim().toUpperCase(),
      Standard_Qty:
        Number(
          row.quantity_per_unit !== undefined && row.quantity_per_unit !== null
            ? row.quantity_per_unit
            : row.standard_qty
        ) || 0,
    }));
  } catch (err: any) {
    console.warn('Notice: Network error fetching bom_recipe, using local data:', err?.message || err);
    return [];
  }
}

export async function upsertBOMRecipe(recipe: BOMRecipe): Promise<{ id: string | number }> {
  const supabase = getSupabaseClient();
  const pCode = (recipe.Product_Code || '').trim().toUpperCase();
  const pName = (recipe.Product_Name || recipe.Product_Code || '').trim();
  const rmCode = (recipe.RM_Code || '').trim().toUpperCase();
  const qty = Number(recipe.Standard_Qty) || 0;

  if (!rmCode) {
    const err = new Error('ไม่พบรหัสวัตถุดิบ (rm_code)');
    console.error('Validation error: rm_code is required for bom_recipe', err);
    throw err;
  }

  // 1. Verify rm_code exists in master_materials (Foreign Key Constraint check)
  const { data: matCheck, error: matErr } = await supabase
    .from('master_materials')
    .select('rm_code')
    .eq('rm_code', rmCode)
    .maybeSingle();

  if (matErr) {
    console.warn('Note: Could not pre-verify master_materials:', matErr.message);
  } else if (!matCheck) {
    const fkErr = new Error(
      `รหัสวัตถุดิบ "${rmCode}" ไม่มีอยู่ในตาราง master_materials กรุณาเลือกจากวัตถุดิบที่มีอยู่ในระบบ`
    );
    console.error('Foreign Key Validation Error:', fkErr);
    throw fkErr;
  }

  // 2. Check if a record already exists in bom_recipe for this product and raw material
  let existingId: number | string | null = null;

  if (recipe.id && /^\d+$/.test(String(recipe.id))) {
    const { data: byId } = await supabase
      .from('bom_recipe')
      .select('id')
      .eq('id', Number(recipe.id))
      .maybeSingle();
    if (byId?.id) {
      existingId = byId.id;
    }
  }

  if (!existingId) {
    let checkQuery = supabase.from('bom_recipe').select('id').eq('rm_code', rmCode);
    if (pCode) {
      checkQuery = checkQuery.eq('product_code', pCode);
    } else {
      checkQuery = checkQuery.eq('product_name', pName);
    }
    const { data: byKey } = await checkQuery.maybeSingle();
    if (byKey?.id) {
      existingId = byKey.id;
    }
  }

  // 3. Helper to perform insert/update supporting quantity_per_unit or standard_qty
  const tryWithColumn = async (qtyCol: 'quantity_per_unit' | 'standard_qty'): Promise<number | string> => {
    const basePayload: Record<string, any> = {
      product_code: pCode || pName,
      product_name: pName,
      rm_code: rmCode,
      [qtyCol]: qty,
    };

    if (existingId) {
      const { data, error } = await supabase
        .from('bom_recipe')
        .update(basePayload)
        .eq('id', existingId)
        .select('id')
        .single();

      if (error) throw error;
      return data?.id || existingId;
    } else {
      const { data, error } = await supabase
        .from('bom_recipe')
        .insert(basePayload)
        .select('id')
        .single();

      if (error) throw error;
      return data?.id;
    }
  };

  try {
    let savedId: number | string;
    try {
      // First try standard_qty (the existing column in postgres)
      savedId = await tryWithColumn('standard_qty');
    } catch (firstErr: any) {
      // If error indicates standard_qty does not exist or schema uses quantity_per_unit, fallback to quantity_per_unit
      if (
        firstErr?.code === 'PGRST204' ||
        firstErr?.message?.includes('standard_qty') ||
        firstErr?.message?.includes('column')
      ) {
        console.warn('Standard_qty column error, retrying with quantity_per_unit column...', firstErr.message);
        savedId = await tryWithColumn('quantity_per_unit');
      } else {
        throw firstErr;
      }
    }

    return { id: savedId };
  } catch (finalError: any) {
    console.error('❌ Supabase upsertBOMRecipe Error:', {
      error: finalError,
      message: finalError?.message,
      code: finalError?.code,
      product_name: pName,
      rm_code: rmCode,
      quantity: qty,
    });

    if (finalError?.code === '23503' || finalError?.message?.includes('foreign key')) {
      throw new Error(`รหัสวัตถุดิบ "${rmCode}" ไม่พบในตาราง master_materials (Foreign Key Constraint)`);
    }

    throw finalError;
  }
}

export async function deleteBOMRecipe(idOrProductCode: string, rmCode?: string): Promise<void> {
  const supabase = getSupabaseClient();
  let query = supabase.from('bom_recipe').delete();
  if (rmCode) {
    query = query
      .eq('product_code', idOrProductCode.trim().toUpperCase())
      .eq('rm_code', rmCode.trim().toUpperCase());
  } else if (/^\d+$/.test(idOrProductCode)) {
    query = query.eq('id', Number(idOrProductCode));
  } else {
    // If composite id like 'bom_P001_RM001', parse and delete safely
    const parts = idOrProductCode.split('_');
    if (parts.length >= 3 && parts[0] === 'bom') {
      const p = parts[1];
      const rm = parts.slice(2).join('_');
      query = query.eq('product_code', p).eq('rm_code', rm);
    } else {
      query = query.eq('product_code', idOrProductCode.trim().toUpperCase());
    }
  }
  const { error } = await query;
  if (error) {
    console.error('Error deleting bom_recipe:', error);
    throw error;
  }
}

export async function clearSupabaseTable(
  tableName: 'master_materials' | 'bom_recipe' | 'daily_production' | 'stock_transactions' | 'monthly_stock_counts'
): Promise<void> {
  const supabase = getSupabaseClient();
  if (tableName === 'master_materials') {
    await supabase.from(tableName).delete().neq('rm_code', '___NEVER_MATCH___');
  } else {
    // For tables with bigint id, use gt('id', 0) to avoid syntax error 22P02
    await supabase.from(tableName).delete().gt('id', 0);
  }
}

// -------------------------------------------------------------
// 3. DAILY PRODUCTION CRUD
// -------------------------------------------------------------
export async function fetchDailyProductions(): Promise<DailyProduction[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await withNetworkRetry<any[]>(() =>
      supabase.from('daily_production').select('*').order('date', { ascending: false })
    );

    if (error) {
      console.warn('Notice: daily_production remote fetch unavailable, using local cache:', error.message || error);
      return [];
    }

    // Deduplicate rows from Supabase by Date + Product_Code
    const seenMap = new Map<string, any>();
    const duplicateIdsToDelete: any[] = [];

    for (const row of (data || [])) {
      const key = `${row.date}___${String(row.product_code || '').trim().toUpperCase()}`;
      if (!seenMap.has(key)) {
        seenMap.set(key, row);
      } else {
        // Duplicate row found in database! Mark for deletion
        if (row.id) duplicateIdsToDelete.push(row.id);
      }
    }

    if (duplicateIdsToDelete.length > 0) {
      (async () => {
        try {
          await supabase.from('daily_production').delete().in('id', duplicateIdsToDelete);
          console.log(`Cleaned up ${duplicateIdsToDelete.length} duplicate daily_production rows from database`);
        } catch (e) {
          console.warn('Error cleaning up duplicate daily_production rows:', e);
        }
      })();
    }

    return Array.from(seenMap.values()).map((row: any) => {
      const dispA = Number(row.dispatch_branch_a) || 0;
      const dispB = Number(row.dispatch_branch_b) || 0;
      const branchDispatches =
        row.branch_dispatches && typeof row.branch_dispatches === 'object' ? row.branch_dispatches : {};

      let totalDisp = Number(row.total_dispatched);
      if (isNaN(totalDisp) || totalDisp <= 0) {
        if (Object.keys(branchDispatches).length > 0) {
          totalDisp = (Object.values(branchDispatches) as any[]).reduce(
            (s: number, v: any): number => s + (Number(v) || 0),
            0
          );
        } else {
          totalDisp = dispA + dispB;
        }
      }

      return {
        id: String(row.id),
        Date: row.date,
        Product_Code: row.product_code,
        Produced_Qty: Number(row.produced_qty) || 0,
        Dispatch_Branch_A: dispA,
        Dispatch_Branch_B: dispB,
        branch_dispatches: branchDispatches,
        Total_Dispatched: totalDisp,
      };
    });
  } catch (err: any) {
    console.warn('Notice: Network error fetching daily_production, using local data:', err?.message || err);
    return [];
  }
}

export async function saveDailyProduction(prod: DailyProduction): Promise<string> {
  const supabase = getSupabaseClient();
  const date = prod.Date;
  const product_code = prod.Product_Code.trim().toUpperCase();
  const produced_qty = Number(prod.Produced_Qty) || 0;
  const branch_dispatches = { ...(prod.branch_dispatches || {}) };

  // Support legacy fields if present
  if (prod.Dispatch_Branch_A !== undefined && !branch_dispatches['BRANCH_A']) {
    branch_dispatches['BRANCH_A'] = Number(prod.Dispatch_Branch_A) || 0;
  }
  if (prod.Dispatch_Branch_B !== undefined && !branch_dispatches['BRANCH_B']) {
    branch_dispatches['BRANCH_B'] = Number(prod.Dispatch_Branch_B) || 0;
  }

  let total_dispatched = Number(prod.Total_Dispatched);
  if (isNaN(total_dispatched) || total_dispatched <= 0) {
    total_dispatched = Object.values(branch_dispatches).reduce(
      (s: number, v: any) => s + (Number(v) || 0),
      0
    );
  }

  // Modern Dynamic Payload (recommended for clean 10-table schema)
  const modernPayload: Record<string, any> = {
    date,
    product_code,
    produced_qty,
    total_dispatched,
    branch_dispatches,
  };

  // Combined Payload (for tables that contain both dynamic JSONB and legacy columns)
  const combinedPayload: Record<string, any> = {
    ...modernPayload,
    dispatch_branch_a: Number(branch_dispatches['BRANCH_A'] ?? prod.Dispatch_Branch_A) || 0,
    dispatch_branch_b: Number(branch_dispatches['BRANCH_B'] ?? prod.Dispatch_Branch_B) || 0,
  };

  // Legacy Payload (for older schemas with only branch_a and branch_b columns)
  const legacyOnlyPayload: Record<string, any> = {
    date,
    product_code,
    produced_qty,
    dispatch_branch_a: Number(branch_dispatches['BRANCH_A'] ?? prod.Dispatch_Branch_A) || 0,
    dispatch_branch_b: Number(branch_dispatches['BRANCH_B'] ?? prod.Dispatch_Branch_B) || 0,
  };

  let numericId: number | null = null;
  if (prod.id && /^\d+$/.test(String(prod.id))) {
    numericId = Number(prod.id);
  }

  // Check if an existing record matches date & product_code (single production per product per day)
  if (!numericId) {
    const { data: existingRows } = await supabase
      .from('daily_production')
      .select('id')
      .eq('date', date)
      .eq('product_code', product_code);

    if (existingRows && existingRows.length > 0) {
      numericId = Number(existingRows[0].id);
      // If there are duplicate rows in Supabase for this date & product, purge the extras immediately!
      if (existingRows.length > 1) {
        const extraIds = existingRows.slice(1).map((r: any) => r.id);
        await supabase.from('daily_production').delete().in('id', extraIds);
      }
    }
  }

  const trySave = async (payload: Record<string, any>) => {
    if (numericId) {
      const { data, error } = await supabase
        .from('daily_production')
        .update(payload)
        .eq('id', numericId)
        .select('id')
        .single();
      if (error) throw error;
      return String(data?.id || numericId);
    } else {
      const { data, error } = await supabase
        .from('daily_production')
        .insert(payload)
        .select('id')
        .single();
      if (error) throw error;
      return String(data?.id);
    }
  };

  try {
    // 1. First attempt: Modern dynamic payload (clean schema with branch_dispatches JSONB)
    return await trySave(modernPayload);
  } catch (err: any) {
    const msg = String(err?.message || '');
    // If the table lacks branch_dispatches / total_dispatched column, fall back to legacy columns
    if (msg.includes('branch_dispatches') || msg.includes('total_dispatched')) {
      console.warn('daily_production table lacks branch_dispatches, falling back to legacy schema:', msg);
      return await trySave(legacyOnlyPayload);
    }
    // If the table has NOT NULL constraints on legacy columns, retry with combined payload
    try {
      return await trySave(combinedPayload);
    } catch (retryErr: any) {
      console.error('Error saving daily_production in Supabase:', retryErr);
      throw retryErr;
    }
  }
}

export async function deleteDailyProduction(idOrDate: string, productCode?: string): Promise<void> {
  const supabase = getSupabaseClient();
  let query = supabase.from('daily_production').delete();

  if (productCode) {
    query = query.eq('date', idOrDate).eq('product_code', productCode.trim().toUpperCase());
  } else if (/^\d+$/.test(idOrDate)) {
    query = query.eq('id', Number(idOrDate));
  } else {
    const parts = idOrDate.split('_');
    if (parts.length >= 3 && parts[0] === 'prod') {
      const date = parts[1];
      const pCode = parts[2];
      query = query.eq('date', date).eq('product_code', pCode);
    } else {
      query = query.eq('id', idOrDate);
    }
  }

  const { error } = await query;
  if (error) {
    console.error('Error deleting daily_production from Supabase:', error);
    throw error;
  }
}

// -------------------------------------------------------------
// 4. STOCK TRANSACTIONS CRUD
// -------------------------------------------------------------
export async function fetchStockTransactions(): Promise<StockTransaction[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await withNetworkRetry<any[]>(() =>
      supabase.from('stock_transactions').select('*').order('date', { ascending: false })
    );

    if (error) {
      console.warn('Notice: stock_transactions remote fetch unavailable, using local cache:', error.message || error);
      return [];
    }

    // Deduplicate identical transactions from database: date + type + rm_code + qty + note
    const seenMap = new Map<string, any>();
    const duplicateIdsToDelete: any[] = [];

    for (const row of (data || [])) {
      const sig = `${row.date}___${row.type}___${String(row.rm_code || '').trim().toUpperCase()}___${(Number(row.qty) || 0).toFixed(3)}___${String(row.note || '').trim()}`;
      if (!seenMap.has(sig)) {
        seenMap.set(sig, row);
      } else {
        if (row.id) duplicateIdsToDelete.push(row.id);
      }
    }

    if (duplicateIdsToDelete.length > 0) {
      (async () => {
        try {
          await supabase.from('stock_transactions').delete().in('id', duplicateIdsToDelete);
          console.log(`Cleaned up ${duplicateIdsToDelete.length} duplicate stock_transactions rows from database`);
        } catch (e) {
          console.warn('Error cleaning up duplicate stock_transactions rows:', e);
        }
      })();
    }

    return Array.from(seenMap.values()).map((row: any) => ({
      id: String(row.id),
      Date: row.date,
      Type: row.type === 'Actual Usage' ? 'Actual Usage' : 'Receive',
      RM_Code: row.rm_code,
      Qty: Number(row.qty) || 0,
      Recorder: row.recorder || '',
      Note: row.note || '',
    }));
  } catch (err: any) {
    console.warn('Notice: Network error fetching stock_transactions, using local data:', err?.message || err);
    return [];
  }
}

export async function saveStockTransaction(tx: StockTransaction): Promise<string> {
  const supabase = getSupabaseClient();
  const date = tx.Date;
  // Enforce check constraint: type must be 'Receive' or 'Actual Usage'
  const type: 'Receive' | 'Actual Usage' = tx.Type === 'Receive' ? 'Receive' : 'Actual Usage';
  const rm_code = tx.RM_Code.trim().toUpperCase();
  const qty = Number(tx.Qty) || 0;
  const recorder = (tx.Recorder || '').trim();
  const note = (tx.Note || '').trim();

  // Validate Foreign Key against master_materials
  const { data: matCheck, error: matErr } = await supabase
    .from('master_materials')
    .select('rm_code')
    .eq('rm_code', rm_code)
    .maybeSingle();

  if (!matCheck && !matErr) {
    const fkErr = new Error(`รหัสวัตถุดิบ "${rm_code}" ไม่มีอยู่ในตาราง master_materials`);
    console.error('Foreign Key Validation Error:', fkErr);
    throw fkErr;
  }

  const payload: Record<string, any> = {
    date,
    type,
    rm_code,
    qty,
    recorder,
    note,
  };

  let existingId: string | null = null;
  if (tx.id && /^\d+$/.test(String(tx.id))) {
    existingId = String(tx.id);
  } else if (tx.id) {
    const { data: byId } = await supabase
      .from('stock_transactions')
      .select('id')
      .eq('id', tx.id)
      .limit(1);
    if (byId && byId.length > 0) {
      existingId = String(byId[0].id);
    }
  }

  // If no ID match, check if this exact transaction already exists by attributes
  if (!existingId) {
    let checkQuery = supabase
      .from('stock_transactions')
      .select('id')
      .eq('date', date)
      .eq('type', type)
      .eq('rm_code', rm_code)
      .eq('qty', qty);

    if (note) {
      checkQuery = checkQuery.eq('note', note);
    }

    const { data: existingRows } = await checkQuery;
    if (existingRows && existingRows.length > 0) {
      existingId = String(existingRows[0].id);
      // Clean up any extra duplicate rows in database if they were created earlier
      if (existingRows.length > 1) {
        const extraIds = existingRows.slice(1).map((r: any) => r.id);
        await supabase.from('stock_transactions').delete().in('id', extraIds);
      }
    }
  }

  if (existingId) {
    const { data, error } = await supabase
      .from('stock_transactions')
      .update(payload)
      .eq('id', existingId)
      .select('id')
      .single();

    if (error) {
      console.error('Error updating stock_transactions in Supabase:', error);
      throw error;
    }
    return String(data?.id || existingId);
  } else {
    const { data, error } = await supabase
      .from('stock_transactions')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      console.error('Error inserting stock_transactions in Supabase:', error);
      throw error;
    }
    return String(data?.id);
  }
}

export async function deleteStockTransaction(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  let query = supabase.from('stock_transactions').delete();
  if (/^\d+$/.test(id)) {
    query = query.eq('id', Number(id));
  } else {
    query = query.eq('id', id);
  }
  const { error } = await query;
  if (error) {
    console.error('Error deleting stock_transactions from Supabase:', error);
    throw error;
  }
}

/**
 * Remove stock transactions linked to a production batch (auto-deductions)
 */
export async function deleteTransactionsForProduction(
  prodId: string | undefined,
  date: string,
  productCode: string
): Promise<number> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('stock_transactions')
    .select('id, note, recorder, type')
    .eq('date', date)
    .eq('type', 'Actual Usage');

  if (error || !data) return 0;

  const pCode = productCode.trim().toUpperCase();
  const toDeleteIds: number[] = [];

  for (const item of data) {
    const isAuto =
      (item.recorder && (item.recorder.toLowerCase().includes('auto') || item.recorder.includes('อัตโนมัติ'))) ||
      (item.note && (item.note.includes('ตัดสต็อก') || item.note.includes(pCode) || (prodId && item.note.includes(prodId))));

    if (isAuto && item.id) {
      toDeleteIds.push(Number(item.id));
    }
  }

  if (toDeleteIds.length > 0) {
    await supabase.from('stock_transactions').delete().in('id', toDeleteIds);
  }

  return toDeleteIds.length;
}

// -------------------------------------------------------------
// 5. MONTHLY STOCK COUNTS & RECONCILIATION
// -------------------------------------------------------------
export interface MonthlyStockCountRow {
  id: string;
  count_date: string;
  rm_code: string;
  system_stock: number;
  actual_count: number;
  discrepancy: number;
  recorder: string;
  note: string;
}

export async function fetchMonthlyStockCounts(): Promise<MonthlyStockCountRow[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await withNetworkRetry<any[]>(() =>
      supabase.from('monthly_stock_counts').select('*').order('count_date', { ascending: false })
    );

    if (error) {
      console.warn('Notice: monthly_stock_counts remote fetch unavailable, using local cache:', error.message || error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: String(row.id),
      count_date: row.count_date,
      rm_code: row.rm_code,
      system_stock: Number(row.system_stock) || 0,
      actual_count: Number(row.actual_count) || 0,
      discrepancy: Number(row.discrepancy) || 0,
      recorder: row.recorder || '',
      note: row.note || '',
    }));
  } catch (err: any) {
    console.warn('Notice: Network error fetching monthly_stock_counts, using local data:', err?.message || err);
    return [];
  }
}

export async function fetchMonthlyStockCountRecords(): Promise<MonthlyStockCountRecord[]> {
  const rows = await fetchMonthlyStockCounts();
  const groups: Record<string, MonthlyStockCountRecord> = {};

  for (const r of rows) {
    const month = r.count_date ? r.count_date.slice(0, 7) : new Date().toISOString().slice(0, 7);
    const key = `${month}_${r.count_date}`;
    if (!groups[key]) {
      groups[key] = {
        id: `rec_${r.count_date}`,
        Month: month,
        Count_Date: r.count_date,
        Counted_By: r.recorder || 'ผู้ตรวจนับ',
        Note: r.note || '',
        Items: [],
        CreatedAt: r.count_date,
      };
    }
    groups[key].Items.push({
      RM_Code: r.rm_code,
      System_Qty: Number(r.system_stock) || 0,
      Counted_Qty: Number(r.actual_count) || 0,
      Variance: Number(r.discrepancy) || 0,
      Note: r.note,
    });
  }

  return Object.values(groups);
}

/**
 * Reconcile & Close Monthly Stock:
 * 1. Insert records into monthly_stock_counts (excluding id & discrepancy which are generated by PostgreSQL)
 * 2. Update opening_stock in master_materials with actual_count for each RM!
 */
export async function closeMonthlyStockReconciliation(params: {
  countDate: string;
  recorder: string;
  note?: string;
  items: PhysicalStockCountItem[];
}): Promise<void> {
  const supabase = getSupabaseClient();
  const { countDate, recorder, note, items } = params;

  // 1. Prepare monthly_stock_counts rows
  // NOTE: 'id' is a generated bigint identity, and 'discrepancy' is a generated column.
  // We MUST NOT pass 'id' or 'discrepancy' into the insert payload!
  const countRows = items.map((it) => ({
    count_date: countDate,
    rm_code: it.RM_Code.trim().toUpperCase(),
    system_stock: Number(it.System_Qty) || 0,
    actual_count: Number(it.Counted_Qty) || 0,
    recorder: recorder.trim(),
    note: (note ? note + (it.Note ? ` - ${it.Note}` : '') : it.Note || '').trim(),
  }));

  if (countRows.length > 0) {
    // Delete any previous count rows for this exact count_date to ensure idempotency
    await supabase.from('monthly_stock_counts').delete().eq('count_date', countDate);

    const { error: countErr } = await supabase.from('monthly_stock_counts').insert(countRows);
    if (countErr) {
      console.error('Error inserting monthly_stock_counts:', countErr);
      throw countErr;
    }
  }

  // 2. Update master_materials opening_stock with actual_count
  for (const item of items) {
    const rmCode = item.RM_Code.trim().toUpperCase();
    const newOpening = Number(item.Counted_Qty) || 0;
    const { error: updateErr } = await supabase
      .from('master_materials')
      .update({ opening_stock: newOpening })
      .eq('rm_code', rmCode);

    if (updateErr) {
      console.warn(`Failed to update opening_stock for ${rmCode}:`, updateErr);
    }
  }
}

/**
 * Helper to seed initial sample data to Supabase if tables are newly created and empty
 */
export async function seedInitialDataToSupabase(
  materials: MasterMaterial[],
  recipes: BOMRecipe[],
  productions: DailyProduction[],
  transactions: StockTransaction[]
): Promise<{ seeded: boolean; message: string }> {
  const supabase = getSupabaseClient();

  // Check if materials table already has data
  const { data: existingMats } = await supabase.from('master_materials').select('rm_code').limit(1);
  if (existingMats && existingMats.length > 0) {
    return { seeded: false, message: 'ตารางในฐานข้อมูลมีข้อมูลอยู่แล้ว ไม่จำเป็นต้องใส่ข้อมูลตัวอย่าง' };
  }

  try {
    // 1. Insert materials
    const matRows = materials.map((m) => ({
      rm_code: m.RM_Code.trim().toUpperCase(),
      rm_name: m.RM_Name.trim(),
      unit: m.Unit.trim(),
      opening_stock: Number(m.Opening_Stock) || 0,
      safety_stock: Number(m.Safety_Stock) || 0,
    }));
    if (matRows.length > 0) {
      await supabase.from('master_materials').upsert(matRows);
    }

    // 2. Insert BOM recipes
    for (const r of recipes) {
      await upsertBOMRecipe(r).catch((err) => {
        console.warn('seed BOM error for', r.Product_Code, r.RM_Code, err);
      });
    }

    // 3. Insert productions
    const modernProdRows = productions.map((p) => {
      const bDispatches: Record<string, number> = { ...(p.branch_dispatches || {}) };
      if (p.Dispatch_Branch_A !== undefined && !bDispatches['BRANCH_A']) {
        bDispatches['BRANCH_A'] = Number(p.Dispatch_Branch_A) || 0;
      }
      if (p.Dispatch_Branch_B !== undefined && !bDispatches['BRANCH_B']) {
        bDispatches['BRANCH_B'] = Number(p.Dispatch_Branch_B) || 0;
      }
      const total = Number(p.Total_Dispatched) || Object.values(bDispatches).reduce((s: number, v: any) => s + (Number(v) || 0), 0);
      return {
        date: p.Date,
        product_code: p.Product_Code.trim().toUpperCase(),
        produced_qty: Number(p.Produced_Qty) || 0,
        total_dispatched: total,
        branch_dispatches: bDispatches,
      };
    });

    if (modernProdRows.length > 0) {
      const { error: insertErr } = await supabase.from('daily_production').insert(modernProdRows);
      if (insertErr) {
        // Fallback for older database tables that have dispatch_branch_a and dispatch_branch_b
        const legacyRows = productions.map((p) => ({
          date: p.Date,
          product_code: p.Product_Code.trim().toUpperCase(),
          produced_qty: Number(p.Produced_Qty) || 0,
          dispatch_branch_a: Number(p.Dispatch_Branch_A) || 0,
          dispatch_branch_b: Number(p.Dispatch_Branch_B) || 0,
        }));
        await supabase.from('daily_production').insert(legacyRows);
      }
    }

    // 4. Insert transactions
    const txRows = transactions.map((t) => ({
      date: t.Date,
      type: t.Type === 'Receive' ? 'Receive' : 'Actual Usage',
      rm_code: t.RM_Code.trim().toUpperCase(),
      qty: Number(t.Qty) || 0,
      recorder: t.Recorder || '',
      note: t.Note || '',
    }));
    if (txRows.length > 0) {
      await supabase.from('stock_transactions').insert(txRows);
    }

    // 5. Insert initial branches if table exists
    try {
      const { data: existingBranches } = await supabase.from('master_branches').select('branch_code').limit(1);
      if (!existingBranches || existingBranches.length === 0) {
        await supabase.from('master_branches').upsert([
          { branch_code: 'BRANCH_A', branch_name: 'สาขา A', is_active: true, note: 'สาขาเริ่มต้น A' },
          { branch_code: 'BRANCH_B', branch_name: 'สาขา B', is_active: true, note: 'สาขาเริ่มต้น B' },
        ]);
      }
    } catch (branchErr) {
      console.warn('Note: master_branches seeding skipped (table may not exist yet):', branchErr);
    }

    return { seeded: true, message: 'นำเข้าข้อมูลตั้งต้นไปยังฐานข้อมูลสำเร็จเรียบร้อยแล้ว' };
  } catch (err: any) {
    return { seeded: false, message: 'เกิดข้อผิดพลาดในการใส่ข้อมูลตั้งต้น: ' + err.message };
  }
}

/**
 * Fetch all master branches from Supabase
 */
export async function fetchMasterBranches(): Promise<MasterBranch[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('master_branches')
      .select('*')
      .order('branch_code', { ascending: true });

    if (error) {
      // If table does not exist in Supabase yet (PGRST205), return empty array so local fallback handles it
      console.warn('Note: master_branches fetch notice:', error.message);
      return [];
    }

    return (data || []).map((b: any) => ({
      id: String(b.id || b.branch_code),
      branch_code: String(b.branch_code || '').trim().toUpperCase(),
      branch_name: String(b.branch_name || b.branch_code || '').trim(),
      is_active: b.is_active !== false,
      note: b.note || '',
      created_at: b.created_at,
    }));
  } catch (err: any) {
    console.warn('fetchMasterBranches error:', err);
    return [];
  }
}

/**
 * Upsert or Save a master branch in Supabase
 */
export async function saveMasterBranch(branch: MasterBranch): Promise<string> {
  const supabase = getSupabaseClient();
  const code = (branch.branch_code || '').trim().toUpperCase();
  const name = (branch.branch_name || branch.branch_code || '').trim();

  if (!code) {
    throw new Error('กรุณาระบุรหัสสาขา (เช่น BRANCH_A, BRANCH_B, BRANCH_C)');
  }
  if (!name) {
    throw new Error('กรุณาระบุชื่อสาขา (เช่น สาขา A, สาขา สยาม)');
  }

  const payload: Record<string, any> = {
    branch_code: code,
    branch_name: name,
    is_active: branch.is_active !== false,
    note: (branch.note || '').trim(),
    updated_at: new Date().toISOString(),
  };

  // Check if branch exists by branch_code
  const { data: existing, error: checkErr } = await supabase
    .from('master_branches')
    .select('id, branch_code')
    .eq('branch_code', code)
    .maybeSingle();

  if (checkErr) {
    console.error('Check branch error:', checkErr);
    throw checkErr;
  }

  if (existing?.id) {
    const { error: updateErr } = await supabase
      .from('master_branches')
      .update(payload)
      .eq('id', existing.id);
    if (updateErr) throw updateErr;
    return String(existing.id);
  } else {
    const newId = branch.id || `br_${code.toLowerCase()}_${Date.now()}`;
    const insertPayload = { ...payload, id: newId };

    // Try inserting with id first
    const { error: insertErr } = await supabase
      .from('master_branches')
      .insert(insertPayload);

    if (insertErr) {
      // If error is related to generated bigint identity id, try inserting without id
      const { error: retryErr } = await supabase
        .from('master_branches')
        .insert(payload);
      if (retryErr) throw retryErr;
    }
    return newId;
  }
}

/**
 * Delete a master branch from Supabase
 */
export async function deleteMasterBranch(branchCodeOrId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const target = String(branchCodeOrId).trim();

  let query = supabase.from('master_branches').delete();
  if (/^\d+$/.test(target)) {
    query = query.or(`id.eq.${Number(target)},branch_code.eq.${target.toUpperCase()}`);
  } else {
    query = query.or(`id.eq.${target},branch_code.eq.${target.toUpperCase()}`);
  }

  const { error } = await query;
  if (error) {
    console.error('Error deleting branch from cloud database:', error);
    throw error;
  }
  return true;
}

// -------------------------------------------------------------
// 7. Monthly Production Summaries (ผลรวมการผลิตแต่ละเมนูแต่ละสาขาทั้งเดือน)
// -------------------------------------------------------------

/**
 * Fetch monthly production summaries from Supabase
 */
export async function fetchMonthlyProductionSummaries(month?: string): Promise<MonthlyProductionSummary[]> {
  const supabase = getSupabaseClient();
  try {
    let query = supabase.from('monthly_production_summary').select('*');
    if (month && month !== 'all') {
      query = query.eq('month', month);
    }
    const { data, error } = await withNetworkRetry(() => query.order('total_produced_qty', { ascending: false }));
    if (error) {
      // Table may not exist yet if user hasn't run the new schema
      console.warn('fetchMonthlyProductionSummaries notice:', error.message);
      return [];
    }
    return (data || []).map((row: any) => ({
      id: row.id,
      Month: row.month,
      Product_Code: row.product_code,
      Product_Name: row.product_name,
      Total_Produced_Qty: Number(row.total_produced_qty) || 0,
      branch_dispatches: row.branch_dispatches || {},
      Total_Dispatched_Qty: Number(row.total_dispatched_qty) || 0,
      Days_Produced_Count: Number(row.days_produced_count) || 0,
      Dispatch_Percentage: Number(row.dispatch_percentage) || 0,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  } catch (err: any) {
    console.warn('fetchMonthlyProductionSummaries error:', err);
    return [];
  }
}

/**
 * Save / Upsert monthly production summaries for a month
 */
export async function saveMonthlyProductionSummaries(
  month: string,
  items: MonthlyProductionSummary[]
): Promise<boolean> {
  const supabase = getSupabaseClient();
  try {
    if (!month || !Array.isArray(items) || items.length === 0) return true;

    const rows = items.map((it) => ({
      id: it.id || `${month}_${it.Product_Code}`,
      month: month,
      product_code: it.Product_Code,
      product_name: it.Product_Name,
      total_produced_qty: it.Total_Produced_Qty,
      branch_dispatches: it.branch_dispatches || {},
      total_dispatched_qty: it.Total_Dispatched_Qty,
      days_produced_count: it.Days_Produced_Count,
      dispatch_percentage: it.Dispatch_Percentage || 0,
      updated_at: new Date().toISOString(),
    }));

    // Delete existing records for that month to cleanly replace with new batch
    await supabase.from('monthly_production_summary').delete().eq('month', month);

    // Insert new batch
    const { error: insertErr } = await supabase.from('monthly_production_summary').insert(rows);
    if (insertErr) {
      console.error('saveMonthlyProductionSummaries insert error:', insertErr);
      throw insertErr;
    }
    return true;
  } catch (err: any) {
    console.error('saveMonthlyProductionSummaries error:', err);
    throw err;
  }
}

// -------------------------------------------------------------
// 8. Monthly Inventory Closing Snapshot (สรุปสต็อกและ Variance ปิดงวดรายเดือน)
// -------------------------------------------------------------

/**
 * Fetch monthly inventory snapshots
 */
export async function fetchMonthlyInventorySummaries(month?: string): Promise<MonthlyInventorySnapshot[]> {
  const supabase = getSupabaseClient();
  try {
    let query = supabase.from('monthly_inventory_summary').select('*');
    if (month && month !== 'all') {
      query = query.eq('month', month);
    }
    const { data, error } = await withNetworkRetry(() => query.order('rm_code', { ascending: true }));
    if (error) {
      console.warn('fetchMonthlyInventorySummaries notice:', error.message);
      return [];
    }
    return (data || []).map((r: any) => ({
      id: r.id,
      Month: r.month,
      RM_Code: r.rm_code,
      RM_Name: r.rm_name,
      Unit: r.unit,
      Opening_Stock: Number(r.opening_stock) || 0,
      Total_Receive: Number(r.total_receive) || 0,
      Actual_Usage: Number(r.actual_usage) || 0,
      Expected_Usage: Number(r.expected_usage) || 0,
      Ending_Stock: Number(r.ending_stock) || 0,
      Variance: Number(r.variance) || 0,
      Variance_Percentage: Number(r.variance_percentage) || 0,
      Safety_Stock: Number(r.safety_stock) || 0,
      Stock_Status: r.stock_status,
      Physical_Count: r.physical_count !== null ? Number(r.physical_count) : undefined,
      Physical_Variance: r.physical_variance !== null ? Number(r.physical_variance) : undefined,
      Physical_Status: r.physical_status,
      closed_at: r.closed_at,
      closed_by: r.closed_by,
    }));
  } catch (err: any) {
    console.warn('fetchMonthlyInventorySummaries error:', err);
    return [];
  }
}

/**
 * Save monthly inventory closing snapshot to Supabase
 */
export async function saveMonthlyInventorySummaries(
  month: string,
  items: MonthlyStockSummary[],
  closedBy: string = 'เจ้าหน้าที่คลัง'
): Promise<boolean> {
  const supabase = getSupabaseClient();
  try {
    if (!month || !Array.isArray(items) || items.length === 0) return true;

    const rows = items.map((it) => ({
      id: `inv_${month}_${it.RM_Code}`,
      month: month,
      rm_code: it.RM_Code,
      rm_name: it.RM_Name,
      unit: it.Unit,
      opening_stock: it.Opening_Stock,
      total_receive: it.Total_Receive,
      actual_usage: it.Actual_Usage,
      expected_usage: it.Expected_Usage,
      ending_stock: it.Ending_Stock,
      variance: it.Variance,
      variance_percentage: it.variancePercentage || 0,
      safety_stock: it.Safety_Stock,
      stock_status: it.Stock_Status,
      physical_count: it.Physical_Count !== undefined ? it.Physical_Count : null,
      physical_variance: it.Physical_Variance !== undefined ? it.Physical_Variance : null,
      physical_status: it.Physical_Status || null,
      closed_at: new Date().toISOString(),
      closed_by: closedBy,
    }));

    // Delete existing snapshot for this month to prevent duplication
    await supabase.from('monthly_inventory_summary').delete().eq('month', month);

    const { error: insertErr } = await supabase.from('monthly_inventory_summary').insert(rows);
    if (insertErr) {
      console.error('saveMonthlyInventorySummaries insert error:', insertErr);
      throw insertErr;
    }
    return true;
  } catch (err: any) {
    console.error('saveMonthlyInventorySummaries error:', err);
    throw err;
  }
}

// -------------------------------------------------------------
// 9. Stock Count Sessions (รอบเอกสารการตรวจนับสต็อกสิ้นเดือน)
// -------------------------------------------------------------

/**
 * Fetch stock count session headers
 */
export async function fetchStockCountSessions(): Promise<StockCountSessionHeader[]> {
  const supabase = getSupabaseClient();
  try {
    const { data, error } = await withNetworkRetry(() =>
      supabase.from('stock_count_sessions').select('*').order('count_date', { ascending: false })
    );
    if (error) {
      console.warn('fetchStockCountSessions notice:', error.message);
      return [];
    }
    return (data || []).map((r: any) => ({
      id: r.id,
      Month: r.month,
      Count_Date: r.count_date,
      Counted_By: r.counted_by,
      Total_Items_Counted: Number(r.total_items_counted) || 0,
      Discrepancy_Items_Count: Number(r.discrepancy_items_count) || 0,
      Status: r.status || 'completed',
      Note: r.note,
      created_at: r.created_at,
    }));
  } catch (err: any) {
    console.warn('fetchStockCountSessions error:', err);
    return [];
  }
}

/**
 * Save or update a stock count session header
 */
export async function saveStockCountSession(session: StockCountSessionHeader): Promise<boolean> {
  const supabase = getSupabaseClient();
  try {
    const payload = {
      id: session.id,
      month: session.Month,
      count_date: session.Count_Date,
      counted_by: session.Counted_By,
      total_items_counted: session.Total_Items_Counted,
      discrepancy_items_count: session.Discrepancy_Items_Count,
      status: session.Status,
      note: session.Note || '',
    };

    const { error } = await supabase.from('stock_count_sessions').upsert(payload);
    if (error) {
      console.error('saveStockCountSession error:', error);
      throw error;
    }
    return true;
  } catch (err: any) {
    console.error('saveStockCountSession error:', err);
    throw err;
  }
}

// -------------------------------------------------------------
// 10. System Settings (การตั้งค่าระบบส่วนกลาง)
// -------------------------------------------------------------

/**
 * Fetch system settings as key-value map
 */
export async function fetchSystemSettings(): Promise<Record<string, string>> {
  const supabase = getSupabaseClient();
  try {
    const { data, error } = await withNetworkRetry(() => supabase.from('system_settings').select('*'));
    if (error) {
      console.warn('fetchSystemSettings notice:', error.message);
      return {};
    }
    const map: Record<string, string> = {};
    (data || []).forEach((row: any) => {
      if (row.key) map[row.key] = row.value || '';
    });
    return map;
  } catch (err: any) {
    console.warn('fetchSystemSettings error:', err);
    return {};
  }
}

/**
 * Save a system setting key-value
 */
export async function saveSystemSetting(key: string, value: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  try {
    const { error } = await supabase.from('system_settings').upsert({
      key,
      value,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.error('saveSystemSetting error:', error);
      throw error;
    }
    return true;
  } catch (err: any) {
    console.error('saveSystemSetting error:', err);
    throw err;
  }
}

