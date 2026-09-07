import React, { useState } from 'react';
import { Bell, Check, Copy, ExternalLink, Send, ShieldAlert, X, AlertTriangle } from 'lucide-react';
import { MonthlyStockSummary } from '../types/stock';
import {
  getLineNotifyToken,
  setLineNotifyToken,
  formatLowStockLineMessage,
  sendLineNotification,
} from '../services/lineNotify';

interface LineNotifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  summaries: MonthlyStockSummary[];
  onShowNotification: (msg: string) => void;
}

export const LineNotifyModal: React.FC<LineNotifyModalProps> = ({
  isOpen,
  onClose,
  summaries,
  onShowNotification,
}) => {
  const [token, setToken] = useState<string>(getLineNotifyToken());
  const [isSending, setIsSending] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  if (!isOpen) return null;

  // Find items where Ending Stock <= Safety Stock
  const lowStockItems = summaries.filter((s) => s.isLowStock);
  const messagePreview = formatLowStockLineMessage(lowStockItems);

  const handleSaveToken = () => {
    setLineNotifyToken(token);
    setStatusMsg({ type: 'success', text: 'บันทึก LINE_NOTIFY_TOKEN เรียบร้อยแล้ว' });
    onShowNotification('💾 บันทึก LINE_NOTIFY_TOKEN เรียบร้อยแล้ว');
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(messagePreview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onShowNotification('📋 คัดลอกข้อความแจ้งเตือนเรียบร้อยแล้ว');
  };

  const handleSendNow = async () => {
    if (!token.trim()) {
      setStatusMsg({
        type: 'error',
        text: 'กรุณากรอก LINE Notify Token หรือกำหนดค่าในตัวแปร LINE_NOTIFY_TOKEN ก่อนส่ง',
      });
      return;
    }

    setIsSending(true);
    setStatusMsg(null);

    try {
      const result = await sendLineNotification(messagePreview, token);
      if (result.success) {
        setStatusMsg({ type: 'success', text: result.message });
        onShowNotification('🔔 ' + result.message);
      } else {
        setStatusMsg({ type: 'error', text: result.message });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'เกิดข้อผิดพลาดในการส่ง: ' + err.message });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">ระบบแจ้งเตือน LINE Notification</h3>
              <p className="text-xs text-emerald-100">ส่งข้อความเตือนอัตโนมัติเมื่อ Ending Stock ≤ Safety Stock</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Low stock summary banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              lowStockItems.length > 0
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            {lowStockItems.length > 0 ? (
              <ShieldAlert className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
            ) : (
              <Check className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <h4 className="font-semibold text-sm">
                {lowStockItems.length > 0
                  ? `ตรวจพบวัตถุดิบใกล้หมดจำนวน ${lowStockItems.length} รายการ`
                  : 'สต็อกวัตถุดิบอยู่ในระดับปลอดภัยทั้งหมด'}
              </h4>
              <p className="text-xs mt-1 opacity-90">
                {lowStockItems.length > 0
                  ? 'มีรายการวัตถุดิบที่ยอดคงเหลือสิ้นงวด (Ending Stock) ต่ำกว่าจุดปลอดภัย (Safety Stock)'
                  : 'ยังไม่มีวัตถุดิบรายการใดต่ำกว่า Safety Stock'}
              </p>
            </div>
          </div>

          {/* Token Configuration */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                LINE Notify Token (LINE_NOTIFY_TOKEN)
              </label>
              <a
                href="https://notify-bot.line.me/my/"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium"
              >
                รับ Token จาก LINE Notify <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="วาง Token ของคุณที่นี่ (เช่น vY98x...)"
                className="flex-1 px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
              <button
                type="button"
                onClick={handleSaveToken}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                บันทึก Token
              </button>
            </div>
            <p className="text-xs text-slate-500">
              * สามารถระบุผ่าน Environment Variable <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">LINE_NOTIFY_TOKEN</code> หรือกรอกโดยตรงในช่องนี้
            </p>
          </div>

          {/* Status Message */}
          {statusMsg && (
            <div
              className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : statusMsg.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}
            >
              {statusMsg.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />}
              {statusMsg.type === 'success' && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Message Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                ตัวอย่างข้อความที่จะส่ง (Message Preview)
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-xs text-slate-600 hover:text-slate-800 flex items-center gap-1 font-medium bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'คัดลอกแล้ว!' : 'คัดลอกข้อความ'}
              </button>
            </div>
            <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto whitespace-pre-wrap max-h-48 border border-slate-800 leading-relaxed shadow-inner">
              {messagePreview}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
          >
            ปิด
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopyMessage}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              คัดลอกข้อความ
            </button>
            <button
              type="button"
              onClick={handleSendNow}
              disabled={isSending}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {isSending ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              {isSending ? 'กำลังส่งแจ้งเตือน...' : 'ส่งแจ้งเตือนเข้า LINE เดี๋ยวนี้'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
