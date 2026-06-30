export type PaymentType =
  | "現金"
  | "クレジット"
  | "交通系IC"
  | "iD"
  | "QUICPay"
  | "QR決済"
  | "ネット決済"
  | "チケット/未収"
  | "その他";

export type ExpenseCategory =
  | "ガソリン代"
  | "駐車場代"
  | "保険料"
  | "洗車代"
  | "修理代"
  | "通信費"
  | "事業用備品"
  | "その他";

export type DayStatus = "取込済み" | "営業なし" | "CSV未取込";
export type PaymentPeriod = "日次" | "週次" | "月次" | "期間指定";
export type ReconciliationStatus = "突合済み" | "差額あり" | "未入金";

export type Trip = {
  id: string;
  start: string;
  end: string;
  from: string;
  to: string;
  distance: string;
  fare: number;
  payment: PaymentType;
};

export type PaymentSummaryItem = {
  type: PaymentType;
  code: string;
  amount: number;
  count: number;
};

export type DailyReport = {
  date: string;
  status: DayStatus;
  note: string;
  sales: number;
  monthlySales: number;
  tripCount: number;
  cashlessRatio: number;
  expenses: number;
  profit: number;
  driverCode: string;
  vehicleCode: string;
  departureTime: string;
  arrivalTime: string;
  payments: PaymentSummaryItem[];
  trips: Trip[];
};

export type PaymentDetail = {
  id: string;
  period: PaymentPeriod;
  usedAt: string;
  type: PaymentType;
  amount: number;
  driverCode: string;
  vehicleCode: string;
  memo: string;
  reconciliationStatus: ReconciliationStatus;
};

export const paymentCodes: Record<PaymentType, string> = {
  現金: "01",
  クレジット: "06/08",
  交通系IC: "0C",
  iD: "09",
  QUICPay: "0A",
  QR決済: "QR",
  ネット決済: "NET",
  "チケット/未収": "02/27",
  その他: "0D/2E/2F"
};

const makePayments = (items: Array<[PaymentType, number, number]>): PaymentSummaryItem[] =>
  items.map(([type, amount, count]) => ({ type, code: paymentCodes[type], amount, count }));

const noPayments = makePayments([
  ["現金", 0, 0],
  ["クレジット", 0, 0],
  ["交通系IC", 0, 0],
  ["iD", 0, 0],
  ["QUICPay", 0, 0],
  ["QR決済", 0, 0],
  ["ネット決済", 0, 0],
  ["チケット/未収", 0, 0],
  ["その他", 0, 0]
]);

