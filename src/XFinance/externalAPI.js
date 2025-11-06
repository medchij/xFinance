import {
  withLoading,
  loadSettings,
  getSettingValue,
  getSettingId,
  normalizeExcelDate,
  formatLargeNumber,
  handleHttpError,
  saveSetting,
} from "./apiHelpers";
import { BASE_URL } from "../config";

// Helper to get company_id from localStorage
import { getSelectedCompany } from "../config/token";


  // Add random background color to data range from Fluent colors
  const fluentColors = [
        "#0078D4", // Accent Blue
        "#107C10", // Accent Green
        "#FF8C00", // Accent Orange
        "#C239B3", // Accent Purple
        "#00B7C3", // Accent Teal
        "#FFB900", // Accent Yellow
        "#0099BC", // Accent Cyan
        "#5C2D91", // Accent Indigo
        "#00BCF2", // Accent Light Blue
        "#498205", // Accent Light Green
        "#FF4343", // Accent Light Red
        "#FF8C00", // Accent Light Orange (duplicate, but ok)
        "#881798", // Accent Magenta
        "#2D7D32", // Accent Dark Green
        "#6B69D6", // Accent Lavender
      ];
const getRandomColor = () => fluentColors[Math.floor(Math.random() * fluentColors.length)];

const getCompanyId = () => {
  const companyId = getSelectedCompany();
  if (!companyId) {
    throw new Error("⚠️ Компани сонгогдоогүй байна. Профайл хуудаснаас сонголт хийнэ үү.");
  }
  return companyId;
};
export async function fetchCurrencyRatesByAPI(setMessage, setLoading) {
  return withLoading(setLoading, setMessage, async function fetchCurrencyRatesByAPI() {
    setMessage("⏳ Ханшийн мэдээлэл татаж байна...");

    const { startDate, endDate } = await Excel.run(async (context) => {
      const range = context.workbook.getActiveCell();
      range.load("values");
      await context.sync();

      let value = range.values[0][0];

      if (!value || (typeof value !== "number" && typeof value !== "string")) {
        throw new Error("📅 Идэвхтэй нүдэнд огноо оруулна уу (2025-01-30 эсвэл Excel огнооны format)");
      }

      if (typeof value === "number") {
        const excelEpoch = new Date(1899, 11, 30); // Excel date base
        const dateObj = new Date(excelEpoch.getTime() + value * 86400000);
        value = dateObj.toISOString().split("T")[0];
      }

      if (typeof value === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new Error("📅 Огнооны формат буруу байна. YYYY-MM-DD хэлбэртэй байвал зохимжтой.");
      }

      return {
        startDate: value,
        endDate: value,
      };
    });

    setMessage(`📅 Огноо: ${startDate} - ${endDate}`);

    const response = await fetch(
      `https://www.mongolbank.mn/mn/currency-rates/data?startDate=${startDate}&endDate=${endDate}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const result = await response.json();

    if (!response.ok) {
      handleHttpError(response, result);
    }

    if (!result || !Array.isArray(result.data)) {
      throw new Error("Буцаж ирсэн дата дотор Array байхгүй байна.");
    }

    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();
      sheet.load("name");
      await context.sync();

      if (sheet.name.toLowerCase() !== "rate") {
        throw new Error("⚠️ Энэ функц зөвхөн 'rate' нэртэй sheet дээр ажиллана.");
      }

      const startCell = context.workbook.getActiveCell();
      startCell.load(["rowIndex", "columnIndex"]);
      await context.sync();

      const row = startCell.rowIndex;
      const col = startCell.columnIndex;

      const dayItem = result.data[0]; // assume one date
      const usdRate = dayItem["USD"];
      const jpyRate = dayItem["JPY"];
      const rateDate = new Date(dayItem["RATE_DATE"]).toISOString().split("T")[0];

      if (!usdRate || !jpyRate || !rateDate) {
        throw new Error("USD эсвэл JPY ханш олдсонгүй.");
      }

      sheet.getCell(row, col + 2).values = "1";
      sheet.getCell(row, col + 3).values = [[usdRate]];
      sheet.getCell(row, col + 4).values = [[jpyRate]];

      await context.sync();
      setMessage(`✅ ${rateDate} өдрийн USD болон JPY ханш амжилттай бичигдлээ.`);
    });
    return { result, response };
  });
}

async function getCarToken(company_id) {
  // company_id-г параметрээр авна
  const response = await fetch("https://service.transdep.mn/autobox-backend/api/v1/user/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const result = await response.json();
  if (!response.ok || !result.token) {
    throw new Error("❌ Token авахад алдаа гарлаа: " + (result.status?.message || "Алдаа гарлаа."));
  }
  return result.token;
}

export async function fetchVehicleInfoByPlate(setMessage, setLoading) {
  return withLoading(setLoading, setMessage, async function fetchVehicleInfoByPlate() {
    setMessage("⏳ Машины мэдээлэл татаж байна...");

    const companyId = getCompanyId(); // localStorage-аас ID авах
    let settings = await loadSettings(companyId); // ID-г дамжуулах
    let car_token = getSettingValue(settings, "car_token");

    const plateNo = await Excel.run(async (context) => {
      const range = context.workbook.getActiveCell();
      range.load("values");
      await context.sync();

      const value = range.values[0][0];
      if (!value || typeof value !== "string") {
        throw new Error("📄 Идэвхтэй нүдэнд машины дугаар бичнэ үү.");
      }
      return value.trim().replace(/-/g, "");
    });

    async function fetchVehicleData(token) {
      const response = await fetch("https://service.transdep.mn/autobox-backend/api/v1/vehicle/data", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plate_no: plateNo }),
      });
      const result = await response.json();
      return { response, result };
    }

    let { response, result } = await fetchVehicleData(car_token);

    if (response.status === 401) {
      car_token = await getCarToken(companyId);
      await saveSetting("car_token", car_token);

      ({ response, result } = await fetchVehicleData(car_token));
    }

    if (!response.ok) {
      handleHttpError(response, result);
    }

    const data = result.data;
    if (!data) {
      throw new Error("⚠️ Машины 'data' мэдээлэл хоосон байна.");
    }

    const fieldsToShow = [
      "cabin_no", "declaration_no", "mark_name", "build_year", "build_month", "imported_date",
      "color_name", "country_name", "model_name", "purpose_name", "fuel_type_eco_class_name",
      "fuel_type_name", "steering_type_name", "vehicle_type_name", "wheel_name",
      "owner.first_name", "owner.register",
    ];

    const popupContent = fieldsToShow
      .map((key) => {
        if (key.includes(".")) {
          const value = key.split(".").reduce((acc, part) => acc?.[part], data);
          return `${key}: ${value ?? ""}`;
        } else {
          return `${key}: ${data[key] ?? ""}`;
        }
      })
      .join("<br>");

    setMessage(`⚠️ Машины мэдээлэл:<br>${popupContent}`);
    return { response, result, data };
  });
}

export async function fetchKhanbankReceiptFromSheet(setMessage, setLoading, { account, fromDate, toDate }) {
  return withLoading(setLoading, setMessage, async function fetchKhanbankReceiptFromSheet() {
    setMessage("⏳ Хуулга татаж байна...");

    const companyId = getCompanyId(); // localStorage-аас ID авах
    const settings = await loadSettings(companyId); // ID-г дамжуулах
    let token = getSettingValue(settings, "access_token");
    const makeRequest = async (currentToken) => {
      const myHeaders = new Headers();
      myHeaders.append("Authorization", `Bearer ${currentToken}`);
      myHeaders.append("Referer", "https://corp.khanbank.com");
      myHeaders.append("Origin", "https://corp.khanbank.com");
      myHeaders.append("Host", "api.khanbank.com:9003");

  const url = `https://api.khanbank.com:9003/v3/omni/accounts/receipt/${account}?transactionDate=%7B%22lt%22:%22${fromDate}T17:42:30%22,%22gt%22:%22${toDate}T09:57:20%22%7D&docType=0&transactionAmount=%7B%22gt%22:%220%22,%22lt%22:%220%22%7D`;

      const response = await fetch(url, {
        method: "GET",
        headers: myHeaders,
        redirect: "follow",
      });
      const result = await response.json();
      return { response, result };
    };

  let { response, result } = await makeRequest(token);
  //console.log("[TEST] fetchKhanbankReceiptFromSheet result:", result); // Тестийн зорилгоор нэмсэн

    if (response.status === 401) {
      const tokenResp = await getKhanbankToken(setMessage, setLoading);
      token = tokenResp.result.access_token;
      ({ response, result } = await makeRequest(token));
    }

    if (!response.ok) {
      handleHttpError(response, result);
    }

    const transactions = result.transactions.map((tx) => ({
      transactionDate: `${tx.transactionDate} ${tx.txnTime || ""}`,
      txnBranchId: tx.txnBranchId,
      beginBalance: tx.beginBalance.amount,
      Debit: tx.amountType.codeDescription === "Debit" ? tx.amount.amount : "",
      Credit: tx.amountType.codeDescription === "Credit" ? tx.amount.amount : "",
      endBalance: tx.endBalance.amount,
      transactionRemarks: tx.transactionRemarks,
      accountId: formatLargeNumber(tx.accountId),
    }));

    // headers, rows-г Excel.run-оос гадна зарлаж, утга онооно
    const headers = [
      "transactionDate",
      "txnBranchId",
      "beginBalance",
      "Debit",
      "Credit",
      "endBalance",
      "transactionRemarks",
      "accountId",
    ];

    const rows = transactions.map((tx) => [
      tx.transactionDate,
      tx.txnBranchId,
      tx.beginBalance,
      tx.Debit,
      tx.Credit,
      tx.endBalance,
      tx.transactionRemarks,
      tx.accountId,
    ]);

    await Excel.run(async (context) => {
      let sheet;
      try {
        sheet = context.workbook.worksheets.getItem("Import");
        sheet.load("name");
        await context.sync();
      } catch (e) {
        // If not found, create it
        sheet = context.workbook.worksheets.add("Import");
        await context.sync();
      }

      const headerRange = sheet.getRange("A8:H8");
      headerRange.values = [headers];

      const dataRange = sheet.getRangeByIndexes(8, 0, rows.length, headers.length);
      dataRange.values = "";
      dataRange.values = rows;
      dataRange.format.font.color = getRandomColor();

      await context.sync();
    });

    setMessage("✅ Хуулга амжилттай татагдаж, Excel-д бичигдлээ.");
    return { headers, rows, result, response };
  });
}

