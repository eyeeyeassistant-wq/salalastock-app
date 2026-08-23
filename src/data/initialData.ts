import { MasterMaterial, BOMRecipe, DailyProduction, StockTransaction } from '../types/stock';

export const INITIAL_MATERIALS: MasterMaterial[] = [
  { RM_Code: 'RM001', RM_Name: 'แป้งสาลีเอนกประสงค์ (Flour)', Unit: 'kg', Opening_Stock: 100, Safety_Stock: 30 },
  { RM_Code: 'RM002', RM_Name: 'น้ำตาลทรายขาว (Sugar)', Unit: 'kg', Opening_Stock: 80, Safety_Stock: 25 },
  { RM_Code: 'RM003', RM_Name: 'เนยสดแท้ (Butter)', Unit: 'kg', Opening_Stock: 50, Safety_Stock: 20 },
  { RM_Code: 'RM004', RM_Name: 'นมสดพาสเจอร์ไรส์ (Fresh Milk)', Unit: 'L', Opening_Stock: 60, Safety_Stock: 20 },
  { RM_Code: 'RM005', RM_Name: 'ผงโกโก้พรีเมียม (Cocoa Powder)', Unit: 'kg', Opening_Stock: 25, Safety_Stock: 10 },
  { RM_Code: 'RM006', RM_Name: 'เมล็ดกาแฟคั่วเข้ม (Coffee Beans)', Unit: 'kg', Opening_Stock: 40, Safety_Stock: 15 },
  { RM_Code: 'RM007', RM_Name: 'ไข่ไก่สดเบอร์ 2 (Eggs)', Unit: 'tray', Opening_Stock: 30, Safety_Stock: 10 },
  { RM_Code: 'RM008', RM_Name: 'กล่องเค้กและบรรจุภัณฑ์ (Packaging)', Unit: 'pcs', Opening_Stock: 500, Safety_Stock: 150 },
];

export const INITIAL_RECIPES: BOMRecipe[] = [
  // Product P001: เค้กช็อกโกแลตหน้านิ่ม (Chocolate Cake) ต่อ 1 ก้อน
  { Product_Code: 'P001', Product_Name: 'เค้กช็อกโกแลตหน้านิ่ม (1 ปอนด์)', RM_Code: 'RM001', Standard_Qty: 0.25 }, // 250g แป้ง
  { Product_Code: 'P001', Product_Name: 'เค้กช็อกโกแลตหน้านิ่ม (1 ปอนด์)', RM_Code: 'RM002', Standard_Qty: 0.20 }, // 200g น้ำตาล
  { Product_Code: 'P001', Product_Name: 'เค้กช็อกโกแลตหน้านิ่ม (1 ปอนด์)', RM_Code: 'RM003', Standard_Qty: 0.15 }, // 150g เนย
  { Product_Code: 'P001', Product_Name: 'เค้กช็อกโกแลตหน้านิ่ม (1 ปอนด์)', RM_Code: 'RM004', Standard_Qty: 0.20 }, // 200ml นม
  { Product_Code: 'P001', Product_Name: 'เค้กช็อกโกแลตหน้านิ่ม (1 ปอนด์)', RM_Code: 'RM005', Standard_Qty: 0.10 }, // 100g โกโก้
  { Product_Code: 'P001', Product_Name: 'เค้กช็อกโกแลตหน้านิ่ม (1 ปอนด์)', RM_Code: 'RM007', Standard_Qty: 0.10 }, // ~3 ฟอง (0.1 ถาด)
  { Product_Code: 'P001', Product_Name: 'เค้กช็อกโกแลตหน้านิ่ม (1 ปอนด์)', RM_Code: 'RM008', Standard_Qty: 1.00 }, // 1 กล่อง

  // Product P002: ครัวซองต์เนยสด (Butter Croissant) ต่อ 1 ชิ้น
  { Product_Code: 'P002', Product_Name: 'ครัวซองต์เนยสด (Butter Croissant)', RM_Code: 'RM001', Standard_Qty: 0.08 }, // 80g แป้ง
  { Product_Code: 'P002', Product_Name: 'ครัวซองต์เนยสด (Butter Croissant)', RM_Code: 'RM002', Standard_Qty: 0.02 }, // 20g น้ำตาล
  { Product_Code: 'P002', Product_Name: 'ครัวซองต์เนยสด (Butter Croissant)', RM_Code: 'RM003', Standard_Qty: 0.05 }, // 50g เนย
  { Product_Code: 'P002', Product_Name: 'ครัวซองต์เนยสด (Butter Croissant)', RM_Code: 'RM004', Standard_Qty: 0.04 }, // 40ml นม
  { Product_Code: 'P002', Product_Name: 'ครัวซองต์เนยสด (Butter Croissant)', RM_Code: 'RM008', Standard_Qty: 1.00 }, // 1 ซอง

  // Product P003: กาแฟลาเต้เย็น (Iced Latte) ต่อ 1 แก้ว
  { Product_Code: 'P003', Product_Name: 'กาแฟลาเต้เย็น (Iced Latte 16oz)', RM_Code: 'RM006', Standard_Qty: 0.02 }, // 20g กาแฟ
  { Product_Code: 'P003', Product_Name: 'กาแฟลาเต้เย็น (Iced Latte 16oz)', RM_Code: 'RM004', Standard_Qty: 0.15 }, // 150ml นม
  { Product_Code: 'P003', Product_Name: 'กาแฟลาเต้เย็น (Iced Latte 16oz)', RM_Code: 'RM002', Standard_Qty: 0.015 }, // 15g น้ำตาล
  { Product_Code: 'P003', Product_Name: 'กาแฟลาเต้เย็น (Iced Latte 16oz)', RM_Code: 'RM008', Standard_Qty: 1.00 }, // 1 แก้ว
];

