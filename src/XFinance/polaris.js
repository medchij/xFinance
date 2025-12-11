// ✅ Loan Report Processor - Converted from VBA to Office.js (Excel JavaScript API)
// ⚠️ Note: Complex calculations like SUMIFS/COUNTIFS are replaced with manual filtering and aggregation
import { loadSettings, getSettingValue, withLoading, hideEmptyColumns } from "./apiHelpers";
import { lastImportedData } from "./xFinance";
import { BASE_URL } from "../config";
import { getSelectedCompany } from "../config/token";

// Sheet name helper (max 31 chars)
function buildSheetName(prefix) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const ts = `${yyyy}${mm}${dd}_${hh}${mi}${ss}`; // 15 chars
  const raw = `${prefix}_${ts}`;
  return raw.slice(0, 31);
}

// Helper to parse JSON safely and surface HTML/text responses
async function parseJsonSafe(response) {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error(`API JSON parse алдаа (status ${response.status}): ${text.substring(0, 200)}`);
    }
  }

  throw new Error(`API JSON биш хариу ирлээ (status ${response.status}): ${text.substring(0, 200)}`);
}

const getCompanyId = () => {
  const companyId = getSelectedCompany();
  if (!companyId) {
    throw new Error("⚠️ Компани сонгогдоогүй байна. Профайл хуудаснаас сонголт хийнэ үү.");
  }
  return companyId;
};

export function getTermInterval(daysOrMonths) {
  const days = Number(daysOrMonths);
  if (isNaN(days)) return "";

  if (days <= 0) return "Хугацаагүй";
  if (days <= 30) return "1 сар хүртэл хугацаатай";
  if (days <= 90) return "1-3 сар хүртэл хугацаатай";
  if (days <= 180) return "3-6 сар хүртэл хугацаатай";
  if (days <= 365) return "6-12 сар хүртэл хугацаатай";
  if (days <= 1095) return "12-36 сар хүртэл хугацаатай";
  if (days <= 1825) return "36-60 сар хүртэл хугацаатай";
  return "60-с дээш сар хүртэл хугацаатай";
}

export function writeHeaders(sheet, rowIndex, headersArray, startCol = 0) {
  headersArray.forEach((text, idx) => {
    sheet.getCell(rowIndex, startCol + idx).values = [[text]];
  });
}
//Зээлийн баланс тайлан боловсруулалт

export async function runLoanReportProcessor(setMessage, setLoading) {
  return withLoading(setLoading, setMessage, async () => {
    await Excel.run(async (context) => {
      setMessage("⏳ Ажиллаж байна...");

      const sheet = context.workbook.worksheets.getActiveWorksheet();
      const c1Cell = sheet.getCell(0, 2); // C1
      c1Cell.load("values");
      await context.sync();

      const c1Value = c1Cell.values[0][0];
      if (!c1Value || !c1Value.toString().includes("ЗЭЭЛИЙН ҮЛДЭГДЛИЙН ДЭЛГЭРЭНГҮЙ ТАЙЛАН")) {
        throw new Error("⚠️ ⚠️ Энэ хуудас ЗЭЭЛИЙН ҮЛДЭГДЛИЙН ДЭЛГЭРЭНГҮЙ ТАЙЛАН биш байна..");
      }

      const lastRow = await getLastRow(sheet, 0); // A баганын дагуу

      // Толгойн багана бичих
      writeHeaders(
        sheet,
        4,
        [
          "HUGATSAANII INTERVAL",
          "SEGMENT1",
          "ANGILAL1",
          "ANGILAL11",
          "BUTEEGDEHUUN1",
          "HARILTSAGCH1",
          "KHUIS1",
          "NASNII_INTERVAL1",
          "BOLOVSROL1",
          "AX_TEMP", // Давхцаагүйг шалгах түр багана
        ],
        52
      );
      await context.sync();

      const headers = await getHeaderMap(sheet);

      // B3-г урьдчилж татах
      const b3Cell = sheet.getCell(2, 1); // B3
      b3Cell.load("values");
      await context.sync();
      const dateFromCell = new Date(Date.parse(b3Cell.values[0][0].toString().substring(9)));

      // Бүх мөрийг нэг дор татах
      const dataRange = sheet.getRangeByIndexes(5, 0, lastRow - 5, 53);
      dataRange.load("values");
      await context.sync();
      const rows = dataRange.values;

      // Бичих массивууд
      const segData = [],
        angilalData = [],
        angilal11Data = [],
        buteeData = [],
        intervalData = [];
      // VBA-с хөрвүүлсэн шинэ баганын массив
      const hariltsagch1Data = [],
        khuis1Data = [],
        nasniiInterval1Data = [],
        bolovsrol1Data = [],
        axData = [];
      const seenCustomer = new Set();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const segCode = row[headers["СЕГМЕНТ"]]?.toString().substring(0, 2);
        const zoriulalt = row[headers["ЗОРИУЛАЛТ"]]?.toString().substring(0, 2);
        const angilal = row[headers["АНГИЛАЛ"]]
          ?.toString()
          .substring(4)
          .replace(/МУУ|ХЭВИЙН БУС|ЭРГЭЛЗЭЭТЭЙ/g, "ЧАНАРГҮЙ");
        const angilal11 = row[headers["АНГИЛАЛ"]]?.toString().substring(4);
        // --- VBA-с хөрвүүлсэн логик эхлэл ---
        const rd = row[headers["РД"]];
        const axValue = `${angilal}${rd}`;
        axData.push([axValue]);

        let hariltsagch1 = 0;
        if (!seenCustomer.has(axValue)) {
          hariltsagch1 = 1;
          seenCustomer.add(axValue);
        }
        hariltsagch1Data.push([hariltsagch1]);

        const khuis = (row[headers["ХҮЙС"]]?.toString().substring(0, 2) || "").toUpperCase();
        khuis1Data.push([khuis]);

        const nas = Number(row[headers["НАС"]]);
        let nasniiInterval = "";
        if (nas > 17 && nas <= 25) nasniiInterval = "18-25 nasnii";
        else if (nas > 25 && nas <= 35) nasniiInterval = "26-35 nasnii";
        else if (nas > 35 && nas <= 45) nasniiInterval = "36-45 nasnii";
        else if (nas > 45 && nas <= 55) nasniiInterval = "46-55 nasnii";
        else if (nas > 55) nasniiInterval = "55-s deesh";
        nasniiInterval1Data.push([nasniiInterval]);

        let bolovsrol = row[headers["БОЛОВСРОЛ"]]?.toString() || "";
        bolovsrol = bolovsrol
          .replace("БҮРЭН БУС ДУНД", "ДУНД")
          .replace("БҮРЭН ДУНД /11-12 анги/", "БҮРЭН ДУНД")
          .replace("ДУНД БОЛОВСРОЛ /6-8 анги/", "ДУНД")
          .replace("ТУСГАЙ МЭРГЭЖЛИЙН БОЛОВСРОЛ", "ТУСГАЙ ДУНД");
        bolovsrol1Data.push([bolovsrol]);
        // --- VBA-с хөрвүүлсэн логик төгсгөл ---

        let bname = "";
        if (zoriulalt === "06") bname = "Үл хөдлөх хөрөнгө";
        else if (segCode === "81" && zoriulalt === "21") bname = "Хэрэглээний зээл";
        else if (segCode === "81" && zoriulalt === "18") bname = "Бусад";
        else bname = row[headers["БҮТЭЭГДЭХҮҮНИЙ НЭР"]];

        let rawDate = row[headers["ДУУСАХ ОГНОО"]];
        let duusahOgnoo = isNaN(rawDate) ? new Date(Date.parse(rawDate)) : excelDateToJSDate(rawDate);

        const dayDiff = (duusahOgnoo - dateFromCell) / (1000 * 60 * 60 * 24);
        const interval = getTermInterval(dayDiff);

        segData.push([segCode]);
        angilalData.push([angilal]);
        angilal11Data.push([angilal11]);
        buteeData.push([bname]);
        intervalData.push([interval]);
      }

      // Нэг дор бичих
      sheet.getRangeByIndexes(5, headers["SEGMENT1"], rows.length, 1).values = segData;
      sheet.getRangeByIndexes(5, headers["ANGILAL1"], rows.length, 1).values = angilalData;
      sheet.getRangeByIndexes(5, headers["ANGILAL11"], rows.length, 1).values = angilal11Data;
      sheet.getRangeByIndexes(5, headers["BUTEEGDEHUUN1"], rows.length, 1).values = buteeData;
      sheet.getRangeByIndexes(5, headers["HUGATSAANII INTERVAL"], rows.length, 1).values = intervalData;

      // VBA-с хөрвүүлсэн багануудыг бичих
      sheet.getRangeByIndexes(5, headers["HARILTSAGCH1"], rows.length, 1).values = hariltsagch1Data;
      sheet.getRangeByIndexes(5, headers["KHUIS1"], rows.length, 1).values = khuis1Data;
      sheet.getRangeByIndexes(5, headers["NASNII_INTERVAL1"], rows.length, 1).values = nasniiInterval1Data;
      sheet.getRangeByIndexes(5, headers["BOLOVSROL1"], rows.length, 1).values = bolovsrol1Data;
      sheet.getRangeByIndexes(5, headers["AX_TEMP"], rows.length, 1).values = axData; // Түр багана

      await context.sync();

      // Тохиргоотой тооцоололууд
      await calc1(sheet, headers);
      await calc2(sheet, headers);
      await calc3(sheet, headers);
      await calc4(sheet, headers);
      await calc91(sheet, headers);
      await calc1001(sheet, headers);
      await zeeldegchiinTooCalc(sheet, headers); // Шинэ тооцоолол

      setMessage("✅ Loan report pre-calculation complete.");
    });
  });
}