export async function getKhanbankToken(setMessage, setLoading) {
  return withLoading(setLoading, setMessage, async function getKhanbankToken() {
    setMessage("🔐 Access token авч байна...");

    const companyId = getCompanyId(); // localStorage-аас ID авах
    const settings = await loadSettings(companyId); // ID-г дамжуулах
    const requiredSettings = {
      khanbank_username: getSettingValue(settings, "khanbank_username"),
      khanbank_password: getSettingValue(settings, "khanbank_password"),
      device_token: getSettingValue(settings, "device_token"),
      "device-id": getSettingValue(settings, "device-id"),
    };

    const missingOrEmpty = Object.entries(requiredSettings)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missingOrEmpty.length > 0) {
      throw new Error(
        `⚠️ Дараах тохиргоо дутуу байна: ${missingOrEmpty.join(
          ", "
        )}. Профайл хуудаснаас гүйцэт бөглөнө үү.`
      );
    }

    const username = requiredSettings.khanbank_username;
    const password = requiredSettings.khanbank_password;
    const deviceToken = requiredSettings.device_token;
    const deviceId = requiredSettings["device-id"];
    const accessId = getSettingId(settings, "access_token");
    const refreshId = getSettingId(settings, "refresh_token");

    if (!accessId || !refreshId) {
      throw new Error("⚠️ access_token эсвэл refresh_token тохиргоо олдсонгүй. Та програм хөгжүүлэгчид хандана уу.");
    }

    const myHeaders = new Headers();
    myHeaders.append("Origin", "https://corp.khanbank.com");
    myHeaders.append("Referer", "https://corp.khanbank.com/");
    myHeaders.append("Host", "api.khanbank.com:9003");
    myHeaders.append("Authorization", deviceToken);
    myHeaders.append("Device-id", deviceId);
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append(
      "Cookie",
      "__uzma=20418a7f-ce91-e5c8-6225-bc7b412e9039; __uzmb=1747732417; __uzmc=5803638828705; __uzmd=1747962735; __uzme=0783"
    );

    const body = JSON.stringify({
      grant_type: "password",
      username,
      password,
      channelId: "I",
    });

    const response = await fetch("https://api.khanbank.com:9003/v3/auth/token?grant_type=password", {
      method: "POST",
      headers: myHeaders,
      body,
      redirect: "follow",
    });

    const result = await response.json();

    if (!response.ok) {
      handleHttpError(response, result);
    }

    setMessage("✅ Token амжилттай авлаа.");

    await fetch(`${BASE_URL}/api/settings?id=${accessId}&company_id=${companyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: result.access_token }),
    });

    await fetch(`${BASE_URL}/api/settings?id=${refreshId}&company_id=${companyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: result.refresh_token }),
    });

    return { result, response };
  });
}