export const INITIAL_DAILY_PRODUCTION: DailyProduction[] = [
  {
    Date: '2026-08-01',
    Product_Code: 'P001',
    Produced_Qty: 50,
    Dispatch_Branch_A: 25,
    Dispatch_Branch_B: 25,
    Leftover_Branch_A: 2,
    Leftover_Branch_B: 1,
    Total_Dispatched: 50,
    Total_Leftover: 3,
  },
  {
    Date: '2026-08-02',
    Product_Code: 'P002',
    Produced_Qty: 200,
    Dispatch_Branch_A: 110,
    Dispatch_Branch_B: 90,
    Leftover_Branch_A: 5,
    Leftover_Branch_B: 4,
    Total_Dispatched: 200,
    Total_Leftover: 9,
  },
  {
    Date: '2026-08-03',
    Product_Code: 'P003',
    Produced_Qty: 300,
    Dispatch_Branch_A: 160,
    Dispatch_Branch_B: 140,
    Leftover_Branch_A: 0,
    Leftover_Branch_B: 0,
    Total_Dispatched: 300,
    Total_Leftover: 0,
  },
  {
    Date: '2026-08-04',
    Product_Code: 'P001',
    Produced_Qty: 40,
    Dispatch_Branch_A: 20,
    Dispatch_Branch_B: 20,
    Leftover_Branch_A: 1,
    Leftover_Branch_B: 0,
    Total_Dispatched: 40,
    Total_Leftover: 1,
  },
  {
    Date: '2026-08-05',
    Product_Code: 'P002',
    Produced_Qty: 150,
    Dispatch_Branch_A: 80,
    Dispatch_Branch_B: 70,
    Leftover_Branch_A: 3,
    Leftover_Branch_B: 2,
    Total_Dispatched: 150,
    Total_Leftover: 5,
  },
];