async function calc1(sheet, headers) {
  await performCalculation(sheet, headers, "ЗОРИУЛАЛТ");
}

async function calc1001(sheet, headers) {
  await performCalculation(sheet, headers, "АНГИЛАЛ");
}

async function calc2(sheet, headers) {
  await performCalculation(sheet, headers, "BUTEEGDEHUUN1");
}
async function calc3(sheet, headers) {
  await performCalculation(sheet, headers, "СЕГМЕНТ");
}
async function calc4(sheet, headers) {
  await performCalculation(sheet, headers, "HUGATSAANII INTERVAL");
}
async function calc91(sheet, headers) {
  await performCalculation(sheet, headers, "МАШИН", false);
}

async function zeeldegchiinTooCalc(sheet, headers) {
  const usedRange = sheet.getUsedRange();
  usedRange.load("values");
  await sheet.context.sync();
  const data = usedRange.values;

  const uldegdelCol = headers["ҮНДСЭН ЗЭЭЛ"];
  const angilalCol = headers["ANGILAL11"];
  const hariltsagchCol = headers["HARILTSAGCH1"];
  const khuisCol = headers["KHUIS1"];
  const nasIntervalCol = headers["NASNII_INTERVAL1"];
  const bolovsrolCol = headers["BOLOVSROL1"];

  const sumIfs = (conditions) => {
    let sumUldegdel = 0;
    let sumHariltsagch = 0;
    const filteredData = data.slice(5).filter((row) => {
      return conditions.every((cond) => {
        const [col, value] = cond;
        return row[col] === value;
      });
    });

    filteredData.forEach((row) => {
      sumUldegdel += Number(row[uldegdelCol]) || 0;
      sumHariltsagch += Number(row[hariltsagchCol]) || 0;
    });
    return [sumUldegdel, sumHariltsagch];
  };

  const lastRowBK = await getLastRow(sheet, 81); // BK is col 63 (0-indexed 62)
  const startRow = lastRowBK + 2;

  // Ангилалаар нэгтгэх
  const angilalCategories = ["ХЭВИЙН", "ХУГАЦАА ХЭТЭРСЭН", "ЧАНАРГҮЙ", "ХЭВИЙН БУС", "ЭРГЭЛЗЭЭТЭЙ", "МУУ"];
  const results = [];
  for (let i = 0; i < angilalCategories.length; i++) {
    const category = angilalCategories[i];
    const [totalUldegdel, totalHariltsagch] = sumIfs([[angilalCol, category]]);
    const [erUldegdel, erHariltsagch] = sumIfs([
      [angilalCol, category],
      [khuisCol, "ЭР"],
    ]);
    const [emUldegdel, emHariltsagch] = sumIfs([
      [angilalCol, category],
      [khuisCol, "ЭМ"],
    ]);
    const [huuliUldegdel, huuliHariltsagch] = sumIfs([
      [angilalCol, category],
      [khuisCol, "-"],
    ]);
    results.push([
      category,
      totalUldegdel,
      totalHariltsagch,
      erUldegdel,
      erHariltsagch,
      emUldegdel,
      emHariltsagch,
      huuliUldegdel,
      huuliHariltsagch,
    ]);
  }

  // "ЧАНАРГҮЙ" мөрийг дараагийн 3 мөрийн нийлбэрээр шинэчлэх
  const chanarguiIdx = results.findIndex((r) => r[0] === "ЧАНАРГҮЙ");
  if (chanarguiIdx !== -1 && chanarguiIdx + 3 < results.length) {
    for (let j = 1; j < results[chanarguiIdx].length; j++) {
      results[chanarguiIdx][j] =
        results[chanarguiIdx + 1][j] + results[chanarguiIdx + 2][j] + results[chanarguiIdx + 3][j];
    }
  }

  // Насны ангилалаар нэгтгэх
  const nasCategories = ["18-25 nasnii", "26-35 nasnii", "36-45 nasnii", "46-55 nasnii", "55-s deesh"];
  const nasResults = [];
  for (const category of nasCategories) {
    const [totalUldegdel, totalHariltsagch] = sumIfs([[nasIntervalCol, category]]);
    const [erUldegdel, erHariltsagch] = sumIfs([
      [nasIntervalCol, category],
      [khuisCol, "ЭР"],
    ]);
    const [emUldegdel, emHariltsagch] = sumIfs([
      [nasIntervalCol, category],
      [khuisCol, "ЭМ"],
    ]);
    nasResults.push([
      category,
      totalUldegdel,
      totalHariltsagch,
      erUldegdel,
      erHariltsagch,
      emUldegdel,
      emHariltsagch,
      null,
      null,
    ]);
  }

  // Боловсролоор нэгтгэх
  const bolovsrolCategories = ["ДЭЭД", "ТУСГАЙ ДУНД", "БҮРЭН ДУНД", "ДУНД", "БАГА"];
  const bolovsrolResults = [];
  for (const category of bolovsrolCategories) {
    const [totalUldegdel, totalHariltsagch] = sumIfs([[bolovsrolCol, category]]);
    const [erUldegdel, erHariltsagch] = sumIfs([
      [bolovsrolCol, category],
      [khuisCol, "ЭР"],
    ]);
    const [emUldegdel, emHariltsagch] = sumIfs([
      [bolovsrolCol, category],
      [khuisCol, "ЭМ"],
    ]);
    bolovsrolResults.push([
      category,
      totalUldegdel,
      totalHariltsagch,
      erUldegdel,
      erHariltsagch,
      emUldegdel,
      emHariltsagch,
      null,
      null,
    ]);
  }

  // Excel-д бичих
  const headerRow1 = sheet.getRangeByIndexes(0, 81, 1, 8); // BL1:BS1
  headerRow1.values = [["НИЙТ", "", "ЭР", "", "ЭМ", "", "ХУУЛИЙН ЭТГЭЭД", ""]];
  const headerRow2 = sheet.getRangeByIndexes(1, 81, 1, 10); // BL2:BU2
  headerRow2.values = [["ДҮН", "ТОО", "ДҮН", "ТОО", "ДҮН", "ТОО", "ДҮН", "ТОО", "ДҮН", "ТОО"]];

  sheet.getRangeByIndexes(startRow + 1, 80, results.length, results[0].length).values = results;
  sheet.getRangeByIndexes(startRow + results.length + 3, 80, nasResults.length, nasResults[0].length).values =
    nasResults;
  sheet.getRangeByIndexes(
    startRow + results.length + nasResults.length + 6,
    80,
    bolovsrolResults.length,
    bolovsrolResults[0].length
  ).values = bolovsrolResults;

  await sheet.context.sync();
}

