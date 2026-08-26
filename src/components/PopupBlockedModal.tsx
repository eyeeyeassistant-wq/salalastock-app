import React from 'react';
import { ExternalLink, ShieldAlert, X, RefreshCw, CheckCircle2, Zap } from 'lucide-react';

interface PopupBlockedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  onOpenSyncModal?: () => void;
}

export const PopupBlockedModal: React.FC<PopupBlockedModalProps> = ({
  isOpen,
  onClose,
  onRetry,
  onOpenSyncModal,
}) => {
  if (!isOpen) return null;

  const handleOpenInNewTab = () => {
    // Open current window location in a fresh top-level tab
    window.open(window.location.href, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl relative border border-slate-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              ข้อจำกัดการล็อกอิน Google ในหน้าต่างพรีวิว
            </h2>
            <p className="text-xs text-slate-500">
              Google OAuth Sign-in inside Preview iFrame
            </p>
          </div>
        </div>

        <div className="space-y-3.5 mb-5 text-xs text-slate-600 leading-relaxed">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
            เนื่องจาก Google ไม่อนุญาตให้หน้าต่างล็อกอิน OAuth ทำงานภายในกรอบพรีวิว (iFrame) หรือโดเมนชั่วคราว ทำให้การกดล็อกอินด้วย Google อาจไม่ขึ้นหน้าต่างล็อกอิน
          </div>

          <div className="space-y-2.5">
            <p className="font-bold text-slate-800">ทางเลือกที่สะดวกและใช้งานได้ทันที:</p>
            
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                <Zap className="w-4 h-4 text-emerald-600" />
                <span>ทางเลือกที่ 1 (แนะนำที่สุด): ซิงค์ผ่าน Apps Script Webhook</span>
              </div>
              <p className="text-[11px] text-emerald-800 pl-5">
                พนักงาน<b>ไม่ต้องล็อกอิน Google เลย</b> ข้อมูลการผลิตและสต็อกจะส่งเข้า Google Sheet ในบัญชีของคุณอัตโนมัติ 100%
              </p>
              {onOpenSyncModal && (
                <div className="pt-1 pl-5">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSyncModal();
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 underline hover:text-emerald-950 cursor-pointer"
                  >
                    👉 คลิกที่นี่เพื่อดูวิธีเชื่อมต่อ Webhook
                  </button>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <ExternalLink className="w-4 h-4 text-blue-600" />
                <span>ทางเลือกที่ 2: เปิดแอปในแท็บใหม่</span>
              </div>
              <p className="text-[11px] text-slate-600 pl-5">
                เปิดแอปแบบเต็มจอในแท็บใหม่เพื่อข้ามการบล็อกของกรอบพรีวิว แล้วลองกดเข้าสู่ระบบอีกครั้ง
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={handleOpenInNewTab}
            id="btn-popup-open-new-tab"
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-all cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            <span>เปิดแอปในแท็บใหม่</span>
          </button>

          <button
            onClick={onRetry}
            id="btn-popup-retry"
            className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>ลองใหม่อีกครั้ง</span>
          </button>
        </div>
      </div>
    </div>
  );
};