export const INITIAL_TRANSACTIONS: StockTransaction[] = [
  // Receive (รับเข้า)
  { Date: '2026-08-01', Type: 'Receive', RM_Code: 'RM001', Qty: 150, Recorder: 'สมศักดิ์ คลังสินค้า', Note: 'ล็อตรับเข้าต้นเดือน PO#101' },
  { Date: '2026-08-01', Type: 'Receive', RM_Code: 'RM002', Qty: 100, Recorder: 'สมศักดิ์ คลังสินค้า', Note: 'ล็อตรับเข้าต้นเดือน PO#101' },
  { Date: '2026-08-01', Type: 'Receive', RM_Code: 'RM003', Qty: 60, Recorder: 'สมศักดิ์ คลังสินค้า', Note: 'เนยสดอิมพอร์ต PO#102' },
  { Date: '2026-08-01', Type: 'Receive', RM_Code: 'RM004', Qty: 80, Recorder: 'สมศักดิ์ คลังสินค้า', Note: 'นมสดส่งตรงฟาร์ม' },
  { Date: '2026-08-02', Type: 'Receive', RM_Code: 'RM005', Qty: 20, Recorder: 'สมศักดิ์ คลังสินค้า', Note: 'โกโก้พรีเมียม' },
  { Date: '2026-08-02', Type: 'Receive', RM_Code: 'RM006', Qty: 30, Recorder: 'สมศักดิ์ คลังสินค้า', Note: 'เมล็ดกาแฟอาราบิก้า' },
  { Date: '2026-08-02', Type: 'Receive', RM_Code: 'RM007', Qty: 20, Recorder: 'สมศักดิ์ คลังสินค้า', Note: 'ไข่ไก่สด' },
  { Date: '2026-08-02', Type: 'Receive', RM_Code: 'RM008', Qty: 500, Recorder: 'สมศักดิ์ คลังสินค้า', Note: 'กล่องและแก้ว' },

  // Actual Usage (เบิกใช้จริง - พนักงานกรอก)
  // RM001 Expected ~ 50*0.25 + 200*0.08 + 40*0.25 + 150*0.08 = 12.5 + 16 + 10 + 12 = 50.5 kg
  { Date: '2026-08-01', Type: 'Actual Usage', RM_Code: 'RM001', Qty: 25, Recorder: 'เชฟแมน ครัวกลาง', Note: 'เบิกผสมเค้กช็อกโกแลต' },
  { Date: '2026-08-03', Type: 'Actual Usage', RM_Code: 'RM001', Qty: 28.5, Recorder: 'เชฟแมน ครัวกลาง', Note: 'เบิกทำครัวซองต์ (มีผงแป้งหกเสียหาย)' }, // Overused variance!

  // RM002 Sugar: Expected ~ 50*0.2 + 200*0.02 + 300*0.015 + 40*0.2 + 150*0.02 = 10 + 4 + 4.5 + 8 + 3 = 29.5 kg
  { Date: '2026-08-02', Type: 'Actual Usage', RM_Code: 'RM002', Qty: 15, Recorder: 'วรรณา ฝ่ายผสม', Note: 'เบิกทำเบเกอรี่' },
  { Date: '2026-08-04', Type: 'Actual Usage', RM_Code: 'RM002', Qty: 14.5, Recorder: 'วรรณา ฝ่ายผสม', Note: 'เบิกปรุงกาแฟและเค้ก' },

  // RM003 Butter: Expected ~ 50*0.15 + 200*0.05 + 40*0.15 + 150*0.05 = 7.5 + 10 + 6 + 7.5 = 31 kg
  { Date: '2026-08-01', Type: 'Actual Usage', RM_Code: 'RM003', Qty: 15, Recorder: 'เชฟแมน ครัวกลาง', Note: 'เบิกเนยทำเค้ก' },
  { Date: '2026-08-03', Type: 'Actual Usage', RM_Code: 'RM003', Qty: 18, Recorder: 'เชฟแมน ครัวกลาง', Note: 'เบิกเนยรีดแป้งครัวซองต์ (เกินเกณฑ์เล็กน้อย)' },

  // RM004 Milk: Expected ~ 50*0.20 + 200*0.04 + 300*0.15 + 40*0.20 + 150*0.04 = 10 + 8 + 45 + 8 + 6 = 77 L
  { Date: '2026-08-01', Type: 'Actual Usage', RM_Code: 'RM004', Qty: 35, Recorder: 'กมล ชงเครื่องดื่ม', Note: 'เบิกใช้นมสดสัปดาห์ที่ 1' },
  { Date: '2026-08-04', Type: 'Actual Usage', RM_Code: 'RM004', Qty: 44, Recorder: 'กมล ชงเครื่องดื่ม', Note: 'เบิกใช้นมสดสัปดาห์ที่ 2' },

  // RM005 Cocoa: Expected ~ 50*0.10 + 40*0.10 = 9 kg
  { Date: '2026-08-01', Type: 'Actual Usage', RM_Code: 'RM005', Qty: 9, Recorder: 'เชฟแมน ครัวกลาง', Note: 'เบิกผงโกโก้' },

  // RM006 Coffee: Expected ~ 300*0.02 = 6 kg
  { Date: '2026-08-03', Type: 'Actual Usage', RM_Code: 'RM006', Qty: 6.2, Recorder: 'กมล บาริสต้า', Note: 'เบิกเมล็ดกาแฟคั่ว' },

  // RM007 Eggs: Expected ~ 50*0.10 + 40*0.10 = 9 trays
  { Date: '2026-08-01', Type: 'Actual Usage', RM_Code: 'RM007', Qty: 10, Recorder: 'เชฟแมน ครัวกลาง', Note: 'เบิกไข่ไก่ (มีแตกชำรุด 1 แผง)' },

  // RM008 Packaging: Expected ~ 50 + 200 + 300 + 40 + 150 = 740 pcs
  { Date: '2026-08-01', Type: 'Actual Usage', RM_Code: 'RM008', Qty: 400, Recorder: 'สมศักดิ์ แพ็กเกจ', Note: 'เบิกกล่องและถ้วยแก้ว' },
  { Date: '2026-08-04', Type: 'Actual Usage', RM_Code: 'RM008', Qty: 350, Recorder: 'สมศักดิ์ แพ็กเกจ', Note: 'เบิกกล่องรอบ 2' },
];