export const dailyReports: Record<string, DailyReport> = {
  "2026-06-24": {
    date: "2026-06-24",
    status: "取込済み",
    note: "通常営業日。朝夕の駅前利用が中心のサンプルです。",
    sales: 54820,
    monthlySales: 1551320,
    tripCount: 21,
    cashlessRatio: 62.4,
    expenses: 7200,
    profit: 47620,
    driverCode: "D-1024",
    vehicleCode: "TAXI-27",
    departureTime: "07:36",
    arrivalTime: "20:48",
    payments: makePayments([
      ["現金", 20600, 8],
      ["クレジット", 11240, 4],
      ["交通系IC", 5840, 3],
      ["iD", 2260, 1],
      ["QUICPay", 1980, 1],
      ["QR決済", 5620, 2],
      ["ネット決済", 4780, 1],
      ["チケット/未収", 2100, 1],
      ["その他", 400, 0]
    ]),
    trips: [
      { id: "F4-024-01", start: "08:02", end: "08:26", from: "自宅車庫前", to: "駅前", distance: "5.4km", fare: 2640, payment: "現金" },
      { id: "F4-024-02", start: "09:14", end: "09:52", from: "駅前", to: "大学病院", distance: "13.1km", fare: 6240, payment: "クレジット" },
      { id: "F4-024-03", start: "12:05", end: "12:24", from: "市役所", to: "商業施設", distance: "4.8km", fare: 2380, payment: "交通系IC" },
      { id: "F4-024-04", start: "17:42", end: "18:10", from: "駅前", to: "住宅街A", distance: "8.7km", fare: 4160, payment: "QR決済" },
      { id: "F4-024-05", start: "20:02", end: "20:32", from: "繁華街", to: "自宅車庫前", distance: "9.6km", fare: 4580, payment: "現金" }
    ]
  },
  "2026-06-25": {
    date: "2026-06-25",
    status: "取込済み",
    note: "売上が高い日。空港、病院、繁華街の長距離利用が重なったサンプルです。",
    sales: 86240,
    monthlySales: 1637560,
    tripCount: 34,
    cashlessRatio: 66.7,
    expenses: 9800,
    profit: 76440,
    driverCode: "D-1024",
    vehicleCode: "TAXI-27",
    departureTime: "06:58",
    arrivalTime: "23:34",
    payments: makePayments([
      ["現金", 28700, 11],
      ["クレジット", 24680, 8],
      ["交通系IC", 10240, 5],
      ["iD", 4620, 2],
      ["QUICPay", 3980, 2],
      ["QR決済", 7840, 3],
      ["ネット決済", 4580, 1],
      ["チケット/未収", 1200, 1],
      ["その他", 400, 1]
    ]),
    trips: [
      { id: "F4-025-01", start: "07:22", end: "08:05", from: "駅前", to: "空港", distance: "21.8km", fare: 10680, payment: "クレジット" },
      { id: "F4-025-02", start: "09:18", end: "10:02", from: "空港", to: "市民病院", distance: "19.6km", fare: 9460, payment: "ネット決済" },
      { id: "F4-025-03", start: "13:30", end: "13:58", from: "大学病院", to: "駅前", distance: "8.4km", fare: 3980, payment: "交通系IC" },
      { id: "F4-025-04", start: "18:20", end: "19:06", from: "繁華街", to: "隣市役所", distance: "17.2km", fare: 7860, payment: "QR決済" },
      { id: "F4-025-05", start: "22:28", end: "23:08", from: "駅前", to: "住宅街C", distance: "14.9km", fare: 6920, payment: "現金" }
    ]
  },
  "2026-06-26": {
    date: "2026-06-26",
    status: "取込済み",
    note: "経費が多い日。修理代と給油が同日に発生したサンプルです。",
    sales: 61280,
    monthlySales: 1698840,
    tripCount: 24,
    cashlessRatio: 63.3,
    expenses: 22800,
    profit: 38480,
    driverCode: "D-1024",
    vehicleCode: "TAXI-27",
    departureTime: "08:12",
    arrivalTime: "22:05",
    payments: makePayments([
      ["現金", 22480, 9],
      ["クレジット", 12840, 4],
      ["交通系IC", 6720, 3],
      ["iD", 3180, 2],
      ["QUICPay", 2560, 1],
      ["QR決済", 6420, 2],
      ["ネット決済", 4380, 1],
      ["チケット/未収", 2300, 1],
      ["その他", 400, 1]
    ]),
    trips: [
      { id: "F4-026-01", start: "08:44", end: "09:13", from: "自宅車庫前", to: "駅前", distance: "7.1km", fare: 3380, payment: "現金" },
      { id: "F4-026-02", start: "10:22", end: "10:55", from: "駅前", to: "市役所", distance: "9.7km", fare: 4620, payment: "クレジット" },
      { id: "F4-026-03", start: "14:08", end: "14:44", from: "商業施設", to: "大学病院", distance: "12.4km", fare: 5860, payment: "交通系IC" },
      { id: "F4-026-04", start: "18:16", end: "18:48", from: "駅前", to: "住宅街B", distance: "9.1km", fare: 4280, payment: "QR決済" },
      { id: "F4-026-05", start: "21:10", end: "21:44", from: "繁華街", to: "工業団地", distance: "12.0km", fare: 5560, payment: "現金" }
    ]
  },
  "2026-06-27": {
    date: "2026-06-27",
    status: "取込済み",
    note: "売上高めの日。週末需要が強いサンプルです。",
    sales: 74660,
    monthlySales: 1773500,
    tripCount: 31,
    cashlessRatio: 68.1,
    expenses: 11200,
    profit: 63460,
    driverCode: "D-1024",
    vehicleCode: "TAXI-27",
    departureTime: "06:52",
    arrivalTime: "23:08",
    payments: makePayments([
      ["現金", 23840, 9],
      ["クレジット", 18420, 6],
      ["交通系IC", 9650, 5],
      ["iD", 4280, 2],
      ["QUICPay", 3560, 2],
      ["QR決済", 6820, 3],
      ["ネット決済", 5410, 2],
      ["チケット/未収", 2180, 1],
      ["その他", 500, 1]
    ]),
    trips: [
      { id: "F4-027-01", start: "07:12", end: "07:38", from: "住宅街B", to: "駅前", distance: "7.2km", fare: 3360, payment: "交通系IC" },
      { id: "F4-027-02", start: "08:05", end: "08:58", from: "駅前", to: "空港", distance: "23.0km", fare: 11240, payment: "クレジット" },
      { id: "F4-027-03", start: "10:20", end: "10:47", from: "市民病院", to: "商業施設", distance: "8.0km", fare: 3840, payment: "iD" },
      { id: "F4-027-04", start: "12:32", end: "13:02", from: "駅前", to: "工業団地", distance: "11.8km", fare: 5580, payment: "ネット決済" },
      { id: "F4-027-05", start: "18:22", end: "19:04", from: "繁華街", to: "隣市役所", distance: "16.6km", fare: 7620, payment: "QR決済" },
      { id: "F4-027-06", start: "22:04", end: "22:38", from: "駅前", to: "住宅街A", distance: "10.4km", fare: 4920, payment: "現金" }
    ]
  },
  "2026-06-28": {
    date: "2026-06-28",
    status: "営業なし",
    note: "休車日のサンプルです。売上、経費、営業明細はありません。",
    sales: 0,
    monthlySales: 1773500,
    tripCount: 0,
    cashlessRatio: 0,
    expenses: 0,
    profit: 0,
    driverCode: "-",
    vehicleCode: "-",
    departureTime: "-",
    arrivalTime: "-",
    payments: noPayments,
    trips: []
  },
  "2026-06-29": {
    date: "2026-06-29",
    status: "CSV未取込",
    note: "CSV未取込日のサンプルです。その日の営業CSV取込が必要な状態を示します。",
    sales: 0,
    monthlySales: 1773500,
    tripCount: 0,
    cashlessRatio: 0,
    expenses: 0,
    profit: 0,
    driverCode: "-",
    vehicleCode: "-",
    departureTime: "-",
    arrivalTime: "-",
    payments: noPayments,
    trips: []
  },
  "2026-06-30": {
    date: "2026-06-30",
    status: "取込済み",
    note: "通常営業日。日次集計の基準日として使うサンプルです。",
    sales: 68420,
    monthlySales: 1841920,
    tripCount: 27,
    cashlessRatio: 62.4,
    expenses: 9600,
    profit: 58820,
    driverCode: "D-1024",
    vehicleCode: "TAXI-27",
    departureTime: "07:18",
    arrivalTime: "22:42",
    payments: makePayments([
      ["現金", 25700, 10],
      ["クレジット", 14880, 5],
      ["交通系IC", 7950, 4],
      ["iD", 3840, 2],
      ["QUICPay", 2960, 1],
      ["QR決済", 6120, 3],
      ["ネット決済", 4310, 1],
      ["チケット/未収", 2160, 1],
      ["その他", 500, 0]
    ]),
    trips: [
      { id: "F4-030-01", start: "07:42", end: "08:05", from: "駅前", to: "市民病院", distance: "4.8km", fare: 2420, payment: "交通系IC" },
      { id: "F4-030-02", start: "08:18", end: "08:51", from: "市役所", to: "空港", distance: "18.4km", fare: 8460, payment: "クレジット" },
      { id: "F4-030-03", start: "09:22", end: "09:38", from: "ホテル中央", to: "駅前", distance: "3.2km", fare: 1780, payment: "現金" },
      { id: "F4-030-04", start: "10:06", end: "10:44", from: "住宅街A", to: "大学病院", distance: "12.1km", fare: 5890, payment: "QR決済" },
      { id: "F4-030-05", start: "12:12", end: "12:36", from: "商業施設", to: "オフィス街", distance: "6.7km", fare: 3160, payment: "iD" },
      { id: "F4-030-06", start: "14:03", end: "14:58", from: "駅前", to: "隣市役所", distance: "22.5km", fare: 10840, payment: "ネット決済" },
      { id: "F4-030-07", start: "18:15", end: "18:47", from: "繁華街", to: "住宅街B", distance: "9.8km", fare: 4520, payment: "QUICPay" },
      { id: "F4-030-08", start: "21:06", end: "21:34", from: "駅前", to: "工業団地", distance: "11.2km", fare: 5260, payment: "現金" }
    ]
  }
};

