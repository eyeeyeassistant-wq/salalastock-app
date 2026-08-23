import React from 'react';
import { ExternalLink, ShieldAlert, X, RefreshCw, CheckCircle2 } from 'lucide-react';

interface PopupBlockedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
}

export const PopupBlockedModal: React.FC<PopupBlockedModalProps> = ({
  isOpen,
  onClose,
  onRetry,
}) => {
  if (!isOpen) return null;

  const handleOpenInNewTab = () => {
    // Open current window location in a fresh top-level tab
    window.open(window.location.href, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-slate-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              เบราว์เซอร์บล็อกหน้าต่างเข้าสู่ระบบ
            </h2>
            <p className="text-xs text-slate-500">
              Popup Blocked by Browser
            </p>
          </div>
        </div>

        <div className="space-y-3.5 mb-5 text-xs text-slate-600 leading-relaxed">
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900">
            เนื่องจากหน้านี้แสดงผลอยู่ในกรอบพรีวิว (iFrame) หรือการตั้งค่าความปลอดภัยของเบราว์เซอร์ ทำให้หน้าต่างป๊อปอัปสำหรับล็อกอิน Google ถูกบล็อกชั่วคราว
          </div>

          <div className="space-y-2">
            <p className="font-semibold text-slate-800">วิธีแก้ปัญหาที่ง่ายและได้ผลที่สุด:</p>
            <div className="flex items-start gap-2 text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span><b>วิธีที่ 1 (แนะนำ):</b> กดปุ่ม <b>"เปิดแอปในแท็บใหม่"</b> ด้านล่าง เพื่อใช้งานบนหน้าต่างจริงและเข้าสู่ระบบได้ทันที</span>
            </div>
            <div className="flex items-start gap-2 text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span><b>วิธีที่ 2:</b> คลิกไอคอนรูปแม่กุญแจ 🔒 หรือรูปป๊อปอัป 🚫 ที่แถบที่อยู่เว็บ (URL Bar) ด้านบน แล้วเลือก <b>"อนุญาตป๊อปอัปเสมอ (Always allow popups)"</b></span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={handleOpenInNewTab}
            id="btn-popup-open-new-tab"
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-900/20 transition-all active:scale-[0.98]"
          >
            <ExternalLink className="w-4 h-4" />
            <span>🚀 เปิดแอปในแท็บใหม่เพื่อล็อกอิน</span>
          </button>

          <button
            onClick={onRetry}
            id="btn-popup-retry"
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>ลองเข้าสู่ระบบใหม่อีกครั้ง</span>
          </button>
        </div>
      </div>
    </div>
  );
};