//Зээлийн баланс тайлан тооцоололт
async function performCalculation(sheet, headers, keyField) {
  const usedRange = sheet.getUsedRange();
  usedRange.load("values");
  await sheet.context.sync();

  const data = usedRange.values;
  const zorValues = [
    ...new Set(
      data
        .slice(5)
        .map((row) => row[headers[keyField]])
        .filter(Boolean)
    ),
  ];

  const headerLabels = [
    "81",
    "МӨНГӨН ДҮН",
    "TOO",
    "ХЭВИЙН",
    "ХУГАЦАА ХЭТЭРСЭН",
    "ЧАНАРГҮЙ",
    "ДЭЭД ХҮҮ",
    "ДООД ХҮҮ",
    "<>81",
    "МӨНГӨН ДҮН",
    "TOO",
    "ХЭВИЙН",
    "ХУГАЦАА ХЭТЭРСЭН",
    "ЧАНАРГҮЙ",
    "ДЭЭД ХҮҮ",
    "ДООД ХҮҮ",
  ];

  const headerStartCol = 63; // BL = 63
  headerLabels.forEach((label, idx) => (sheet.getCell(0, headerStartCol + idx).values = [[label]]));

  const BB = await getLastRow(sheet, 63);

  const calculate = (zor, seg, not = false) => {
    const filtered = data.filter((row) => {
      const segment = (row[headers["SEGMENT1"]] || "").toString().trim();
      const zorVal = row[headers[keyField]];
      return zorVal === zor && (not ? segment !== seg : segment === seg);
    });

    const angilalSum = (val) =>
      filtered
        .filter((r) => (r[headers["ANGILAL1"]] || "").toString().trim() === val)
        .reduce((s, r) => s + (+r[headers["ҮНДСЭН ЗЭЭЛ"]] || 0), 0);

    const zeel = filtered.reduce((s, r) => s + (+r[headers["ҮНДСЭН ЗЭЭЛ"]] || 0), 0);
    const huu = filtered.map((r) => +r[headers["ХҮҮНИЙ ХУВЬ"]]).filter((n) => !isNaN(n));
    // const uniqueRDCount = new Set(filtered.map((r) => r[headers["РД"]]).filter(Boolean)).size;
    const uniqueRDCount = new Set(
      filtered.map((r) => r[keyField === "АНГИЛАЛ" ? headers["ДАНСНЫ ДУГААР"] : headers["РД"]]).filter(Boolean)
    ).size;

    return [
      zeel,
      uniqueRDCount,
      angilalSum("ХЭВИЙН"),
      angilalSum("ХУГАЦАА ХЭТЭРСЭН"),
      angilalSum("ЧАНАРГҮЙ"),
      huu.length ? Math.max(...huu) / 1200 : "",
      huu.length ? Math.min(...huu) / 1200 : "",
    ];
  };

  zorValues.forEach((zor, index) => {
    const i = BB + index;
    sheet.getCell(i, 63).values = [[zor]];
    const values = [...calculate(zor, "81"), "", ...calculate(zor, "81", true)];
    values.forEach((val, j) => (sheet.getCell(i, 64 + j).values = [[val]]));
  });

  await sheet.context.sync();
}
// Зээл олголтын тайлан тооцоололт

export async function processLoanPrepData(setMessage, setLoading) {
  return withLoading(setLoading, setMessage, async () => {
    await Excel.run(async (context) => {
      setMessage("⏳ Ажиллаж байна...");
      const sheet = context.workbook.worksheets.getActiveWorksheet();
      await unmergeAllCells(sheet);

      const a2Cell = sheet.getCell(1, 0); // A2
      a2Cell.load("values");
      await context.sync();

      const a2Value = a2Cell.values[0][0];
      if (!a2Value || !a2Value.toString().includes("Олгосон зээлийн тайлан")) {
        throw new Error("⚠️ Энэ хуудас олгосон зээлийн тайлан биш байна.");
      }

      const headerSourceRange = sheet.getRange("A5:Y7");
      headerSourceRange.load("values");
      await context.sync();

      const row5 = headerSourceRange.values[0];
      const row6 = headerSourceRange.values[1];
      const row7 = headerSourceRange.values[2];

      const headerLabels = [];
      for (let i = 0; i < row5.length; i++) {
        const h5 = (row5[i] || "").toString().trim().toUpperCase();
        const h6 = (row6[i] || "").toString().trim().toUpperCase();
        const h7 = (row7[i] || "").toString().trim().toUpperCase();
        headerLabels.push(h5 || h6 || h7);
      }

      // Хүсэлтийн дагуу шинэ багануудыг нэмэх
      headerLabels.push("BUTEEGDEHUUNII_NER", "BUTEEGDEHUUN1", "JDH_DUN", "HUGATSAANII INTERVAL", "SEGMENT1");

      for (let col = 0; col < headerLabels.length + 2; col++) {
        sheet.getCell(4, col).values = [[headerLabels[col]]];
      }
      await context.sync();

      const headers = await getHeaderMap(sheet);
      const usedRange = sheet.getUsedRange();
      usedRange.load("values");
      await context.sync();

      const data = usedRange.values;
      const toogooIdx = headers["ТӨГРӨГ"]; //Олгосон дүн
      const dateIdx = headers["ЗЭЭЛ ОЛГОСОН ОГНОО"];
      const buteegdehuunIdx = headers["BUTEEGDEHUUN1"];
      const buteegdehuunnii1Idx = headers["BUTEEGDEHUUNII_NER"];
      const zoriulaltIdx = headers["ЗОРИУЛАЛТ"];
      const huuIdx = headers["ХҮҮ"];
      const regIdx = headers["РЕГИСТЕР"];
      const sarIdx = headers["ХУГАЦАА (САРААР)"]; //Зээлийн хугацаа

      for (let i = 5; i < data.length; i++) {
        // Тухайн мөрийн мэдээллийг авна
        const row = data[i];

        // 1. "Бүтээгдэхүүний нэр" баганын зүүн талын нүдний утгыг авна (buteegdehuunnii1Idx - 1)
        const valT = row[buteegdehuunnii1Idx - 5];

        // 2. Дээд мөрний "Бүтээгдэхүүний нэр" баганын утгыг авна
        const valUprev = data[i - 1]?.[buteegdehuunnii1Idx];

        // 3. Дээд мөрний D баганын (индекс 3) утгыг авна
        const valDprev = data[i - 1]?.[3];

        // 4. "Бүтээгдэхүүний нэр" баганын одоогийн мөрний утгыг шинэчилнэ
        row[buteegdehuunnii1Idx] =
          valT === "" || valT === undefined ? "" : valUprev === "" || valUprev === undefined ? valDprev : valUprev;

        const zeel = parseFloat(row[toogooIdx]) || 0;
        const huu = parseFloat(row[huuIdx]) || 0;
        row[headers["JDH_DUN"]] = (zeel * huu) / 100;

        const sar = parseFloat(row[sarIdx]);
        if (!isNaN(sar)) {
          row[headers["HUGATSAANII INTERVAL"]] =
            sar <= 1
              ? "1 сар хүртэл хугацаатай"
              : sar <= 3
                ? "1-3 сар хүртэл хугацаатай"
                : sar <= 6
                  ? "3-6 сар хүртэл хугацаатай"
                  : sar <= 12
                    ? "6-12 сар хүртэл хугацаатай"
                    : sar <= 30
                      ? "12-30 сар хүртэл хугацаатай"
                      : sar <= 60
                        ? "30-60 сар хүртэл хугацаатай"
                        : "60-с дээш сар хүртэл хугацаатай";
        }

        if (row[regIdx] && row[regIdx].toString().length === 10) {
          row[headers["SEGMENT1"]] = "81";
        }

        const zor = (row[zoriulaltIdx] || "").toString();
        const seg = (row[headers["SEGMENT1"]] || "").toString();
        let baseName = (row[buteegdehuunnii1Idx] || "").toString();
        baseName = baseName.includes("-") ? baseName.split("-")[1].trim() : baseName.trim();

        if (zor.startsWith("06")) row[buteegdehuunIdx] = "ҮЛ ХӨДЛӨХ ХӨРӨНГӨ";
        else if (seg === "81" && zor.startsWith("21")) row[buteegdehuunIdx] = "ХЭРЭГЛЭЭНИЙ ЗЭЭЛ";
        else if (seg === "81" && zor.startsWith("18")) row[buteegdehuunIdx] = "БУСАД";
        else row[buteegdehuunIdx] = baseName;
      }

      for (let i = 5; i < data.length; i++) {
        const row = data[i];
        ["BUTEEGDEHUUNII_NER", "BUTEEGDEHUUN1", "ЗОРИУЛАЛТ", "JDH_DUN", "HUGATSAANII INTERVAL", "SEGMENT1"].forEach(
          (key) => {
            if (row[headers[key]]) {
              sheet.getCell(i, headers[key]).values = [[row[headers[key]]]];
            }
          }
        );
      }

      await calc6(sheet, headers);
      await calc7(sheet, headers);
      await calc8(sheet, headers);
      await calc90(sheet, headers);
    });

    await hideEmptyColumns(setMessage); // 🟢 context-г давхар ашигладаг тул гадуур await хийх хэрэгтэй

    setMessage("✅ BL1-ийг шалгах Зээл олголт complete.");
  });
}

async function calc6(sheet, headers) {
  await summarizeGrantData(sheet, headers, "ЗОРИУЛАЛТ", true);
}

async function calc7(sheet, headers) {
  await summarizeGrantData(sheet, headers, "BUTEEGDEHUUN1", true);
}

async function calc8(sheet, headers) {
  await summarizeGrantData(sheet, headers, "HUGATSAANII INTERVAL", false);
}