export const todaySummary = dailyReports["2026-06-30"];

export const monthlyTrend = [
  { label: "6/24", sales: dailyReports["2026-06-24"].sales },
  { label: "6/25", sales: dailyReports["2026-06-25"].sales },
  { label: "6/26", sales: dailyReports["2026-06-26"].sales },
  { label: "6/27", sales: dailyReports["2026-06-27"].sales },
  { label: "6/28", sales: dailyReports["2026-06-28"].sales },
  { label: "6/29", sales: dailyReports["2026-06-29"].sales },
  { label: "6/30", sales: dailyReports["2026-06-30"].sales }
];

export const paymentSummary = todaySummary.payments;
export const trips = todaySummary.trips;

export const expenses = [
  { id: "EX-004-01", date: "2026-04-03", category: "ガソリン代" as ExpenseCategory, amount: 7600, method: "事業用カード", memo: "月初給油" },
  { id: "EX-004-02", date: "2026-04-08", category: "通信費" as ExpenseCategory, amount: 2200, method: "口座振替", memo: "配車アプリ通信費" },
  { id: "EX-004-03", date: "2026-04-12", category: "駐車場代" as ExpenseCategory, amount: 1800, method: "現金", memo: "駅前待機場" },
  { id: "EX-004-04", date: "2026-04-18", category: "洗車代" as ExpenseCategory, amount: 1500, method: "現金", memo: "定期洗車" },
  { id: "EX-004-05", date: "2026-04-25", category: "保険料" as ExpenseCategory, amount: 18200, method: "口座振替", memo: "事業用車両保険" },
  { id: "EX-005-01", date: "2026-05-02", category: "ガソリン代" as ExpenseCategory, amount: 8300, method: "事業用カード", memo: "連休営業前給油" },
  { id: "EX-005-02", date: "2026-05-10", category: "修理代" as ExpenseCategory, amount: 12400, method: "事業用カード", memo: "オイル交換・点検" },
  { id: "EX-005-03", date: "2026-05-15", category: "事業用備品" as ExpenseCategory, amount: 3600, method: "事業用カード", memo: "車内清掃用品" },
  { id: "EX-005-04", date: "2026-05-21", category: "駐車場代" as ExpenseCategory, amount: 2400, method: "現金", memo: "駅前待機場" },
  { id: "EX-005-05", date: "2026-05-29", category: "通信費" as ExpenseCategory, amount: 2200, method: "口座振替", memo: "車載端末通信" },
  { id: "EX-024-01", date: "2026-06-24", category: "ガソリン代" as ExpenseCategory, amount: 6200, method: "事業用カード", memo: "通常給油" },
  { id: "EX-024-02", date: "2026-06-24", category: "駐車場代" as ExpenseCategory, amount: 1000, method: "現金", memo: "駅前待機場" },
  { id: "EX-025-01", date: "2026-06-25", category: "ガソリン代" as ExpenseCategory, amount: 8200, method: "事業用カード", memo: "長距離営業後給油" },
  { id: "EX-025-02", date: "2026-06-25", category: "洗車代" as ExpenseCategory, amount: 1600, method: "現金", memo: "夜勤前洗車" },
  { id: "EX-026-01", date: "2026-06-26", category: "修理代" as ExpenseCategory, amount: 16800, method: "事業用カード", memo: "タイヤ交換" },
  { id: "EX-026-02", date: "2026-06-26", category: "ガソリン代" as ExpenseCategory, amount: 6000, method: "事業用カード", memo: "通常給油" },
  { id: "EX-027-01", date: "2026-06-27", category: "通信費" as ExpenseCategory, amount: 2000, method: "口座振替", memo: "車載端末通信" },
  { id: "EX-027-02", date: "2026-06-27", category: "ガソリン代" as ExpenseCategory, amount: 9200, method: "事業用カード", memo: "週末営業給油" },
  { id: "EX-030-01", date: "2026-06-30", category: "ガソリン代" as ExpenseCategory, amount: 8200, method: "事業用カード", memo: "夜勤前給油" },
  { id: "EX-030-02", date: "2026-06-30", category: "駐車場代" as ExpenseCategory, amount: 1400, method: "現金", memo: "駅前待機場" }
];

