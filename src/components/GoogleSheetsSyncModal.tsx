import React, { useState } from 'react';
import {
  FileSpreadsheet,
  PlusCircle,
  Link as LinkIcon,
  CheckCircle2,
  ExternalLink,
  UploadCloud,
  Unlink,
  X,
  Sparkles,
  AlertCircle,
  ShieldCheck,
  Code2,
  Copy,
  Check,
  Zap,
  HelpCircle,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { GOOGLE_APPS_SCRIPT_CODE } from '../services/googleSheets';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  webhookUrl: string | null;
  autoSyncEnabled: boolean;
  onToggleAutoSync: (enabled: boolean) => void;
  isSyncing: boolean;
  onSaveWebhookUrl: (url: string) => Promise<void>;
  onSignIn: () => void;
  onCreateNewSheet: () => Promise<void>;
  onLinkExistingSheet: (sheetId: string) => Promise<void>;
  onPushAllToSheet: () => Promise<void>;
  onDisconnectSheet: () => void;
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  user,
  spreadsheetId,
  spreadsheetUrl,
  webhookUrl,
  autoSyncEnabled,
  onToggleAutoSync,
  isSyncing,
  onSaveWebhookUrl,
  onSignIn,
  onCreateNewSheet,
  onLinkExistingSheet,
  onPushAllToSheet,
  onDisconnectSheet,
}) => {
  const [activeTab, setActiveTab] = useState<'webhook' | 'oauth'>('webhook');
  const [webhookInput, setWebhookInput] = useState(webhookUrl || '');
  const [existingIdInput, setExistingIdInput] = useState('');
  const [activeOAuthMode, setActiveOAuthMode] = useState<'create' | 'link'>('create');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showScriptCode, setShowScriptCode] = useState(false);

  if (!isOpen) return null;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWebhookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!webhookInput.trim()) {
      setErrorMsg('กรุณาระบุ URL ของ Google Apps Script Web App');
      return;
    }
    try {
      await onSaveWebhookUrl(webhookInput.trim());
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'บันทึก Webhook ไม่สำเร็จ');
    }
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!existingIdInput.trim()) return;

    let parsedId = existingIdInput.trim();
    const urlMatch = parsedId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch && urlMatch[1]) {
      parsedId = urlMatch[1];
    }

    try {
      await onLinkExistingSheet(parsedId);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'ไม่สามารถเชื่อมต่อ Sheet นี้ได้');
    }
  };

  const handleCreateSubmit = async () => {
    setErrorMsg(null);
    try {
      await onCreateNewSheet();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการสร้าง Sheet');
    }
  };

  const isConnected = !!(webhookUrl || spreadsheetId);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative border border-slate-200 max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-700/20">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                เชื่อมต่อและซิงค์ข้อมูลเข้า Google Sheets อัตโนมัติ
              </h2>
              {isConnected && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  เชื่อมต่อแล้ว
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              ทั้งพนักงาน (Staff) และแอดมิน (Admin) กรอกหรือแก้ไขข้อมูล ระบบจะอัปเดตเข้า Google Sheet ทันที
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Connection Status Card if already connected */}
        {isConnected && (
          <div className="mb-5 p-4 bg-emerald-50/90 border border-emerald-300 rounded-2xl space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-emerald-950">
                      ระบบซิงค์ Google Sheets พร้อมทำงาน
                    </h4>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-200 text-emerald-900 text-[10px] font-bold">
                      {webhookUrl ? 'Apps Script Webhook' : 'Google OAuth'}
                    </span>
                  </div>
                  {webhookUrl && (
                    <p className="text-[11px] font-mono text-emerald-800 break-all line-clamp-1">
                      Webhook: {webhookUrl}
                    </p>
                  )}
                  {spreadsheetId && (
                    <p className="text-[11px] font-mono text-emerald-800 break-all">
                      Sheet ID: {spreadsheetId}
                    </p>
                  )}
                  {spreadsheetUrl && (
                    <a
                      href={spreadsheetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-emerald-800 font-bold hover:underline bg-white px-2.5 py-1 rounded-lg border border-emerald-300 shadow-xs mt-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>เปิดดูไฟล์บน Google Sheets</span>
                    </a>
                  )}
                </div>
              </div>

              <button
                onClick={onDisconnectSheet}
                title="ยกเลิกการเชื่อมต่อ"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
              >
                <Unlink className="w-4 h-4" />
              </button>
            </div>

            {/* Auto-Sync Toggle */}
            <div className="pt-2 border-t border-emerald-200/80 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-emerald-900">
                <input
                  type="checkbox"
                  checked={autoSyncEnabled}
                  onChange={(e) => onToggleAutoSync(e.target.checked)}
                  className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  เปิดการซิงค์อัตโนมัติทุกครั้งที่บันทึกข้อมูล (Real-time Auto-Sync)
                </span>
              </label>

              <button
                onClick={onPushAllToSheet}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-colors"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{isSyncing ? 'กำลังส่งข้อมูล...' : 'ส่งข้อมูลขึ้นชีททันที'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('webhook')}
            className={`flex-1 py-2 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'webhook'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'hover:text-slate-900'
            }`}
          >
            <Zap className="w-4 h-4 text-emerald-600" />
            <span>วิธีที่ 1: Google Apps Script Webhook (แนะนำที่สุด ไม่ต้องล็อกอิน)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('oauth')}
            className={`flex-1 py-2 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'oauth'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <span>วิธีที่ 2: ล็อกอินด้วย Google Account (OAuth)</span>
          </button>
        </div>

        {/* TAB 1: WEBHOOK (ZERO-LOGIN AUTO-SYNC) */}
        {activeTab === 'webhook' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>วิธีตั้งค่าเชื่อมต่อแบบอัตโนมัติ (ทำเพียงครั้งเดียว):</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'คัดลอกโค้ดสำเร็จแล้ว!' : 'คัดลอกโค้ด Apps Script'}</span>
                </button>
              </div>

              {/* Step by step */}
              <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside pl-1 bg-white p-3.5 rounded-xl border border-slate-200">
                <li>
                  เปิดไฟล์ <b>Google Sheet</b> ของคุณ (หรือสร้างชีทเปล่าใหม่)
                </li>
                <li>
                  ไปที่เมนูบนสุด: <b>ส่วนขยาย (Extensions) &gt; Apps Script</b>
                </li>
                <li>
                  ลบโค้ดเดิมทั้งหมดออก แล้ว<b>กดวางโค้ด</b>ที่คัดลอกจากปุ่มด้านบน &gt; กด <b>บันทึก (รูปแผ่นดิสก์ 💾)</b>
                </li>
                <li>
                  กดปุ่มสีฟ้าด้านขวาบน <b>ทำให้ใช้งานได้ (Deploy) &gt; การทำให้ใช้งานได้ใหม่ (New deployment)</b>
                </li>
                <li>
                  เลือกประเภทเป็น <b>เว็บแอป (Web App)</b>, ตั้งค่าช่อง "ผู้มีสิทธิ์เข้าถึง (Who has access)" เป็น <b>ทุกคน (Anyone)</b> แล้วกด Deploy
                </li>
                <li>
                  คัดลอก <b>URL เว็บแอป (Web App URL)</b> ที่ได้ มาวางในช่องด้านล่างนี้แล้วกดบันทึก
                </li>
              </ol>

              {/* Toggle View Script */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowScriptCode(!showScriptCode)}
                  className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1 underline"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>{showScriptCode ? 'ซ่อนดูโค้ด Apps Script' : 'คลิกเพื่อดูเนื้อหาโค้ด Apps Script'}</span>
                </button>
                {showScriptCode && (
                  <pre className="mt-2 p-3 bg-slate-900 text-emerald-400 text-[10px] rounded-xl font-mono overflow-x-auto max-h-48">
                    {GOOGLE_APPS_SCRIPT_CODE}
                  </pre>
                )}
              </div>
            </div>

            {/* Input Webhook Form */}
            <form onSubmit={handleWebhookSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  วาง Web App URL ของ Google Apps Script:
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    required
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    value={webhookInput}
                    onChange={(e) => setWebhookInput(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={isSyncing}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors whitespace-nowrap"
                  >
                    {isSyncing ? 'กำลังบันทึก...' : 'บันทึก & ซิงค์ทันที'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  เมื่อบันทึกแล้ว ข้อมูลการผลิต บันทึกสต็อก และสูตรจะอัปเดตเข้า Google Sheet อัตโนมัติทุกครั้งโดยไม่ต้องล็อกอิน
                </p>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: OAUTH (GOOGLE ACCOUNT) */}
        {activeTab === 'oauth' && (
          <div className="space-y-4">
            {!user ? (
              <div className="text-center py-6 space-y-4 bg-slate-50 rounded-2xl border border-slate-200 p-6">
                <div className="text-sm text-slate-700 font-medium">
                  เข้าสู่ระบบด้วยบัญชี Google เพื่ออนุญาตให้ระบบสร้างหรือเข้าถึง Google Spreadsheet ในไดรฟ์ของคุณ
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={onSignIn}
                    id="btn-oauth-signin"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-md text-xs transition-all"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.02 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    <span>เข้าสู่ระบบด้วย Google</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.open(window.location.href, '_blank', 'noopener,noreferrer')}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs transition-colors shadow-xs"
                    title="หากหน้าต่างล็อกอินไม่เด้งขึ้นมา ให้กดเปิดในแท็บใหม่"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>เปิดในแท็บใหม่ (ถ้าป๊อปอัปถูกบล็อก)</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-500">
                  💡 หากหน้าต่างล็อกอินไม่ขึ้น หรือมีข้อผิดพลาดเรื่องการยืนยันตัวตน ให้ใช้วิธีที่ 1 (Apps Script Webhook) ซึ่งสะดวกและเร็วกว่า
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-semibold text-slate-600">
                  <button
                    type="button"
                    onClick={() => setActiveOAuthMode('create')}
                    className={`flex-1 py-1.5 rounded-md text-center transition-colors ${
                      activeOAuthMode === 'create' ? 'bg-white text-slate-900 shadow-xs' : ''
                    }`}
                  >
                    1. สร้าง Google Sheet ใหม่ใน Drive ของคุณ
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveOAuthMode('link')}
                    className={`flex-1 py-1.5 rounded-md text-center transition-colors ${
                      activeOAuthMode === 'link' ? 'bg-white text-slate-900 shadow-xs' : ''
                    }`}
                  >
                    2. ผูกกับ Sheet เดิมที่มีอยู่
                  </button>
                </div>

                {activeOAuthMode === 'create' ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>สร้างไฟล์ใหม่และส่งข้อมูลบนหน้าจอขึ้นไปทันที</span>
                    </div>
                    <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                      <li>สร้าง 5 แท็บ: Master_Materials, BOM_Recipe, Daily_Production, Stock_Transactions, Monthly_Stock_Summary</li>
                      <li>ใส่สูตรคำนวณ Variance, ยอดตัดสต็อก, และสถานะอัตโนมัติ</li>
                    </ul>

                    <button
                      type="button"
                      onClick={handleCreateSubmit}
                      disabled={isSyncing}
                      className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>{isSyncing ? 'กำลังสร้าง Google Sheet...' : '✨ สร้าง Google Sheet ใหม่ในไดรฟ์'}</span>
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleLinkSubmit} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Google Spreadsheet URL หรือ Sheet ID
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        value={existingIdInput}
                        onChange={(e) => setExistingIdInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSyncing}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors"
                    >
                      <LinkIcon className="w-4 h-4" />
                      <span>เชื่อมต่อและส่งข้อมูลขึ้น Sheet นี้</span>
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