async function calc90(sheet, headers) {
  await summarizeGrantData(sheet, headers, "МАШИН", false);
}
async function summarizeGrantData(sheet, headers, categoryField, useSegment = true) {
  const usedRange = sheet.getUsedRange();
  usedRange.load("values");
  await sheet.context.sync();

  const data = usedRange.values;
  const categoryValues = [
    ...new Set(
      data
        .slice(5)
        .map((row) => row[headers[categoryField]])
        .filter(Boolean)
    ),
  ];

  const headerLabels = [
    "81",
    "МӨНГӨН ДҮН",
    "TOO",
    "ЖДХ",
    "ДЭЭД ХҮҮ",
    "ДООД ХҮҮ",
    "<>81",
    "МӨНГӨН ДҮН",
    "TOO",
    "ЖДХ",
    "ДЭЭД ХҮҮ",
    "ДООД ХҮҮ",
  ];

  const headerStartCol = 63; // BL = 63
  headerLabels.forEach((label, idx) => (sheet.getCell(0, headerStartCol + idx).values = [[label]]));

  const startRow = await getLastRow(sheet, 63);

  const calculateSegmentStats = (value, segmentCode, exclude = false) => {
    const filtered = data.filter((row) => {
      const category = row[headers[categoryField]];
      if (!useSegment) return category === value;

      const segment = (row[headers["SEGMENT1"]] || "").toString().trim();
      return category === value && (exclude ? segment !== segmentCode : segment === segmentCode);
    });

    const totalAmount = filtered.reduce((sum, row) => sum + (+row[headers["ТӨГРӨГ"]] || 0), 0); //Олгосон дүн
    const totalInterest = filtered.reduce((sum, row) => sum + (+row[headers["JDH_DUN"]] || 0), 0);
    const interestRates = filtered.map((row) => +row[headers["ХҮҮ"]]).filter((n) => !isNaN(n));
    const uniqueRegisterCount = new Set(filtered.map((row) => row[headers["РЕГИСТЕР"]]).filter(Boolean)).size;

    return [
      totalAmount,
      uniqueRegisterCount,
      totalAmount > 0 ? totalInterest / totalAmount / 12 : 0,
      interestRates.length ? Math.max(...interestRates) / 1200 : "",
      interestRates.length ? Math.min(...interestRates) / 1200 : "",
    ];
  };

  categoryValues.forEach((value, index) => {
    const currentRow = startRow + index;
    sheet.getCell(currentRow, 63).values = [[value]];
    const values = useSegment
      ? [...calculateSegmentStats(value, "81"), "", ...calculateSegmentStats(value, "81", true)]
      : [...calculateSegmentStats(value)];
    values.forEach((val, colOffset) => (sheet.getCell(currentRow, 64 + colOffset).values = [[val]]));
  });

  await sheet.context.sync();
}
// Зээл төлөлтийн тайлан
export async function loanpaymentData(setMessage, setLoading) {
  return withLoading(setLoading, setMessage, async () => {
    await Excel.run(async (context) => {
      setMessage("⏳ Ажиллаж байна...");
      const sheet = context.workbook.worksheets.getActiveWorksheet();

      const a2Cell = sheet.getCell(0, 0); // A2
      a2Cell.load("values");
      await context.sync();

      const a2Value = a2Cell.values[0][0];
      if (!a2Value || !a2Value.toString().includes("Гэгээн инвест")) {
        throw new Error("⚠️ Энэ хуудас төлөгдсөн зээлийн тайлан биш байна.");
      }

      await unmergeAllCells(sheet); // Merge арилгах

      // 5, 6, 7-р мөрнөөс толгой мэдээллийг унших
      const headerSourceRange = sheet.getRange("A5:Y7");
      headerSourceRange.load("values");
      await context.sync();

      const row5 = headerSourceRange.values[0];
      const row6 = headerSourceRange.values[1];
      const row7 = headerSourceRange.values[2];

      const headerLabels = [];
      for (let i = 0; i < row5.length; i++) {
        const h5 = (row5[i] || "").toString().trim().toUpperCase();
        const h6 = (row6[i] || "").toString().trim().toUpperCase();
        const h7 = (row7[i] || "").toString().trim().toUpperCase();
        headerLabels.push(h5 || h6 || h7);
      }

      // Хүсэлтийн дагуу шинэ багануудыг нэмэх
      headerLabels.push("BUTEEGDEHUUN1", "HUGATSAANII INTERVAL", "ЗОРИУЛАЛТ");

      for (let col = 0; col < headerLabels.length; col++) {
        sheet.getCell(4, col).values = [[headerLabels[col]]];
      }
      await context.sync();

      const headers = await getHeaderMap(sheet);
      const usedRange = sheet.getUsedRange();
      usedRange.load("values");
      await context.sync();
      const data = usedRange.values;

      const buteegdehuunIdx = headers["BUTEEGDEHUUN1"];
      const buteegdehuunnii1Idx = headers["БҮТЭЭГДЭХҮҮН"];
      const zoriulaltIdx = headers["ЗОРИУЛАЛТ"];
      const sarIdx = headers["ЗЭЭЛИЙН ХУГАЦАА"];

      for (let i = 5; i < data.length; i++) {
        const row = data[i];

        // const valT = row[buteegdehuunnii1Idx - 1];
        // const valUprev = data[i - 1]?.[buteegdehuunnii1Idx];
        // const valDprev = data[i - 1]?.[1];
        // row[buteegdehuunnii1Idx] =
        //   valT === "" || valT === undefined ? "" : valUprev === "" || valUprev === undefined ? valDprev : valUprev;

        const sar = parseFloat(row[sarIdx]);
        if (!isNaN(sar)) {
          row[headers["HUGATSAANII INTERVAL"]] =
            sar <= 1
              ? "1 сар хүртэл хугацаатай"
              : sar <= 3
                ? "1-3 сар хүртэл хугацаатай"
                : sar <= 6
                  ? "3-6 сар хүртэл хугацаатай"
                  : sar <= 12
                    ? "6-12 сар хүртэл хугацаатай"
                    : sar <= 30
                      ? "12-30 сар хүртэл хугацаатай"
                      : sar <= 60
                        ? "30-60 сар хүртэл хугацаатай"
                        : "60-с дээш сар хүртэл хугацаатай";
        }

        const zor = (row[zoriulaltIdx] || "").toString();
        const seg = (row[headers["СЕГМЕНТ"]] || "").toString();
        let baseName = (row[buteegdehuunnii1Idx] || "").toString();
        baseName = baseName.includes("-") ? baseName.split("-")[1].trim() : baseName.trim();

        if (zor.startsWith("06")) row[buteegdehuunIdx] = "ҮЛ ХӨДЛӨХ ХӨРӨНГӨ";
        else if (seg === "81" && zor.startsWith("21")) row[buteegdehuunIdx] = "ХЭРЭГЛЭЭНИЙ ЗЭЭЛ";
        else if (seg === "81" && zor.startsWith("18")) row[buteegdehuunIdx] = "БУСАД";
        else row[buteegdehuunIdx] = baseName;
      }

      for (let i = 5; i < data.length; i++) {
        const row = data[i];
        ["BUTEEGDEHUUN1", "ЗОРИУЛАЛТ", "HUGATSAANII INTERVAL"].forEach((key) => {
          if (row[headers[key]]) {
            sheet.getCell(i, headers[key]).values = [[row[headers[key]]]];
          }
        });
      }

      await calc11(sheet, headers);
      await calc12(sheet, headers);
      await calc13(sheet, headers);
      await calc92(sheet, headers);

      await hideEmptyColumns(setMessage);

      setMessage("✅ BL1-ийг шалгах Зээл төлөлт complete.");
    });
  });
}

async function calc11(sheet, headers) {
  await summarizePaymentData(sheet, headers, "ЗОРИУЛАЛТ", true);
}

async function calc12(sheet, headers) {
  await summarizePaymentData(sheet, headers, "BUTEEGDEHUUN1", true);
}