export const csvImports = [
  { fileName: "LT27_20260630_D1024_TAXI27.csv", importedAt: "2026-06-30 22:55", status: "取込済み", records: "F1/F2/F4/F3/FA", sales: dailyReports["2026-06-30"].sales },
  { fileName: "LT27_20260627_D1024_TAXI27.csv", importedAt: "2026-06-27 23:18", status: "取込済み", records: "F1/F2/F4/F3/FA", sales: dailyReports["2026-06-27"].sales },
  { fileName: "LT27_20260626_D1024_TAXI27.csv", importedAt: "2026-06-26 22:14", status: "取込済み", records: "F1/F2/F4/F3/FA", sales: dailyReports["2026-06-26"].sales },
  { fileName: "LT27_20260625_D1024_TAXI27.csv", importedAt: "2026-06-25 23:45", status: "取込済み", records: "F1/F2/F4/F3/FA", sales: dailyReports["2026-06-25"].sales },
  { fileName: "LT27_20260624_D1024_TAXI27.csv", importedAt: "2026-06-24 21:02", status: "取込済み", records: "F1/F2/F4/F3/FA", sales: dailyReports["2026-06-24"].sales },
  { fileName: "LT27_20260629_未取込.csv", importedAt: "-", status: "CSV未取込", records: "-", sales: 0 }
];