export async function fetchKhanbankAccountInfo(setMessage, setLoading) {
  return withLoading(setLoading, setMessage, async function fetchKhanbankAccountInfo() {
    setMessage("⏳ Данс лавлаж байна...");

    const companyId = getCompanyId(); // localStorage-аас ID авах
    const settings = await loadSettings(companyId); // ID-г дамжуулах
    let token = getSettingValue(settings, "access_token");

    const { accountNo, activeCellAddress } = await Excel.run(async (context) => {
      const activeCell = context.workbook.getActiveCell();
      activeCell.load("values, address");
      await context.sync();

      const acc = activeCell.values[0][0];
      if (!acc) {
        throw new Error("📌 Идэвхтэй нүдэнд дансны дугаар оруулаагүй байна.");
      }

      return {
        accountNo: acc.toString().trim().replace(/\s/g, ''),
        activeCellAddress: activeCell.address,
      };
    });

    const isIban = /^MN[a-zA-Z0-9]{16,}$/.test(accountNo);
    const apiPath = isIban
      ? `https://api.khanbank.com:9003/v3/omni/accounts/inquiry/${accountNo}`
      : `https://api.khanbank.com:9003/v3/omni/corp/custom/counterparties/accDetails/${accountNo}`;

    const makeRequest = async (access_token) => {
      const headers = new Headers();
      headers.append("Authorization", `Bearer ${access_token}`);
      headers.append("Referer", "https://corp.khanbank.com");
      headers.append("Origin", "https://corp.khanbank.com");
      headers.append("Host", "api.khanbank.com:9003");

      const response = await fetch(apiPath, {
        method: "GET",
        headers,
        redirect: "follow",
      });

      const result = await response.json();
      return { response, result };
    };

    let { response, result } = await makeRequest(token);

    if (response.status === 401) {
      const tokenResp = await getKhanbankToken(setMessage, setLoading);
      token = tokenResp.result.access_token;

      ({ response, result } = await makeRequest(token));
    }

    if (!response.ok) {
      handleHttpError(response, result);
    }

    const accountDetail = isIban ? result?.name || "" : result?.counterpartyName || "";

    await Excel.run(async (context) => {
      const range = context.workbook.getActiveCell();
      const rightCell = range.getOffsetRange(0, 1);
      rightCell.values = [[accountDetail]];
      await context.sync();
    });
    console.log("✅ Дансны мэдээлэл:", result);
    setMessage("✅ Данс лавлагдаж, баруун нүдэнд бичигдлээ.");
    return { result, response, accountDetail, activeCellAddress };
  });
}