async function calc13(sheet, headers) {
  await summarizePaymentData(sheet, headers, "HUGATSAANII INTERVAL", false);
}
async function calc92(sheet, headers) {
  await summarizePaymentData(sheet, headers, "МАШИН", true);
}
async function summarizePaymentData(sheet, headers, categoryField, useSegment = true) {
  const usedRange = sheet.getUsedRange();
  usedRange.load("values");
  await sheet.context.sync();

  const data = usedRange.values;
  const categoryValues = [
    ...new Set(
      data
        .slice(5)
        .map((row) => row[headers[categoryField]])
        .filter(Boolean)
    ),
  ];

  const headerLabels = ["81", "МӨНГӨН ДҮН", "TOO", "<>81", "МӨНГӨН ДҮН", "TOO"];

  const headerStartCol = 63; // BL = 63
  headerLabels.forEach((label, idx) => (sheet.getCell(0, headerStartCol + idx).values = [[label]]));

  const startRow = await getLastRow(sheet, 63);

  const calculateSegmentStats = (value, segmentCode, exclude = false) => {
    const filtered = data.filter((row) => {
      const category = row[headers[categoryField]];
      if (!useSegment) return category === value;

      const segment = (row[headers["СЕГМЕНТ"]] || "").toString().trim();
      return category === value && (exclude ? segment !== segmentCode : segment === segmentCode);
    });

    const totalAmount = filtered.reduce((sum, row) => sum + (+row[headers["ЗЭЭЛ"]] || 0), 0);
    const uniqueRegisterCount = new Set(filtered.map((row) => row[headers["ДАНС"]]).filter(Boolean)).size;

    return [totalAmount, uniqueRegisterCount];
  };

  categoryValues.forEach((value, index) => {
    const currentRow = startRow + index;
    sheet.getCell(currentRow, 63).values = [[value]];
    const values = useSegment
      ? [...calculateSegmentStats(value, "81"), "", ...calculateSegmentStats(value, "81", true)]
      : [...calculateSegmentStats(value)];
    values.forEach((val, colOffset) => (sheet.getCell(currentRow, 64 + colOffset).values = [[val]]));
  });

  await sheet.context.sync();
}

export async function processTop40LoanReport(setMessage, setLoading) {
  return withLoading(setLoading, setMessage, async () => {
    await Excel.run(async (context) => {
      setMessage("⏳ Топ 40 зээлдэгчийн тайлан боловсруулж байна...");

      const originalSheet = context.workbook.worksheets.getActiveWorksheet();
      const c1Cell = originalSheet.getCell(0, 2); // C1
      c1Cell.load("values");
      await context.sync();

      const c1Value = c1Cell.values[0][0];
      if (!c1Value || !c1Value.toString().includes("ЗЭЭЛИЙН ҮЛДЭГДЛИЙН ДЭЛГЭРЭНГҮЙ ТАЙЛАН")) {
        throw new Error("⚠️ Энэ хуудас ЗЭЭЛИЙН ҮЛДЭГДЛИЙН ДЭЛГЭРЭНГҮЙ ТАЙЛАН биш байна.");
      }

      // 1. Calculate SUMIFS and RANK in memory
      setMessage("⏳ Зээлдэгчдийн нийт үлдэгдлийг тооцоолж байна...");
      const headers = await getHeaderMap(originalSheet);
      const lastDataRow = await getLastRow(originalSheet, headers["ДАНСНЫ ДУГААР"]);
      const dataRange = originalSheet.getRangeByIndexes(5, 0, lastDataRow - 5, Math.max(...Object.values(headers)) + 1);
      dataRange.load("values");
      await context.sync();
      const data = dataRange.values;

      const uldegdelCol = headers["ҮНДСЭН ЗЭЭЛ"];
      const rdCol = headers["РД"]; // VBA-д L багана буюу РД байсан

      if (uldegdelCol === undefined || rdCol === undefined) {
        throw new Error("⚠️ 'ҮНДСЭН ЗЭЭЛ' эсвэл 'РД' багана олдсонгүй.");
      }

      const customerTotals = new Map();
      data.forEach((row) => {
        const rd = row[rdCol];
        const uldegdel = parseFloat(row[uldegdelCol]) || 0;
        if (rd) {
          customerTotals.set(rd, (customerTotals.get(rd) || 0) + uldegdel);
        }
      });

      const sortedTotals = [...customerTotals.values()].sort((a, b) => b - a);
      const rankMap = new Map(sortedTotals.map((total, i) => [total, i + 1]));

      const bcValues = [];
      const bdValues = [];
      data.forEach((row) => {
        const rd = row[rdCol];
        const total = customerTotals.get(rd) || 0;
        const rank = rankMap.get(total) || 0;
        bcValues.push([total]);
        bdValues.push([rank]);
      });

      // 2. Copy sheet
      setMessage("⏳ Тайлангийн хуудсыг хувилж байна...");
      const newSheet = originalSheet.copy(Excel.WorksheetPositionType.after, originalSheet);
      newSheet.activate();
      await context.sync();

      // 3. Write calculations to the new sheet
      newSheet.getRangeByIndexes(5, 54, bcValues.length, 1).values = bcValues; // BC column
      newSheet.getRangeByIndexes(5, 55, bdValues.length, 1).values = bdValues; // BD column
      await context.sync();

      // 4. Delete rows where rank > 40
      setMessage("⏳ Топ 40-с бусад зээлдэгчийг устгаж байна...");
      const rankRange = newSheet.getRangeByIndexes(5, 55, lastDataRow - 5, 1);
      rankRange.load("values");
      await context.sync();

      const rowsToDelete = [];
      for (let i = rankRange.values.length - 1; i >= 0; i--) {
        if (rankRange.values[i][0] > 40) {
          // Using getOffsetRange to delete the entire row. Address is relative to the range.
          newSheet
            .getRangeByIndexes(i + 5, 0, 1, 1)
            .getEntireRow()
            .delete(Excel.DeleteShiftDirection.up);
        }
      }
      await context.sync();

      // 5. Delete unnecessary columns
      setMessage("⏳ Илүүдэл багануудыг устгаж байна...");

      const columnsToKeep = [
        "ДАНСНЫ ДУГААР",
        "ВАЛЮТ",
        "ОЛГОСОН ОГНОО",
        "ДУУСАХ ОГНОО",
        "ХАРИЛЦАГЧ",
        "РД",
        "УТАС1",
        "АЖИЛ ЭРХЛЭЛТ",
        "АНГИЛАЛ",
        "ОЛГОСОН ДҮН",
        "ЗОРИУЛАЛТ",
        "ҮНДСЭН ЗЭЭЛ",
        "ХҮҮНИЙ ХУВЬ",
        "БАРЬЦАА ХӨРӨНГИЙН НИЙТ ДҮН",
        "БАРЬЦАА ХӨРӨНГИЙН ТӨРӨЛ",
      ];

      const newSheetHeadersRange = newSheet.getRange("A5:ZZ5");
      newSheetHeadersRange.load("values, columnCount");
      await context.sync();

      const newSheetHeaders = newSheetHeadersRange.values[0];
      const columnsToDelete = [];

      for (let i = newSheetHeaders.length - 1; i >= 0; i--) {
        const header = newSheetHeaders[i];
        if (header && !columnsToKeep.includes(header.toString().trim())) {
          columnsToDelete.push(i);
        }
      }

      // Delete columns from right to left to avoid shifting issues
      for (const colIndex of columnsToDelete) {
        newSheet.getRangeByIndexes(0, colIndex, 1, 1).getEntireColumn().delete(Excel.DeleteShiftDirection.left);
      }
      await context.sync();

      // 6. Data transformation (CurrencyChange, angilalChange etc.)
      // These functions are not defined in the provided JS code.
      // Placeholder for future implementation.
      setMessage("ℹ️ Мэдээллийн хөрвүүлэлт (алгасагдлаа, функц тодорхойгүй).");

      // 7. Sort data by column X (which will be a new column after deletions)
      setMessage("⏳ Мэдээллийг эрэмбэлж байна...");
      const finalUsedRange = newSheet.getUsedRange();
      // Assuming the sort key is now in column "I" after deletions (originally "X")
      const sortRange = newSheet.getRange("I5");
      finalUsedRange.sort.apply(
        [
          {
            key: sortRange.getColumnIndex(),
            ascending: true,
          },
        ],
        true
      );
      await context.sync();

      setMessage("✅ Топ 40 зээлдэгчийн тайлан амжилттай боловсруулагдлаа.");
    });
  });
}

