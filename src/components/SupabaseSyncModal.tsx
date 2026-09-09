import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Server,
  Table,
  UploadCloud,
  X,
  Lock,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  getSupabaseConfig,
  setSupabaseConfig,
  testSupabaseConnection,
  SUPABASE_SQL_SCHEMA,
  seedInitialDataToSupabase,
} from '../services/supabase';
import {
  MasterMaterial,
  BOMRecipe,
  DailyProduction,
  StockTransaction,
} from '../types/stock';

interface SupabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData: () => Promise<void>;
  onShowNotification: (msg: string) => void;
  materials: MasterMaterial[];
  recipes: BOMRecipe[];
  productions: DailyProduction[];
  transactions: StockTransaction[];
}

export const SupabaseSyncModal: React.FC<SupabaseSyncModalProps> = ({
  isOpen,
  onClose,
  onRefreshData,
  onShowNotification,
  materials,
  recipes,
  productions,
  transactions,
}) => {
  const [url, setUrl] = useState<string>('');
  const [anonKey, setAnonKey] = useState<string>('');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    tables: Record<string, boolean>;
    error?: string;
  } | null>(null);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [showSql, setShowSql] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const cfg = getSupabaseConfig();
      setUrl(cfg.url);
      setAnonKey(cfg.anonKey);
      runTest();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const runTest = async () => {
    setIsTesting(true);
    try {
      const res = await testSupabaseConnection();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message,
        tables: {},
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = async () => {
    setSupabaseConfig(url, anonKey);
    onShowNotification('💾 บันทึกการตั้งค่าการเชื่อมต่อฐานข้อมูลแล้ว');
    await runTest();
    await onRefreshData();
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
    onShowNotification('📋 คัดลอก SQL Schema สำหรับสร้างตารางเรียบร้อยแล้ว');
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const res = await seedInitialDataToSupabase(materials, recipes, productions, transactions);
      onShowNotification(res.message);
      if (res.seeded) {
        await onRefreshData();
      }
    } catch (err: any) {
      onShowNotification('❌ เกิดข้อผิดพลาดในการใส่ข้อมูล: ' + err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-400/30">
              <Database className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg leading-tight">การเชื่อมต่อฐานข้อมูลกลาง (Cloud Database)</h3>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 rounded-full">
                  Central Database
                </span>
              </div>
              <p className="text-xs text-slate-300">
                ระบบจัดการฐานข้อมูลหลักสำหรับจัดเก็บและซิงค์ข้อมูลสต๊อกทั้งหมดแบบเรียลไทม์
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Status banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3.5 ${
              testResult?.success
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                : 'bg-amber-50/80 border-amber-200 text-amber-950'
            }`}
          >
            {testResult?.success ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm">
                  {testResult ? testResult.message : 'กำลังตรวจสอบการเชื่อมต่อฐานข้อมูล...'}
                </h4>
                <button
                  type="button"
                  onClick={runTest}
                  disabled={isTesting}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-white/70 px-2 py-1 rounded-md border border-emerald-200 hover:bg-white transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  ทดสอบใหม่
                </button>
              </div>

              {testResult?.error && (
                <p className="text-xs mt-1 text-rose-700 font-mono bg-rose-50 p-2 rounded border border-rose-200">
                  {testResult.error}
                </p>
              )}
            </div>
          </div>

          {/* Database Tables Checklist */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <Table className="w-4 h-4 text-emerald-600" />
              สถานะตารางข้อมูลในระบบฐานข้อมูล (ทั้ง 5 ตาราง)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {[
                { name: 'master_materials', desc: 'ทะเบียนวัตถุดิบ & สต็อก' },
                { name: 'bom_recipe', desc: 'สูตรการผลิตมาตรฐาน (BOM)' },
                { name: 'daily_production', desc: 'ยอดผลิตประจำวันและจัดส่ง' },
                { name: 'stock_transactions', desc: 'ประวัติรับเข้า/เบิกใช้จริง' },
                { name: 'monthly_stock_counts', desc: 'ตรวจนับจริงสิ้นเดือน & ปิดงวด' },
              ].map((tbl) => {
                const isReady = testResult?.tables?.[tbl.name];
                return (
                  <div
                    key={tbl.name}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                      isReady ? 'bg-emerald-50/50 border-emerald-200 text-slate-800' : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    <div>
                      <p className="font-mono font-bold text-slate-900">{tbl.name}</p>
                      <p className="text-[11px] text-slate-500">{tbl.desc}</p>
                    </div>
                    {isReady ? (
                      <span className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full text-[10px]">
                        <Check className="w-3 h-3" /> พร้อมใช้
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded">
                        รอสร้าง
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Connection Settings */}
          <div className="space-y-3 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Server className="w-4 h-4 text-slate-600" />
              การตั้งค่า URL และ Access Key
            </h4>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Database Endpoint / Service URL
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-project-id.cloud-database.co"
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                * ระบุ URL จุดเชื่อมต่อบริการฐานข้อมูลสำหรับสื่อสารและจัดเก็บข้อมูล
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Database Access Token / API Key
              </label>
              <input
                type="text"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="db_access_key_..."
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleSaveConfig}
                className="px-4 py-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors"
              >
                บันทึกการตั้งค่า & เชื่อมต่อใหม่
              </button>
            </div>
          </div>

          {/* SQL Setup Helper Section */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-100 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">
                  SQL Schema สำหรับสร้างตารางในฐานข้อมูล
                </span>
                <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  SQL
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSql(!showSql)}
                  className="text-xs text-slate-600 hover:text-slate-800 font-medium"
                >
                  {showSql ? 'ย่อโค้ด SQL' : 'ดูโค้ด SQL'}
                </button>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSql ? 'คัดลอกแล้ว' : 'คัดลอก SQL'}
                </button>
              </div>
            </div>

            {showSql && (
              <div className="p-3 bg-slate-900 max-h-56 overflow-y-auto font-mono text-[11px] text-emerald-400 whitespace-pre-wrap leading-relaxed">
                {SUPABASE_SQL_SCHEMA}
              </div>
            )}
            <div className="p-3 bg-slate-50 text-xs text-slate-600 flex items-center justify-between">
              <span>
                นำโค้ด SQL ด้านบนไปวางที่ <strong>SQL Console / Query Editor</strong> ของฐานข้อมูล แล้วกด Run ครั้งเดียว
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={handleSeedData}
            disabled={isSeeding}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <UploadCloud className="w-3.5 h-3.5 text-emerald-600" />
            {isSeeding ? 'กำลังนำเข้าข้อมูล...' : 'ใส่ข้อมูลตัวอย่างไปยังฐานข้อมูล (Seed Initial)'}
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
            >
              ปิดหน้าต่าง
            </button>
            <button
              type="button"
              onClick={async () => {
                await onRefreshData();
                onClose();
              }}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              ซิงค์ข้อมูลเดี๋ยวนี้
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
