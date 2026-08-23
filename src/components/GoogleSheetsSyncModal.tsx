import React, { useState } from 'react';
import {
  FileSpreadsheet,
  PlusCircle,
  Link,
  CheckCircle2,
  ExternalLink,
  UploadCloud,
  Unlink,
  X,
  Sparkles,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { User } from 'firebase/auth';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  isSyncing: boolean;
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
  isSyncing,
  onSignIn,
  onCreateNewSheet,
  onLinkExistingSheet,
  onPushAllToSheet,
  onDisconnectSheet,
}) => {
  const [existingIdInput, setExistingIdInput] = useState('');
  const [activeMode, setActiveMode] = useState<'create' | 'link'>('create');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!existingIdInput.trim()) return;

    // Extract ID from URL if user pasted full URL
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

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-slate-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              เชื่อมต่อ Google Sheets & Google Drive
            </h2>
            <p className="text-xs text-slate-500">
              ระบบส่งข้อมูลทางเดียว (Web ➔ Google Sheet) ปลอดภัย ข้อมูลบนเว็บไม่ถูกลบทับแน่นอน
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Security / Safety Banner */}
        <div className="mb-4 p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">ระบบส่งข้อมูลแบบทางเดียว (One-Way Export):</span>
            <p className="text-[11px] text-emerald-800 mt-0.5">
              คุณสามารถกรอกข้อมูลบนเว็บได้อย่างสบายใจ ทุกรายการจะถูกส่งไปเก็บสำรองไว้ใน Google Sheet ของคุณ และจะไม่มีการดึงข้อมูลภายนอกมาเขียนทับข้อมูลในเว็บ
            </p>
          </div>
        </div>

        {!user ? (
          <div className="text-center py-5 space-y-3.5">
            <div className="text-sm text-slate-700">
              กรุณาเข้าสู่ระบบด้วยบัญชี Google เพื่อสร้างหรือเชื่อมต่อไฟล์ Google Sheet ใน Drive ของคุณ
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                onClick={onSignIn}
                id="btn-modal-google-signin"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-slate-900 text-white hover:bg-slate-800 shadow-sm text-sm transition-all"
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
                <span>เข้าสู่ระบบ Google</span>
              </button>

              <button
                type="button"
                onClick={() => window.open(window.location.href, '_blank', 'noopener,noreferrer')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs transition-colors"
                title="หากหน้าต่างล็อกอินไม่เด้งขึ้นมา ให้กดเปิดในแท็บใหม่"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>เปิดในแท็บใหม่ (ถ้าป๊อปอัปถูกบล็อก)</span>
              </button>
            </div>
            
            <p className="text-[11px] text-slate-400">
              💡 หมายเหตุ: หากกดแล้วไม่มีหน้าต่างเด้งขึ้นมา แสดงว่าเบราว์เซอร์บล็อกป๊อปอัป ให้กดเปิดในแท็บใหม่
            </p>
          </div>
        ) : spreadsheetId ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50/90 border border-emerald-300 rounded-xl flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-emerald-950">กำลังเชื่อมต่อกับ Google Sheet</h4>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-bold">
                      พร้อมใช้งาน
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-emerald-800 break-all mt-1">
                    ID: {spreadsheetId}
                  </p>
                  {spreadsheetUrl && (
                    <a
                      href={spreadsheetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-bold hover:underline mt-2 bg-white px-2.5 py-1 rounded-lg border border-emerald-300 shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>เปิดดูไฟล์บน Google Sheets</span>
                    </a>
                  )}
                </div>
              </div>
              <button
                onClick={onDisconnectSheet}
                title="ยกเลิกการเชื่อมต่อกับชีทนี้"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <Unlink className="w-4 h-4" />
              </button>
            </div>

            {/* Single Clear Push Action */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-bold text-slate-900">
                  ส่งข้อมูลทั้งหมดจากเว็บขึ้น Google Sheet (One-Way Push)
                </span>
              </div>
              <p className="text-xs text-slate-600">
                ระบบจะนำรายการวัตถุดิบ (Master), สูตร (BOM), ประวัติการผลิต, รายการรับเข้า/เบิกใช้ และสรุปยอดคงเหลือส่งไปอัปเดตลง Google Sheets ใน Google Drive ทันที
              </p>
              <button
                onClick={onPushAllToSheet}
                disabled={isSyncing}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/20 transition-all hover:scale-[1.01]"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{isSyncing ? 'กำลังส่งข้อมูลขึ้น Google Sheet...' : '🚀 อัปเดตข้อมูลขึ้น Google Sheet ทันที'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-medium text-slate-600">
              <button
                onClick={() => setActiveMode('create')}
                className={`flex-1 py-1.5 rounded-md text-center transition-colors ${
                  activeMode === 'create' ? 'bg-white text-slate-900 shadow-xs font-semibold' : ''
                }`}
              >
                1. สร้าง Sheet ใหม่ใน Drive ของคุณ
              </button>
              <button
                onClick={() => setActiveMode('link')}
                className={`flex-1 py-1.5 rounded-md text-center transition-colors ${
                  activeMode === 'link' ? 'bg-white text-slate-900 shadow-xs font-semibold' : ''
                }`}
              >
                2. ผูกกับ Sheet เดิมที่มีอยู่
              </button>
            </div>

            {activeMode === 'create' ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>สร้างไฟล์ใหม่และส่งข้อมูลบนหน้าจอขึ้นไปทันที</span>
                </div>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                  <li>สร้าง 5 แท็บ: Master_Materials, BOM_Recipes, Daily_Production, Stock_Transactions, Monthly_Summary</li>
                  <li>นำข้อมูลที่คุณกรอกบนหน้าจอนี้ ส่งขึ้นไปเป็นข้อมูลใน Sheet ทันที</li>
                  <li>สูตรคำนวณอัตโนมัติครบถ้วน (ARRAYFORMULA, SUMIFS, XLOOKUP)</li>
                </ul>

                <button
                  onClick={handleCreateSubmit}
                  disabled={isSyncing}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/20 transition-all hover:scale-[1.01]"
                >
                  <PlusCircle className="w-5 h-5" />
                  <span>{isSyncing ? 'กำลังสร้าง Google Sheet...' : '✨ สร้าง Google Sheet ใหม่ในบัญชีของคุณ'}</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleLinkSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                  <p className="text-[11px] text-slate-500 mt-1">
                    ระบบจะส่งข้อมูลจากเว็บนี้ขึ้นไปอัปเดตลงใน Sheet ที่ระบุ (ไม่ลบทับข้อมูลบนเว็บ)
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={isSyncing}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors"
                >
                  <Link className="w-4 h-4" />
                  <span>เชื่อมต่อและส่งข้อมูลขึ้น Sheet นี้</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
