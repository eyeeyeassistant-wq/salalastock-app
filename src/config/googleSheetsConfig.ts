/**
 * =========================================================================
 * 📌 ไฟล์ตั้งค่า Google Apps Script Web App URL ส่วนกลาง (Central Configuration)
 * =========================================================================
 * 
 * วิธีใช้งาน:
 * 1. นำ URL ของ Web App ที่ได้จากการ Deploy ใน Google Apps Script 
 *    (รูปแบบ: https://script.google.com/macros/s/AKfycb.../exec)
 * 2. นำมาวางในตัวแปร DEFAULT_WEBHOOK_URL ด้านล่างนี้ระหว่างเครื่องหมายคำพูด ''
 * 3. เมื่อวางแล้ว ทุกคนในร้านสามารถบันทึกข้อมูลและระบบจะซิงค์เข้า Google Sheet กลางอัตโนมัติทันที
 *    โดยไม่ต้องล็อกอิน และไม่ต้องตั้งค่าซ้ำทุกครั้งที่เปิดเว็บ!
 */

// ⬇️ นำ URL ของ Web App มาวางตรงนี้ ⬇️
export const DEFAULT_WEBHOOK_URL: string = 'https://script.google.com/macros/s/AKfycbyL0esXBsuuBThVf0YKWARx4AXFIJq7Lj26gxGnZb4V6YHchLGcDfZTn2FerhTpQ5KE/exec'; // 👈 ตัวอย่าง: 'https://script.google.com/macros/s/AKfycb.../exec'

// (ทางเลือกเสริม) ลิงก์สำหรับเปิดดูไฟล์ Google Sheet สามารถใส่เพื่อความสะดวกในการกดดู
export const DEFAULT_SPREADSHEET_URL: string = ''; // 👈 ตัวอย่าง: 'https://docs.google.com/spreadsheets/d/1A2B3C.../edit'

/**
 * ฟังก์ชันดึง Webhook URL ที่พร้อมใช้งาน (ตรวจสอบจากตัวแปรในโค้ดก่อนเสมอ)
 */
export function getEffectiveWebhookUrl(): string | null {
  if (DEFAULT_WEBHOOK_URL && DEFAULT_WEBHOOK_URL.trim().startsWith('http')) {
    return DEFAULT_WEBHOOK_URL.trim();
  }
  return localStorage.getItem('stock_webhook_url') || null;
}