export const csvRecordCards = [
  { code: "F1", title: "営業管理データ", detail: "乗務員コード、ジャーナルNo.、営業回数を検出", value: "D-1024 / 27回" },
  { code: "F2", title: "出庫時データ", detail: "カード挿入時刻と出庫指数を検出", value: "07:18 出庫" },
  { code: "F3", title: "入庫時データ", detail: "書込操作時刻と入庫指数を検出", value: "22:42 入庫" },
  { code: "F4", title: "営業時系列データ", detail: "営業開始/終了時刻、運賃、走行情報を検出", value: "27営業" },
  { code: "FA", title: "決済データ", detail: "現金、クレジット、iD、QUICPay、交通系IC等を検出", value: "27件" }
];

export const paymentAggregates: Record<PaymentPeriod, { label: string; range: string; summary: PaymentSummaryItem[] }> = {
  日次: {
    label: "2026年6月30日",
    range: "2026-06-30",
    summary: dailyReports["2026-06-30"].payments
  },
  週次: {
    label: "2026年6月24日 - 6月30日",
    range: "2026-06-24 - 2026-06-30",
    summary: makePayments([
      ["現金", 121320, 47],
      ["クレジット", 82060, 27],
      ["交通系IC", 40400, 20],
      ["iD", 18180, 9],
      ["QUICPay", 15040, 7],
      ["QR決済", 32820, 13],
      ["ネット決済", 23460, 7],
      ["チケット/未収", 9940, 5],
      ["その他", 2200, 4]
    ])
  },
  月次: {
    label: "2026年6月",
    range: "2026-06-01 - 2026-06-30",
    summary: makePayments([
      ["現金", 742400, 306],
      ["クレジット", 426060, 151],
      ["交通系IC", 229700, 128],
      ["iD", 90520, 46],
      ["QUICPay", 76140, 37],
      ["QR決済", 190480, 90],
      ["ネット決済", 108620, 41],
      ["チケット/未収", 34260, 20],
      ["その他", 16080, 10]
    ])
  },
  期間指定: {
    label: "2026年6月24日 - 6月30日",
    range: "2026-06-24 - 2026-06-30",
    summary: makePayments([
      ["現金", 121320, 47],
      ["クレジット", 82060, 27],
      ["交通系IC", 40400, 20],
      ["iD", 18180, 9],
      ["QUICPay", 15040, 7],
      ["QR決済", 32820, 13],
      ["ネット決済", 23460, 7],
      ["チケット/未収", 9940, 5],
      ["その他", 2200, 4]
    ])
  }
};