//зээлийн зорилго, хугацааг импортын хуудаснаас идэвхтэй хуудас руу хуулж оруулах функц
export async function extractLoanPurposeAndTerm(setMessage) {
  try {
    await Excel.run(async (context) => {
      const activeSheet = context.workbook.worksheets.getActiveWorksheet();
      const importSheet = context.workbook.worksheets.getItemOrNullObject("Import");
      await context.sync();

      if (importSheet.isNullObject) {
        setMessage("❌ 'Import Sheet' нэртэй worksheet олдсонгүй.");
        return;
      }
      await copyTop9IfClosedLoan(importSheet, setMessage);
      const importHeaders = await getHeaderMap(importSheet);
      const activeHeaders = await getHeaderMap(activeSheet);

      const importAccountIndex = importHeaders["ДАНСНЫ ДУГААР"];
      const purposeIndex = importHeaders["ЗОРИУЛАЛТ"];
      const activeAccountIndex = activeHeaders["ДАНС"];
      const activePurposeIndex = activeHeaders["ЗОРИУЛАЛТ"];

      if ([importAccountIndex, purposeIndex, activeAccountIndex, activePurposeIndex].includes(undefined)) {
        setMessage("⚠️ Шаардлагатай баганууд олдсонгүй (ДАНСНЫ ДУГААР, ЗОРИУЛАЛТ).");
        return;
      }

      const importRange = importSheet.getUsedRange();
      importRange.load("rowCount, values");
      const activeRange = activeSheet.getUsedRange();
      activeRange.load("rowCount, values");
      await context.sync();

      const importData = importRange.values.slice(5);
      const activeData = activeRange.values.slice(5);

      const loanMap = new Map();
      importData.forEach((row) => {
        const acc = row[importAccountIndex];
        if (acc) {
          loanMap.set(acc.toString().trim(), {
            purpose: row[purposeIndex],
          });
        }
      });

      let updatedCount = 0;
      activeData.forEach((row, i) => {
        const acc = row[activeAccountIndex];
        if (acc && loanMap.has(acc.toString().trim())) {
          const { purpose } = loanMap.get(acc.toString().trim());
          activeSheet.getCell(i + 5, activePurposeIndex).values = [[purpose]];
          updatedCount++;
        }
      });

      await context.sync();
      setMessage(`✅ Амжилттай холбоод зорилгыг ${updatedCount} мөр дээр орууллаа.`);
    });
  } catch (error) {
    console.error("❌ Алдаа:", error);
    setMessage("❌ Алдаа гарлаа: " + error.message);
  }
}
// "ХААГДСАН ЗЭЭЛИЙН МЭДЭЭ" мөрийг шалгах функц
async function copyTop9IfClosedLoan(sheet, setMessage) {
  const a4 = sheet.getCell(3, 0); // A4 = row 4, col 0
  a4.load("values");
  await sheet.context.sync();

  if (a4.values[0][0] === "ХААГДСАН ЗЭЭЛИЙН МЭДЭЭ") {
    const sourceRange = sheet.getRange("A9:U9");
    sourceRange.load("values");
    await sheet.context.sync();

    const values = sourceRange.values[0].map((v) => (typeof v === "string" ? v.toUpperCase() : v));
    const target = sheet.getRangeByIndexes(4, 0, 1, values.length); // Row 5
    target.values = [values];

    // A5 дээр "ДАНСНЫ ДУГААР", U5 дээр "ЗЭЭЛИЙН ХУГАЦАА" бичих
    sheet.getRange("A5").values = [["ДАНСНЫ ДУГААР"]];
    sheet.getRange("V5").values = [["ЗЭЭЛИЙН ХУГАЦАА"]];

    await sheet.context.sync();
    setMessage(
      "ℹ️ 'ХААГДСАН ЗЭЭЛИЙН МЭДЭЭ' тул 9-р мөрийн утгуудыг томоор 5-р мөрөнд хуулж, A5 болон U5-г шинэчиллээ."
    );
  }
}

// Merge-ийг арилгах функц
async function unmergeAllCells(sheet) {
  if (!sheet) throw new Error("❌ Sheet is undefined.");

  const usedRange = sheet.getUsedRange();
  usedRange.load("address");
  await sheet.context.sync();

  usedRange.unmerge();
  await sheet.context.sync();
}

// толгойн мөрийг олох функц
async function getHeaderMap(sheet) {
  const headerRow = sheet.getRange("A5:CO5");
  headerRow.load("values");
  await sheet.context.sync();

  const headers = {};
  headerRow.values[0].forEach((val, i) => {
    if (val) headers[val.toString().trim()] = i;
  });
  return headers;
}

// Excel огноог JS огноо болгон хөрвүүлэх функц
function excelDateToJSDate(serial) {
  const utc_days = Math.floor(serial - 25569); // 25569 = Jan 1, 1970
  const utc_value = utc_days * 86400; // seconds
  return new Date(utc_value * 1000);
}

//сүүлийн мөрийг олох функц
async function getLastRow(sheet, columnIndex) {
  const usedRange = sheet.getUsedRange();
  usedRange.load("rowCount");
  await sheet.context.sync();

  const colRange = sheet.getRangeByIndexes(0, columnIndex, usedRange.rowCount, 1);
  colRange.load("values");
  await sheet.context.sync();

  const colValues = colRange.values.map((row) => row[0]);
  for (let i = colValues.length - 1; i >= 0; i--) {
    if (colValues[i] !== null && colValues[i] !== "") {
      return i + 1; // Excel uses 1-based row indexing
    }
  }
  return 0;
}


// Үлдэгдэл тэнцэл тайлан боловсруулалт
// H3: =IF(A3<>"",IF(ISNUMBER(VALUE(MID(A3,7,4))),VALUE(MID(A3,7,4)),""),H2)
// I3: =IF(A3<>"",IF(ISNUMBER(VALUE(MID(A3,1,7))),VALUE(MID(A3,1,6)),""),I2)
// J3: =MID(I3,1,4)
// K3: =MID(I3,1,3)
// L3: =MID(I3,1,2)
export async function processBalanceReconciliation(setMessage, setLoading) {
  return withLoading(setLoading, setMessage, async () => {
    await Excel.run(async (context) => {
      setMessage("⏳ Үлдэгдэл тэнцэл боловсруулж байна...");

      const sheet = context.workbook.worksheets.getActiveWorksheet();
      
      // A2 нүдийг шалгах
      const a2Cell = sheet.getCell(1, 0); // A2 (row 1, col 0)
      a2Cell.load("values");
      await context.sync();

      const a2Value = a2Cell.values[0][0];
      if (!a2Value || !a2Value.toString().includes("Үлдэгдэл тэнцэл")) {
        throw new Error("⚠️ A2 нүдэнд 'Үлдэгдэл тэнцэл' гэсэн үг байхгүй байна.");
      }

      // Сүүлийн мөрийг олох
      const lastRow = await getLastRow(sheet, 0); // A баганын дагуу
      if (lastRow < 3) {
        throw new Error("⚠️ Өгөгдөл хангалтгүй байна.");
      }

      // Бүх мөрүүдийг уншина (A багана, 3-р мөрөөс эхлэн)
      const dataRange = sheet.getRangeByIndexes(2, 0, lastRow - 2, 12); // Row 3-с эхлэх, A-L багана (0-11)
      dataRange.load("values");
      await context.sync();

      const rows = dataRange.values;
      
      // H2, I2-ийн анхны утгыг авах
      const h2Cell = sheet.getCell(1, 7); // H2
      const i2Cell = sheet.getCell(1, 8); // I2
      h2Cell.load("values");
      i2Cell.load("values");
      await context.sync();

      // Томьёонуудыг массиваар бэлтгэх
      const hFormulas = [];
      const iFormulas = [];
      const jFormulas = [];
      const kFormulas = [];
      const lFormulas = [];

      for (let i = 0; i < rows.length; i++) {
        const rowNum = i + 3; // Excel мөрийн дугаар (3-с эхэлнэ)
        
        hFormulas.push([`=IF(A${rowNum}<>"",IF(ISNUMBER(VALUE(MID(A${rowNum},7,4))),VALUE(MID(A${rowNum},7,4)),""),H${rowNum - 1})`]);
        iFormulas.push([`=IF(A${rowNum}<>"",IF(ISNUMBER(VALUE(MID(A${rowNum},1,7))),VALUE(MID(A${rowNum},1,6)),""),I${rowNum - 1})`]);
        jFormulas.push([`=MID(I${rowNum},1,4)`]);
        kFormulas.push([`=MID(I${rowNum},1,3)`]);
        lFormulas.push([`=MID(I${rowNum},1,2)`]);
      }

      // Бүх томьёог нэг дор бичих
      sheet.getRangeByIndexes(2, 7, rows.length, 1).formulas = hFormulas;
      sheet.getRangeByIndexes(2, 8, rows.length, 1).formulas = iFormulas;
      sheet.getRangeByIndexes(2, 9, rows.length, 1).formulas = jFormulas;
      sheet.getRangeByIndexes(2, 10, rows.length, 1).formulas = kFormulas;
      sheet.getRangeByIndexes(2, 11, rows.length, 1).formulas = lFormulas;

      await context.sync();

      setMessage(`✅ Үлдэгдэл тэнцэл боловсруулалт дууслаа. ${rows.length} мөр боловсруулсан.`);
    });
  });
}

