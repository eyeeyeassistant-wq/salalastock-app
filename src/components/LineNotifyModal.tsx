import React, { useState } from 'react';
import {
  Bell,
  Check,
  Copy,
  ExternalLink,
  Send,
  ShieldAlert,
  X,
  AlertTriangle,
  ShoppingCart,
  Package,
  Building2,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle,
  Share2,
} from 'lucide-react';
import { MonthlyStockSummary, MasterMaterial } from '../types/stock';
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
  materials?: MasterMaterial[];
  onShowNotification: (msg: string) => void;
}

export const LineNotifyModal: React.FC<LineNotifyModalProps> = ({
  isOpen,
  onClose,
  summaries,
  materials = [],
  onShowNotification,
}) => {
  const [token, setToken] = useState<string>(getLineNotifyToken());
  const [isSending, setIsSending] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedShort, setCopiedShort] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showAdvancedLineSettings, setShowAdvancedLineSettings] = useState<boolean>(false);

  if (!isOpen) return null;

  // Filter low stock items (Ending Stock <= Safety Stock)
  const lowStockItems = summaries.filter((s) => s.isLowStock);

  // Map low stock items with master material pricing & supplier
  const enrichedLowStockItems = lowStockItems.map((item) => {
    const mat = materials.find(
      (m) => (m.RM_Code || '').trim().toUpperCase() === (item.RM_Code || '').trim().toUpperCase()
    );
    const deficitQty = Math.max(0, Number(item.Safety_Stock) - Number(item.Ending_Stock));
    const unitPrice = mat?.Unit_Price || 0;
    const estCost = deficitQty * unitPrice;

    return {
      ...item,
      supplier: mat?.Supplier_Name || '',
      unitPrice,
      deficitQty,
      estCost,
    };
  });

  const totalEstCost = enrichedLowStockItems.reduce((acc, curr) => acc + curr.estCost, 0);

  // Generate detailed formatted message for LINE / Notes
  const generateDetailedMessage = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const timeStr = now.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (enrichedLowStockItems.length === 0) {
      return `✅ [รายงานสต็อกวัตถุดิบ]\n📅 วันที่: ${dateStr} เวลา: ${timeStr} น.\n\n👍 สต็อกวัตถุดิบทุกรายการอยู่ในระดับปลอดภัย ไม่มีรายการใดใกล้หมด`;
    }

    let text = `🚨 [แจ้งเตือนวัตถุดิบใกล้หมด & แนะนำสั่งซื้อ] 🚨\n`;
    text += `📅 ตรวจสอบ ณ: ${dateStr} (${timeStr} น.)\n`;
    text += `⚠️ พบวัตถุดิบต่ำกว่า Safety Stock จำนวน ${enrichedLowStockItems.length} รายการ:\n`;
    text += `------------------------------------\n`;

    enrichedLowStockItems.forEach((item, idx) => {
      text += `${idx + 1}. [${item.RM_Code}] ${item.RM_Name}\n`;
      text += `   • คงเหลือ: ${item.Ending_Stock.toLocaleString()} ${item.Unit} (จุดเตือน: ${item.Safety_Stock.toLocaleString()} ${item.Unit})\n`;
      text += `   • ขาดอีกอย่างน้อย: 🔴 ${item.deficitQty.toLocaleString()} ${item.Unit}\n`;
      if (item.supplier) {
        text += `   • ร้าน/ซัพพลายเออร์: ${item.supplier}\n`;
      }
      if (item.unitPrice > 0) {
        text += `   • ราคาประเมิน: ฿${item.estCost.toLocaleString()} (@฿${item.unitPrice}/${item.Unit})\n`;
      }
    });

    text += `------------------------------------\n`;
    if (totalEstCost > 0) {
      text += `💰 ยอดสั่งซื้อประมาณการรวม: ฿${totalEstCost.toLocaleString()} บาท\n`;
    }
    text += `💡 ข้อความจากระบบจัดการสต๊อกสินค้า`;

    return text;
  };

  // Generate short bullet list for quick chat
  const generateShortMessage = () => {
    if (enrichedLowStockItems.length === 0) return 'สต็อกปกติทุกรายการ';
    return enrichedLowStockItems
      .map(
        (item) =>
          `• ${item.RM_Name}: ขาด ${item.deficitQty.toLocaleString()} ${item.Unit} (เหลือ ${item.Ending_Stock.toLocaleString()})`
      )
      .join('\n');
  };

  const messagePreview = generateDetailedMessage();

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(messagePreview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    onShowNotification('📋 คัดลอกข้อความสรุปสั่งซื้อเรียบร้อยแล้ว (นำไปวางใน LINE หรือแชตได้ทันที)');
  };

  const handleCopyShortMessage = () => {
    navigator.clipboard.writeText(generateShortMessage());
    setCopiedShort(true);
    setTimeout(() => setCopiedShort(false), 2500);
    onShowNotification('📋 คัดลอกรายการย่อเรียบร้อยแล้ว');
  };

  const handleSaveToken = () => {
    setLineNotifyToken(token);
    setStatusMsg({ type: 'success', text: 'บันทึก LINE_NOTIFY_TOKEN เรียบร้อยแล้ว' });
    onShowNotification('💾 บันทึก LINE_NOTIFY_TOKEN เรียบร้อยแล้ว');
  };

  const handleSendNow = async () => {
    if (!token.trim()) {
      setStatusMsg({
        type: 'error',
        text: 'กรุณากรอก LINE Notify Token ในช่องด้านล่างก่อนกดส่ง หรือใช้ปุ่ม "คัดลอกข้อความ" ไปวางในกลุ่ม LINE แทนได้ทันที',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${lowStockItems.length > 0 ? 'bg-rose-600/30 text-rose-400 border border-rose-500/40' : 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40'}`}>
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-slate-100 leading-tight">
                  แจ้งเตือนสต็อก & แนะนำสั่งซื้อ
                </h3>
                {lowStockItems.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white animate-pulse">
                    {lowStockItems.length} รายการ
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ตรวจสอบวัตถุดิบที่ต่ำกว่าจุดปลอดภัย (Safety Stock)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar">
          {/* Status Summary Banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3.5 ${
              lowStockItems.length > 0
                ? 'bg-rose-50 border-rose-200 text-rose-950'
                : 'bg-emerald-50 border-emerald-200 text-emerald-950'
            }`}
          >
            {lowStockItems.length > 0 ? (
              <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <Check className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm sm:text-base flex items-center justify-between flex-wrap gap-2">
                <span>
                  {lowStockItems.length > 0
                    ? `พบวัตถุดิบใกล้หมดจำนวน ${lowStockItems.length} รายการที่ต้องสั่งเพิ่ม`
                    : 'สต็อกวัตถุดิบทุกรายการอยู่ในเกณฑ์ปลอดภัย (Normal)'}
                </span>
                {totalEstCost > 0 && (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-white border border-rose-300 text-rose-700">
                    ประมาณการ: ฿{totalEstCost.toLocaleString()}
                  </span>
                )}
              </h4>
              <p className="text-xs mt-1 text-slate-600 leading-relaxed">
                {lowStockItems.length > 0
                  ? 'ยอดคงเหลือปัจจุบันต่ำกว่าจุดปลอดภัย (Safety Stock) แนะนำให้รีบสั่งซื้อเข้ามาเติมสต็อก'
                  : 'ยังไม่มีวัตถุดิบรายการใดต่ำกว่า Safety Stock ระบบพร้อมใช้งานตามปกติ'}
              </p>
            </div>
          </div>

          {/* Low Stock Items List Table */}
          {enrichedLowStockItems.length > 0 ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
                  รายการวัตถุดิบที่ต้องสั่งซื้อ
                </span>
                <span className="text-xs text-slate-500">
                  {enrichedLowStockItems.length} รายการ
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto custom-scrollbar">
                {enrichedLowStockItems.map((item) => (
                  <div key={item.RM_Code} className="p-3 sm:px-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                          {item.RM_Code}
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                          {item.RM_Name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 flex-wrap">
                        <span>คงเหลือ: <strong className="text-rose-600 font-mono font-bold">{item.Ending_Stock.toLocaleString()} {item.Unit}</strong></span>
                        <span>•</span>
                        <span>จุดเตือน: <span className="font-mono">{item.Safety_Stock.toLocaleString()} {item.Unit}</span></span>
                        {item.supplier && (
                          <>
                            <span>•</span>
                            <span className="text-slate-600 flex items-center gap-0.5">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              {item.supplier}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-block text-xs font-bold font-mono px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                        ขาดอีก {item.deficitQty.toLocaleString()} {item.Unit}
                      </span>
                      {item.estCost > 0 && (
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                          ~฿{item.estCost.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
              <Package className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              วัตถุดิบทุกรายการมีปริมาณเพียงพอ ไม่จำเป็นต้องสั่งซื้อในขณะนี้
            </div>
          )}

          {/* Quick Copy Action Banner */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Share2 className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-blue-900">
                  คัดลอกข้อความสรุปสั่งซื้อ (ไม่ต้องใช้ Token)
                </h5>
                <p className="text-[11px] text-blue-700">
                  กดคัดลอกแล้วนำไปกดวาง (Paste) ส่งเข้ากลุ่ม LINE ร้านหรือแชตจัดซื้อได้ทันที
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleCopyShortMessage}
                className="flex-1 sm:flex-initial px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                title="คัดลอกเฉพาะรายการวัตถุดิบและจำนวนที่ขาด"
              >
                {copiedShort ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <FileText className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copiedShort ? 'คัดลอกแล้ว!' : 'คัดลอกย่อ'}</span>
              </button>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="flex-1 sm:flex-initial px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs flex items-center justify-center gap-1.5"
                title="คัดลอกข้อความสรุปแบบเต็มพร้อมราคาและร้านค้า"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'คัดลอกแล้ว!' : 'คัดลอกข้อความเต็ม'}</span>
              </button>
            </div>
          </div>

          {/* Formatted Message Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                <FileText className="w-3 h-3 text-slate-400" />
                ตัวอย่างข้อความสรุป (Message Preview)
              </label>
              <span className="text-[10px] text-slate-400">
                พร้อมคัดลอกส่งเข้า LINE / Notes
              </span>
            </div>
            <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] sm:text-xs rounded-xl overflow-x-auto whitespace-pre-wrap max-h-40 border border-slate-800 leading-relaxed shadow-inner custom-scrollbar">
              {messagePreview}
            </div>
          </div>

          {/* Optional Collapsible: LINE Notify Token Settings */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvancedLineSettings(!showAdvancedLineSettings)}
              className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-slate-500" />
                <span>ตัวเลือกเสริม: ส่งเข้า LINE Notify อัตโนมัติ (ไม่บังคับ)</span>
              </div>
              {showAdvancedLineSettings ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>

            {showAdvancedLineSettings && (
              <div className="p-4 bg-white space-y-3 border-t border-slate-200 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    LINE Notify Token (LINE_NOTIFY_TOKEN)
                  </label>
                  <a
                    href="https://notify-bot.line.me/my/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium"
                  >
                    รับ Token จากเว็บ LINE Notify <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="วาง Token ของคุณที่นี่ (ถ้าต้องการส่งออโต้)"
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleSaveToken}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
                  >
                    บันทึก
                  </button>
                  <button
                    type="button"
                    onClick={handleSendNow}
                    disabled={isSending}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shrink-0 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSending ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                    <span>ส่งตอนนี้</span>
                  </button>
                </div>
                {statusMsg && (
                  <div
                    className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                      statusMsg.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {statusMsg.type === 'error' ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                    <span>{statusMsg.text}</span>
                  </div>
                )}
                <p className="text-[11px] text-slate-500 leading-normal">
                  * หากไม่ต้องการใช้ Token สามารถปิดส่วนนี้ไว้ แล้วใช้ปุ่ม <strong>"คัดลอกข้อความ"</strong> ด้านบนไปวางส่งในกลุ่ม LINE ได้ง่ายกว่าครับ
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors min-h-[36px]"
          >
            ปิด
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMessage}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 min-h-[36px]"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'คัดลอกเรียบร้อยแล้ว!' : 'คัดลอกข้อความสรุปสั่งซื้อ'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