export const paymentDetails: PaymentDetail[] = [
  { id: "PAY-024-01", period: "週次", usedAt: "2026-06-24 09:52", type: "クレジット", amount: 6240, driverCode: "D-1024", vehicleCode: "TAXI-27", memo: "カード入金確認済み", reconciliationStatus: "突合済み" },
  { id: "PAY-024-02", period: "週次", usedAt: "2026-06-24 12:24", type: "交通系IC", amount: 2380, driverCode: "D-1024", vehicleCode: "TAXI-27", memo: "翌営業日入金予定", reconciliationStatus: "未入金" },
  { id: "PAY-025-01", period: "週次", usedAt: "2026-06-25 08:05", type: "クレジット", amount: 10680, driverCode: "D-1024", vehicleCode: "TAXI-27", memo: "翌営業日入金予定", reconciliationStatus: "未入金" },
  { id: "PAY-025-02", period: "週次", usedAt: "2026-06-25 19:06", type: "QR決済", amount: 7860, driverCode: "D-1024", vehicleCode: "TAXI-27", memo: "手数料差額確認中", reconciliationStatus: "差額あり" },
  { id: "PAY-026-01", period: "週次", usedAt: "2026-06-26 10:55", type: "クレジット", amount: 4620, driverCode: "D-1024", vehicleCode: "TAXI-27", memo: "入金待ち", reconciliationStatus: "未入金" },
  { id: "PAY-027-01", period: "週次", usedAt: "2026-06-27 19:04", type: "QR決済", amount: 7620, driverCode: "D-1024", vehicleCode: "TAXI-27", memo: "QR決済入金確認済み", reconciliationStatus: "突合済み" },
  { id: "PAY-030-01", period: "日次", usedAt: "2026-06-30 08:05", type: "交通系IC", amount: 2420, driverCode: "D-1024", vehicleCode: "TAXI-27", memo: "翌営業日入金予定", reconciliationStatus: "未入金" },
  { id: "PAY-030-02", period: "日次", usedAt: "2026-06-30 08:51", type: "クレジット", amount: 8460, driverCode: "D-1024", vehicleCode: "TAXI-27", memo: "翌営業日入金予定", reconciliationStatus: "未入金" },
  { id: "PAY-030-03", period: "日次", usedAt: "2026-06-30 09:38", type: "現金", amount: 1780, driverCode: "D-1024", vehicleCode: "TAXI-27", memo: "現金受領済み", reconciliationStatus: "突合済み" },
  { id: "PAY-030-04", period: "日次", usedAt: "2026-06-30 10:44", type: "QR決済", amount: 5890, driverCode: "D-1024", vehicleCode: "TAXI-27", memo: "手数料差額確認中", reconciliationStatus: "差額あり" },
  { id: "PAY-030-05", period: "日次", usedAt: "2026-06-30 12:36", type: "iD", amount: 3160, driverCode: "D-1024", vehicleCode: "TAXI-27", memo: "翌営業日入金予定", reconciliationStatus: "未入金" },
  { id: "PAY-030-06", period: "日次", usedAt: "2026-06-30 14:58", type: "ネット決済", amount: 10840, driverCode: "D-1024", vehicleCode: "TAXI-27", memo: "翌営業日入金予定", reconciliationStatus: "未入金" },
  { id: "PAY-030-07", period: "日次", usedAt: "2026-06-30 18:47", type: "QUICPay", amount: 4520, driverCode: "D-1024", vehicleCode: "TAXI-27", memo: "入金待ち", reconciliationStatus: "未入金" },
  { id: "PAY-030-08", period: "日次", usedAt: "2026-06-30 21:34", type: "現金", amount: 5260, driverCode: "D-1024", vehicleCode: "TAXI-27", memo: "現金受領済み", reconciliationStatus: "突合済み" },
  { id: "PAY-M01", period: "月次", usedAt: "2026-06-15 15:30", type: "交通系IC", amount: 3240, driverCode: "D-1024", vehicleCode: "TAXI-27", memo: "交通系IC入金確認済み", reconciliationStatus: "突合済み" },
  { id: "PAY-M02", period: "月次", usedAt: "2026-06-18 20:12", type: "iD", amount: 2860, driverCode: "D-1024", vehicleCode: "TAXI-27", memo: "翌営業日入金予定", reconciliationStatus: "未入金" },
  { id: "PAY-M03", period: "月次", usedAt: "2026-06-22 18:44", type: "現金", amount: 4920, driverCode: "D-1024", vehicleCode: "TAXI-27", memo: "現金受領済み", reconciliationStatus: "突合済み" },
  { id: "PAY-R01", period: "期間指定", usedAt: "2026-06-25 22:05", type: "その他", amount: 400, driverCode: "D-1024", vehicleCode: "TAXI-27", memo: "", reconciliationStatus: "未入金" }
];

export const calendarDays = Array.from({ length: 30 }, (_, index) => {
  const day = index + 1;
  const date = `2026-06-${String(day).padStart(2, "0")}`;
  const report = dailyReports[date];
  const hasCsv = ![2, 9, 16, 23, 29].includes(day);
  const noOperation = [7, 14, 21, 28].includes(day);
  const sales = report?.sales ?? (hasCsv && !noOperation ? 43000 + ((day * 3770) % 34000) : 0);
  const expense = report?.expenses ?? (hasCsv && !noOperation ? 2500 + ((day * 890) % 12000) : 0);
  return {
    day,
    date,
    status: report?.status ?? (noOperation ? "営業なし" : hasCsv ? "取込済み" : "CSV未取込"),
    sales,
    expense,
    profit: sales - expense
  };
});

export const companySettings = {
  companyName: "山田個人タクシー",
  officeCode: "TAXI-001",
  drivers: ["D-1024 山田 太郎（本人）"],
  vehicles: ["TAXI-27 JPN TAXI（事業用車両）"],
  csvRules: ["F1を営業管理として先頭確認", "F2/F3で出入庫時刻を採用", "F4を営業明細として集計", "FAの決済種別コードを種別へマッピング"]
};