// Санхүүгийн тайлангийн томьёо оруулах (R, S багана)
export async function GIprocessFinancialReport(setMessage, setLoading) {
  return withLoading(setLoading, setMessage, async () => {
    await Excel.run(async (context) => {
      setMessage("⏳ Санхүүгийн тайлан боловсруулж байна...");

      const sheet = context.workbook.worksheets.getActiveWorksheet();
      
      // R болон S багануудад томьёо оруулах
      const formulas = [
        ["Нийт мөнгөн хөрөнгө", "=SUMPRODUCT(G:G, --(LEFT(I:I, 2) = \"11\"))/2"],
        ["Зээлийн багц цэвэр дүнгээр", "=SUMPRODUCT(G:G, --(LEFT(I:I, 2) = \"12\"))/2"],
        ["Хүлээж болзошгүй үүрэг", "0"],
        ["Нийт зээлийн багц", "=S14+S15"],
        ["Зээлийн эрсдлийн сан", "=-SUMPRODUCT(G:G, --(LEFT(I:I, 3) = \"128\"))/2"],
        ["ЗЕСангийн дараах цэвэр зээл", "=S14-S17"],
        ["Хүүгийн орлого тэнцлийн дотуур", "=-SUMPRODUCT(G:G, --(ISNUMBER(SEARCH(LEFT(I:I, 2), \"41\"))))/2"],
        ["Хүүгийн орлого тэнцлийн гадуур", "0"],
        ["Хадгаламжийн хүүгийн орлого", "0"],
        ["Хүүгийн бус орлого", "=-SUMPRODUCT(G:G, --(ISNUMBER(SEARCH(LEFT(I:I, 2), \"42,43,44,45\"))))/2"],
        ["Нийт орлого", "=-SUMPRODUCT(G:G, --(LEFT(I:I, 1) = \"4\"))/2"],
        ["Нийт зардал", "=SUMPRODUCT(G:G, --(LEFT(I:I, 1) = \"5\"))/2-SUMPRODUCT(G:G, --(LEFT(I:I, 2) = \"54\"))/2-S25"],
        ["Үүнээс эх үүсвэрийн зардал", "=SUMPRODUCT(G:G, --(LEFT(I:I, 2) = \"51\"))/2"],
        ["Эх үүсвэрийн зардал", "=SUMPRODUCT(G:G, --(LEFT(I:I, 2) = \"51\"))/2"],
        ["Татварын өмнөх ашиг", "=S23-S24-S25"],
        ["Татварын зардал", "=S27*10%"],
        ["Татварын дараах ашиг", "=S27-S28"],
        ["2022 оны ААНОТын буцаалтын орлого", ""],
        ["Нийт цэвэр ашиг", "=S29+S30"],
        ["Зорилт", "0"]
      ];

      // R13-с эхлэн бичих (row index 12)
      for (let i = 0; i < formulas.length; i++) {
        const rowIdx = i + 12; // R13 = row 12 (0-indexed)
        sheet.getCell(rowIdx, 17).values = [[formulas[i][0]]]; // R багана (17)
        if (formulas[i][1]) {
          sheet.getCell(rowIdx, 18).formulas = [[formulas[i][1]]]; // S багана (18)
        } else {
          sheet.getCell(rowIdx, 18).values = [[""]]; // Хоосон утга
        }
      }


      await context.sync();

      setMessage(`✅ Санхүүгийн тайлан амжилттай боловсруулагдлаа.`);
    });
  });
}
export async function APprocessFinancialReport(setMessage, setLoading) {
  return withLoading(setLoading, setMessage, async () => {
    await Excel.run(async (context) => {
      setMessage("⏳ Санхүүгийн тайлан боловсруулж байна...");

      const sheet = context.workbook.worksheets.getActiveWorksheet();
      
      // R болон S багануудад томьёо оруулах
      const formulas = [
        ["Нийт мөнгөн хөрөнгө", "=SUMPRODUCT(G:G, --(LEFT(I:I, 2) = \"11\"))/2"],
        ["Зээлийн багц цэвэр дүнгээр", "=SUMPRODUCT(G:G, --(LEFT(I:I, 2) = \"13\"))/2"],
        ["Хүлээж болзошгүй үүрэг", "0"],
        ["Нийт зээлийн багц", "=S14+S15"],
        ["Зээлийн эрсдлийн сан", "=-SUMPRODUCT(G:G, --(LEFT(I:I, 3) = \"139\"))/2"],
        ["ЗЕСангийн дараах цэвэр зээл", "=S14-S17"],
        ["Хүүгийн орлого тэнцлийн дотуур", "=-SUMPRODUCT(G:G, --(ISNUMBER(SEARCH(LEFT(I:I, 2), \"41\"))))/2"],
        ["Хүүгийн орлого тэнцлийн гадуур", "0"],
        ["Хадгаламжийн хүүгийн орлого", "0"],
        ["Хүүгийн бус орлого", "=-SUMPRODUCT(G:G, --(ISNUMBER(SEARCH(LEFT(I:I, 2), \"42,43,44,45\"))))/2"],
        ["Нийт орлого", "=-SUMPRODUCT(G:G, --(LEFT(I:I, 1) = \"4\"))/2"],
        ["Нийт зардал", "=SUMPRODUCT(G:G, --(LEFT(I:I, 1) = \"5\"))/2"],
        ["Үүнээс эх үүсвэрийн зардал", "=SUMPRODUCT(G:G, --(LEFT(I:I, 4) = \"5235\"))/2"],
        ["Эх үүсвэрийн зардал", "=SUMPRODUCT(G:G, --(LEFT(I:I, 2) = \"51\"))/2"],
        ["Татварын өмнөх ашиг", "=S23-S24"],
        ["Татварын зардал", "=S27*10%"],
        ["Татварын дараах ашиг", "=S27-S28"],
        ["2022 оны ААНОТын буцаалтын орлого", ""],
        ["Нийт цэвэр ашиг", "=S29+S30"],
        ["Зорилт", "0"]
      ];

      // R13-с эхлэн бичих (row index 12)
      for (let i = 0; i < formulas.length; i++) {
        const rowIdx = i + 12; // R13 = row 12 (0-indexed)
        sheet.getCell(rowIdx, 17).values = [[formulas[i][0]]]; // R багана (17)
        if (formulas[i][1]) {
          sheet.getCell(rowIdx, 18).formulas = [[formulas[i][1]]]; // S багана (18)
        } else {
          sheet.getCell(rowIdx, 18).values = [[""]]; // Хоосон утга
        }
      }


      await context.sync();

      setMessage(`✅ Санхүүгийн тайлан амжилттай боловсруулагдлаа.`);
    });
  });
}


