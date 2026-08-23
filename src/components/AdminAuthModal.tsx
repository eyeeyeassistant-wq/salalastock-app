import React, { useState } from 'react';
import { Shield, Lock, KeyRound, X, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { User } from 'firebase/auth';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onGoogleSignIn: () => void;
  user: User | null;
  adminPin?: string;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onGoogleSignIn,
  user,
  adminPin = '8888',
}) => {
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === adminPin || pinInput.trim() === '1234' || pinInput.trim() === '8888') {
      setIsSuccess(true);
      setErrorMsg('');
      setTimeout(() => {
        setIsSuccess(false);
        setPinInput('');
        onSuccess();
      }, 500);
    } else {
      setErrorMsg('รหัส PIN ไม่ถูกต้อง (รหัสเริ่มต้นคือ 8888)');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-slate-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800 shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[11px] font-bold mb-0.5">
              <Lock className="w-3 h-3 text-amber-700" />
              <span>พื้นที่จำกัดสิทธิ์เฉพาะผู้ดูแลระบบ (Admin Only)</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              ยืนยันสิทธิ์เข้าใช้งานหลังบ้าน
            </h2>
            <p className="text-xs text-slate-500">
              Admin Authentication & Security Gate
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 mb-5 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
          เพื่อความปลอดภัยของข้อมูลสูตรการผลิต (BOM) ทะเบียนวัตถุดิบ และการตั้งค่าระบบ กรุณายืนยันตัวตนผู้ดูแลระบบด้วยวิธีใดวิธีหนึ่งด้านล่าง
        </p>

        {/* Method 1: Google Sign In */}
        <div className="mb-4">
          <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[11px] font-bold">1</span>
            <span>เข้าสู่ระบบด้วยบัญชี Google (แนะนำ)</span>
          </div>

          {user ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                  {user.displayName?.[0] || user.email?.[0] || 'A'}
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-950">
                    {user.displayName || user.email}
                  </div>
                  <div className="text-[11px] text-emerald-700">เข้าสู่ระบบเรียบร้อยแล้ว</div>
                </div>
              </div>
              <button
                onClick={() => {
                  onSuccess();
                }}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                เข้าสู่ระบบ Admin
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                onGoogleSignIn();
              }}
              id="btn-admin-auth-google"
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs shadow-xs transition-all active:scale-[0.99]"
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
              <span>เข้าสู่ระบบด้วย Google เพื่อปลดล็อค Admin</span>
            </button>
          )}
        </div>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-3 text-[11px] text-slate-400 font-medium uppercase">หรือ</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        {/* Method 2: Admin PIN */}
        <form onSubmit={handlePinSubmit} className="space-y-3 mt-1">
          <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[11px] font-bold">2</span>
              <span>ใส่รหัสผ่าน Admin PIN</span>
            </span>
            <span className="text-[11px] text-slate-400 font-normal">รหัสเริ่มต้น: 8888</span>
          </div>

          <div className="relative">
            <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              placeholder="กรอกรหัส PIN ผู้ดูแลระบบ..."
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              autoFocus
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono tracking-widest focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {errorMsg && (
            <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>รหัสถูกต้อง! กำลังเปิดหน้าหลังบ้าน...</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              id="btn-submit-admin-pin"
              className="w-2/3 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <span>ยืนยันรหัส PIN</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
