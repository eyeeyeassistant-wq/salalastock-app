import { MonthlyStockSummary } from '../types/stock';

export interface LineNotifyConfig {
  token: string;
  autoAlertEnabled: boolean;
}

export function getLineNotifyToken(): string {
  const envToken =
    (typeof process !== 'undefined' && process.env?.LINE_NOTIFY_TOKEN) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_LINE_NOTIFY_TOKEN);

  const storedToken = typeof localStorage !== 'undefined' ? localStorage.getItem('line_notify_token') : null;
  return (storedToken || envToken || '').trim();
}

export function setLineNotifyToken(token: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('line_notify_token', token.trim());
  }
}

/**
 * Format message for LINE Notify when items fall at or below safety stock
 */
export function formatLowStockLineMessage(lowStockItems: MonthlyStockSummary[]): string {
  if (!lowStockItems || lowStockItems.length === 0) {
    return '✅ รายงานสต็อกวัตถุดิบ: วัตถุดิบทุกลำดับอยู่ในระดับปกติ ปลอดภัย ไม่พบรายการต่ำกว่าจุดเตือน (Safety Stock)';
  }

  const dateStr = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const lines = [
    `\n🚨 [แจ้งเตือนวัตถุดิบใกล้หมด] 🚨`,
    `📅 เวลาตรวจสอบ: ${dateStr}`,
    `⚠️ พบวัตถุดิบต่ำกว่า Safety Stock จำนวน ${lowStockItems.length} รายการ:`,
    `--------------------------------`,
  ];

  lowStockItems.forEach((item, index) => {
    const safety = Number(item.Safety_Stock) || 0;
    const ending = Number(item.Ending_Stock) || 0;
    const deficit = Math.max(0, safety - ending);

    lines.push(
      `${index + 1}. [${item.RM_Code}] ${item.RM_Name}\n` +
      `   • คงเหลือ: ${ending.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${item.Unit}\n` +
      `   • จุดเตือน: ${safety.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${item.Unit}` +
      (deficit > 0 ? ` (ขาดอีก ${deficit.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${item.Unit})` : '')
    );
  });

  lines.push(`--------------------------------`);
  lines.push(`💡 กรุณาดำเนินการเปิด PO สั่งซื้อวัตถุดิบเพิ่มเติมเข้าระบบ`);

  return lines.join('\n');
}

/**
 * Send low stock alert notification directly given summary items
 */
export async function sendLowStockAlertNotification(
  lowStockItems: MonthlyStockSummary[],
  tokenOverride?: string
): Promise<{ success: boolean; message: string; httpStatus?: number }> {
  const message = formatLowStockLineMessage(lowStockItems);
  return sendLineNotification(message, tokenOverride);
}

/**
 * Send notification to LINE Notify API
 * Attempts backend route `/api/line-notify` first, then falls back to direct or mock
 */
export async function sendLineNotification(
  message: string,
  tokenOverride?: string
): Promise<{ success: boolean; message: string; httpStatus?: number }> {
  const token = (tokenOverride || getLineNotifyToken()).trim();

  if (!token) {
    return {
      success: false,
      message: 'กรุณาระบุ LINE_NOTIFY_TOKEN ก่อนส่งการแจ้งเตือน (ตั้งค่าได้ในเมนูแจ้งเตือน LINE)',
    };
  }

  // 1. Attempt sending via local backend proxy if available
  try {
    const backendRes = await fetch('/api/line-notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        message,
      }),
    });

    if (backendRes.ok) {
      const data = await backendRes.json();
      return {
        success: true,
        message: 'ส่งข้อความแจ้งเตือนเข้า LINE สำเร็จเรียบร้อยแล้ว!',
        httpStatus: backendRes.status,
      };
    }
  } catch (backendErr) {
    // Backend proxy not available or in client-only mode, continue to direct attempt
  }

  // 2. Direct browser attempt (Note: Browser fetch to notify-api.line.me may be blocked by CORS by LINE's servers)
  try {
    const params = new URLSearchParams();
    params.append('message', message);

    const response = await fetch('https://notify-api.line.me/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${token}`,
      },
      body: params,
      mode: 'cors',
    });

    if (response.ok) {
      return {
        success: true,
        message: 'ส่งการแจ้งเตือนเข้า LINE Notify สำเร็จแล้ว!',
        httpStatus: response.status,
      };
    } else {
      const text = await response.text();
      return {
        success: false,
        message: `LINE API ตอบกลับสถานะ ${response.status}: ${text || 'ไม่สามารถส่งข้อความได้'}`,
        httpStatus: response.status,
      };
    }
  } catch (err: any) {
    // Standard browser CORS restriction on notify-api.line.me
    console.warn('LINE Notify direct request notice:', err);
    return {
      success: false,
      message:
        'เบราว์เซอร์ติดข้อจำกัด CORS ของ LINE Notify API (เนื่องจาก notify-api.line.me ไม่รองรับ Cross-Origin ในเบราว์เซอร์โดยตรง) สามารถคัดลอกข้อความเพื่อส่งใน LINE หรือใช้ Token ผ่าน Backend ได้ครับ',
    };
  }
}