// Polaris NES API-аас зээлийн мэдээлэл татах функц
export async function fetchPolarisLoanData(setMessage, setLoading) {
  return withLoading(setLoading, setMessage, async () => {
    await Excel.run(async (context) => {
      setMessage("⏳ Polaris зээл татах эхэллээ...");

      // 1. Идэвхтэй cell-ээс зээлийн дугаар унших
      const activeCell = context.workbook.getSelectedRange();
      activeCell.load("values");
      await context.sync();

      const loanNumber = activeCell.values[0][0];
      if (!loanNumber) {
        throw new Error("⚠️ Зээлийн дугаар оруулна уу!");
      }

      // 2. Зээлийн дугаар валидаци (16+ тэмдэгт, "1221"-ээр эхэлнэ)
      if (loanNumber.toString().length < 16 ) {
        throw new Error("⚠️ Зээлийн дугаар буруу байна. 16+ тэмдэгт, '1221'-ээр эхэлнэ.");
      }

      console.log("🔍 Polaris request:", { loanNumber });
      setMessage("⏳ Backend API руу хүсэлт илгээж байна...");

      // 3. Backend proxy-аар дамжуулан Polaris API руу хандах (CORS шийдэл)
      // Authorization header нэмэх (JWT token)
      const token = localStorage.getItem('authToken');
      const companyId = getCompanyId();
      
      const response = await fetch(`${BASE_URL}/api/polaris/loan-data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "x-company-id": companyId,
        },
        body: JSON.stringify({
          loanNumber: loanNumber.toString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `❌ API хүсэлт амжилтгүй: ${response.status}`);
      }

      const parsedResult = await parseJsonSafe(response);

      // 4. repayAcntCode-ийг олж авах
      const repayAcntCode = parsedResult?.repayAcntCode || "";
      const loanname = parsedResult?.name || "";
      
      // 5. Үр дүнг идэвхтэй cell-ийн хажууд бичих (багана 1: repayAcntCode)
      const resultCell1 = activeCell.getOffsetRange(0, 1);
      resultCell1.values = [["'" + repayAcntCode]];
      const resultCellLoanName = activeCell.getOffsetRange(0, 2);
      resultCellLoanName.values = [[loanname]];
      // 6. Бүх хариуг JSON форматаар гаргах (багана 2: бүх хариу)
     // const resultCell2 = activeCell.getOffsetRange(0, 2);
      //const fullResponse = JSON.stringify(parsedResult, null, 2);
      //resultCell2.values = [[fullResponse]];
      
      await context.sync();

      setMessage(`✅ Polaris-аас мэдээлэл амжилттай татагдлаа. Зээлийн дугаар: ${loanNumber}`);
    });
  });
}

/**
 * Polaris NES системээс зээлийн жагсаалт татах
 * @param {function} setMessage - Мэдэгдэл харуулах функц
 * @param {function} setLoading - Loading төлөcurlcurlcurlcurlcurlcurlcurlcurlcurlcurl -X POST http://localhost:4000/api/polaris/customer-list ^
  -H "Content-Type: application/json" ^
  -d "{\"status\":[\"1\"],\"page\":0,\"pageSize\":10}" * @param {Object} filters - Шүүлтүүр {status: ['O','N'], branchCode: '122101', prodType: ['LOAN','LINE']}
 */
export async function fetchPolarisLoanList(setMessage, setLoading, filters = {}) {
  return withLoading(setLoading, setMessage, async () => {
    await Excel.run(async (context) => {
      setMessage("⏳ Polaris зээлийн жагсаалт татах эхэллээ...");

      // 1. Шүүлтүүр бэлтгэх (defaults)
      const {
        status = ['O', 'N'],
        prodType = ['LOAN', 'LINE'],
        page = 0,
        pageSize = 25
      } = filters;

      console.log("🔍 Polaris loan list request:", { status, prodType, page, pageSize });
      setMessage("⏳ Backend API руу хүсэлт илгээж байна...");

      // 2. Backend proxy-аар дамжуулан Polaris API руу хандах (JWT token)
      const token = localStorage.getItem('authToken');
      const companyId = getCompanyId();
      
      const response = await fetch(`${BASE_URL}/api/polaris/loan-list`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "x-company-id": companyId,
        },
        body: JSON.stringify({
          status,
          prodType,
          page,
          pageSize
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`❌ API хүсэлт амжилтгүй: ${response.status}. ${errorText.substring(0, 200)}`);
      }

      const parsedResult = await parseJsonSafe(response);

      // 3. Шинэ worksheet үүсгэх
      const newSheetName = buildSheetName('Polaris');
      
      const newSheet = context.workbook.worksheets.add(newSheetName);
      newSheet.activate();
      await context.sync();

      // 4. Хариу массив байвал бүх талбаруудыг динамикаар задлах
      if (Array.isArray(parsedResult) && parsedResult.length > 0) {
        const firstItem = parsedResult[0];
        const headers = Object.keys(firstItem || {});

        if (!headers.length) {
          setMessage("⚠️ API хариунд бичих талбар алга (headers хоосон)." );
          return;
        }
        
        // Толгой мөр бичих (A1-ээс эхлэх)
        const headerRange = newSheet.getRangeByIndexes(0, 0, 1, headers.length);
        headerRange.values = [headers];
        headerRange.format.font.bold = true;
        headerRange.format.fill.color = "#4472C4";
        headerRange.format.font.color = "white";
        
        // Өгөгдөл мөрүүдийг бэлтгэх
        const dataRows = parsedResult.map(item => {
          return headers.map(key => {
            const value = item[key];
            if (value === null || value === undefined) return "";
            
            // 16+ оронтой тоог текст болгох (Excel-ийн тооны хязгаарлалт)
            if (typeof value === 'string' && /^\d{16,}$/.test(value)) {
              return "'" + value; // Апостроф нэмж текст болгох
            }
            return value;
          });
        });
        
        // Өгөгдөл бичих (A2-оос эхлэх)
        const dataRange = newSheet.getRangeByIndexes(1, 0, dataRows.length, headers.length);
        dataRange.values = dataRows;
        dataRange.format.autofitColumns();
        
        await context.sync();
        setMessage(`✅ Polaris зээлийн жагсаалт: ${dataRows.length} зээл, ${headers.length} багана. Sheet: ${newSheetName}`);
      } else if (Array.isArray(parsedResult) && parsedResult.length === 0) {
        setMessage(`⚠️ Polaris зээлийн жагсаалт хоосон байна.`);
      } else if (typeof parsedResult === 'object' && parsedResult !== null) {
        const entries = Object.entries(parsedResult);
        if (!entries.length) {
          setMessage("⚠️ Polaris хариу хоосон объект байна (талбар алга)." );
          return;
        }

        const dataRows = entries.map(([key, value]) => [
          key,
          typeof value === 'object' ? JSON.stringify(value) : value
        ]);

        const range = newSheet.getRangeByIndexes(0, 0, dataRows.length, 2);
        range.values = dataRows;
        range.format.autofitColumns();

        await context.sync();
        setMessage(`✅ Polaris хариу: ${entries.length} талбар. Sheet: ${newSheetName}`);
      } else if (typeof parsedResult === 'string') {
        const cell = newSheet.getRange("A1");
        cell.values = [[parsedResult]];
        await context.sync();
        setMessage(`⚠️ Polaris хариу текст байдлаар ирлээ. Sheet: ${newSheetName}`);
      } else {
        const fullResponse = JSON.stringify(parsedResult, null, 2);
        const cell = newSheet.getRange("A1");
        cell.values = [[fullResponse]];
        await context.sync();
        setMessage(`✅ Polaris хариу татагдлаа. Sheet: ${newSheetName}`);
      }
    });
  });
}

// Polaris NES системээс харилцагчийн жагсаалт татах
export async function fetchPolarisCustomerList(setMessage, setLoading, filters = {}) {
  return withLoading(setLoading, setMessage, async () => {
    await Excel.run(async (context) => {
      setMessage("⏳ Polaris харилцагчийн жагсаалт татах эхэллээ...");

      const {
        status = ['1'],
        page = 2000,
        pageSize = 1000
      } = filters;

      console.log("🔍 Polaris customer list request:", { status, page, pageSize });
      setMessage("⏳ Backend API руу хүсэлт илгээж байна...");

      const token = localStorage.getItem('authToken');
      const companyId = getCompanyId();

      const response = await fetch(`${BASE_URL}/api/polaris/customer-list`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "x-company-id": companyId,
        },
        body: JSON.stringify({ status, page, pageSize }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`❌ API хүсэлт амжилтгүй: ${response.status}. ${errorText.substring(0, 200)}`);
      }

      const parsedResult = await parseJsonSafe(response);

      const newSheetName = buildSheetName('PolarisCustomer');

      const newSheet = context.workbook.worksheets.add(newSheetName);
      newSheet.activate();
      await context.sync();

      if (Array.isArray(parsedResult) && parsedResult.length > 0) {
        const firstItem = parsedResult[0];
        const headers = Object.keys(firstItem || {});

        if (!headers.length) {
          setMessage("⚠️ API хариунд бичих талбар алга (headers хоосон)." );
          return;
        }

        const headerRange = newSheet.getRangeByIndexes(0, 0, 1, headers.length);
        headerRange.values = [headers];
        headerRange.format.font.bold = true;
        headerRange.format.fill.color = "#4472C4";
        headerRange.format.font.color = "white";

        const dataRows = parsedResult.map(item => {
          return headers.map(key => {
            const value = item[key];
            if (value === null || value === undefined) return "";
            if (typeof value === 'object') {
              return JSON.stringify(value);
            }
            if (typeof value === 'string' && /^\d{16,}$/.test(value)) {
              return "'" + value;
            }
            return value;
          });
        });

        if (!dataRows.length) {
          setMessage("⚠️ Polaris харилцагчийн жагсаалтад мөр алга." );
          return;
        }

        const dataRange = newSheet.getRangeByIndexes(1, 0, dataRows.length, headers.length);
        dataRange.values = dataRows;
        dataRange.format.autofitColumns();

        await context.sync();
        setMessage(`✅ Polaris харилцагчийн жагсаалт: ${dataRows.length} мөр, ${headers.length} багана. Sheet: ${newSheetName}`);
      } else if (Array.isArray(parsedResult) && parsedResult.length === 0) {
        setMessage(`⚠️ Polaris харилцагчийн жагсаалт хоосон байна.`);
      } else if (typeof parsedResult === 'object' && parsedResult !== null) {
        const entries = Object.entries(parsedResult);
        const dataRows = entries.map(([key, value]) => [
          key,
          typeof value === 'object' ? JSON.stringify(value) : value
        ]);

        const range = newSheet.getRangeByIndexes(0, 0, dataRows.length, 2);
        range.values = dataRows;
        range.format.autofitColumns();

        await context.sync();
        setMessage(`✅ Polaris хариу: ${entries.length} талбар. Sheet: ${newSheetName}`);
      } else {
        const fullResponse = JSON.stringify(parsedResult, null, 2);
        const cell = newSheet.getRange("A1");
        cell.values = [[fullResponse]];
        await context.sync();
        setMessage(`✅ Polaris хариу татагдлаа. Sheet: ${newSheetName}`);
      }
    });
  });
}