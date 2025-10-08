/* global Excel, console */
// ✅ Loan Report Processor - Converted from VBA to Office.js (Excel JavaScript API)
// ⚠️ Note: Complex calculations like SUMIFS/COUNTIFS are replaced with manual filtering and aggregation
import { withLoading, hideEmptyColumns } from "./apiHelpers";

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
          .replace(/МУУ|ХЭВИЙН БУС|ЭРГЭЛЗЭEEТЭЙ/g, "ЧАНАРГҮЙ");
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
      await zeeldegchiinTooCalc(sheet, headers); // Шинэ тооцоолол

      // Ерөнхий тооцооллын функцээр солих
      const reportConfigs = [
        { categoryField: "ЗОРИУЛАЛТ", type: "balance" },
        { categoryField: "АНГИЛАЛ", type: "balance" },
        { categoryField: "BUTEEGDEHUUN1", type: "balance" },
        { categoryField: "СЕГМЕНТ", type: "balance" },
        { categoryField: "HUGATSAANII INTERVAL", type: "balance" },
        { categoryField: "МАШИН", type: "balance", useSegment: false },
      ];

      for (const config of reportConfigs) {
        await summarizeByCategory(sheet, headers, config);
      }

      setMessage("✅ Loan report pre-calculation complete.");
    });
  });
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

      const headerLabels = await getCombinedHeadersFromRows(sheet, "A5:Y7");

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
      const huuIdx = headers["ХҮҮ"];
      const regIdx = headers["РЕГИСТЕР"];
      const sarIdx = headers["ХУГАЦАА (САРААР)"]; //Зээлийн хугацаа
      const zoriulaltIdx = headers["ЗОРИУЛАЛТ"];
      const buteegdehuunIdx = headers["BUTEEGDEHUUN1"];
      const buteegdehuunnii1Idx = headers["BUTEEGDEHUUNII_NER"];

      for (let i = 5; i < data.length; i++) {
        const row = data[i];

        const valT = row[buteegdehuunnii1Idx - 5];
        const valUprev = data[i - 1]?.[buteegdehuunnii1Idx];
        const valDprev = data[i - 1]?.[3];

        row[buteegdehuunnii1Idx] =
          valT === "" || valT === undefined ? "" : valUprev === "" || valUprev === undefined ? valDprev : valUprev;

        const zeel = parseFloat(row[toogooIdx]) || 0;
        const huu = parseFloat(row[huuIdx]) || 0;
        row[headers["JDH_DUN"]] = (zeel * huu) / 100;

        const sar = parseFloat(row[sarIdx]);
        if (!isNaN(sar)) {
          row[headers["HUGATSAANII INTERVAL"]] = getTermInterval(sar * 30); // Reuse existing interval function
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

      // Write all calculated data back to the sheet in one go
      const writeRange = sheet.getRangeByIndexes(5, 0, data.length - 5, data[0].length);
      writeRange.values = data.slice(5);
      await context.sync();

      const grantReportConfigs = [
        { categoryField: "ЗОРИУЛАЛТ", type: "grant", useSegment: true },
        { categoryField: "BUTEEGDEHUUN1", type: "grant", useSegment: true },
        { categoryField: "HUGATSAANII INTERVAL", type: "grant", useSegment: false },
        { categoryField: "МАШИН", type: "grant", useSegment: false },
      ];

      for (const config of grantReportConfigs) {
        await summarizeByCategory(sheet, headers, config);
      }
    });

    await hideEmptyColumns(setMessage);

    setMessage("✅ BL1-ийг шалгах Зээл олголт complete.");
  });
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

      await unmergeAllCells(sheet);

      const headerLabels = await getCombinedHeadersFromRows(sheet, "A5:Y7");
      headerLabels.push("BUTEEGDEHUUN1", "JDH_DUN", "HUGATSAANII INTERVAL", "SEGMENT1");

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
      const buteegdehuunnii1Idx = headers["BUTEEGDEHUUNII_NER"];
      const zoriulaltIdx = headers["ЗОРИУЛАЛТ"];
      const sarIdx = headers["ЗЭЭЛИЙН ХУГАЦАА"];

      for (let i = 5; i < data.length; i++) {
        const row = data[i];

        const valT = row[buteegdehuunnii1Idx - 1];
        const valUprev = data[i - 1]?.[buteegdehuunnii1Idx];
        const valDprev = data[i - 1]?.[1];
        row[buteegdehuunnii1Idx] =
          valT === "" || valT === undefined ? "" : valUprev === "" || valUprev === undefined ? valDprev : valUprev;

        const sar = parseFloat(row[sarIdx]);
        if (!isNaN(sar)) {
          row[headers["HUGATSAANII INTERVAL"]] = getTermInterval(sar * 30);
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

      const writeRange = sheet.getRangeByIndexes(5, 0, data.length - 5, data[0].length);
      writeRange.values = data.slice(5);
      await context.sync();

      const paymentReportConfigs = [
        { categoryField: "ЗОРИУЛАЛТ", type: "payment", useSegment: true },
        { categoryField: "BUTEEGDEHUUN1", type: "payment", useSegment: true },
        { categoryField: "HUGATSAANII INTERVAL", type: "payment", useSegment: false },
        { categoryField: "МАШИН", type: "payment", useSegment: true },
      ];

      for (const config of paymentReportConfigs) {
        await summarizeByCategory(sheet, headers, config);
      }

      await hideEmptyColumns(setMessage);

      setMessage("✅ BL1-ийг шалгах Зээл төлөлт complete.");
    });
  });
}

/**
 * Нэгдсэн тооцооллын функц.
 * Зээлийн үлдэгдэл, олголт, төлөлтийн тайлангуудын нэгтгэлийг хийнэ.
 * @param {Excel.Worksheet} sheet - The worksheet object.
 * @param {object} headers - The header map.
 * @param {object} config - Configuration for the summary.
 * @param {string} config.categoryField - The field to group by.
 * @param {string} config.type - 'balance', 'grant', or 'payment'.
 * @param {boolean} [config.useSegment=true] - Whether to split by segment '81'.
 */
async function summarizeByCategory(sheet, headers, { categoryField, type, useSegment = true }) {
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

  const typeConfigs = {
    balance: {
      headerLabels: [
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
      ],
      valueCol: "ҮНДСЭН ЗЭЭЛ",
      countCol: categoryField === "АНГИЛАЛ" ? "ДАНСНЫ ДУГААР" : "РД",
      interestCol: "ХҮҮНИЙ ХУВЬ",
      calcFn: (filtered) => {
        const angilalSum = (val) =>
          filtered
            .filter((r) => (r[headers["ANGILAL1"]] || "").toString().trim() === val)
            .reduce((s, r) => s + (+r[headers["ҮНДСЭН ЗЭЭЛ"]] || 0), 0);
        const huu = filtered.map((r) => +r[headers["ХҮҮНИЙ ХУВЬ"]]).filter((n) => !isNaN(n));
        return [
          angilalSum("ХЭВИЙН"),
          angilalSum("ХУГАЦАА ХЭТЭРСЭН"),
          angilalSum("ЧАНАРГҮЙ"),
          huu.length ? Math.max(...huu) / 1200 : "",
          huu.length ? Math.min(...huu) / 1200 : "",
        ];
      },
    },
    grant: {
      headerLabels: [
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
      ],
      valueCol: "ТӨГРӨГ",
      countCol: "РЕГИСТЕР",
      interestCol: "ХҮҮ",
      weightedAvgCol: "JDH_DUN",
      calcFn: (filtered, totalAmount) => {
        const totalInterest = filtered.reduce((sum, row) => sum + (+row[headers["JDH_DUN"]] || 0), 0);
        const interestRates = filtered.map((row) => +row[headers["ХҮҮ"]]).filter((n) => !isNaN(n));
        return [
          totalAmount > 0 ? totalInterest / totalAmount / 12 : 0,
          interestRates.length ? Math.max(...interestRates) / 1200 : "",
          interestRates.length ? Math.min(...interestRates) / 1200 : "",
        ];
      },
    },
    payment: {
      headerLabels: ["81", "МӨНГӨН ДҮН", "TOO", "<>81", "МӨНГӨН ДҮН", "TOO"],
      valueCol: "ЗЭЭЛ",
      countCol: "ДАНС",
      calcFn: () => [], // No extra calculations
    },
  };

  const currentConfig = typeConfigs[type];
  if (!currentConfig) throw new Error(`Invalid summary type: ${type}`);

  const headerStartCol = 63; // BL
  currentConfig.headerLabels.forEach((label, idx) => (sheet.getCell(0, headerStartCol + idx).values = [[label]]));
  const startRow = await getLastRow(sheet, headerStartCol);

  const calculateStats = (value, segmentCode, exclude = false) => {
    const filtered = data.filter((row) => {
      const category = row[headers[categoryField]];
      if (!useSegment) return category === value;
      const segment = (row[headers["SEGMENT1"]] || "").toString().trim();
      return category === value && (exclude ? segment !== segmentCode : segment === segmentCode);
    });

    const totalAmount = filtered.reduce((sum, row) => sum + (+row[headers[currentConfig.valueCol]] || 0), 0);
    const uniqueCount = new Set(filtered.map((row) => row[headers[currentConfig.countCol]]).filter(Boolean)).size;
    const extraCalcs = currentConfig.calcFn(filtered, totalAmount);

    return [totalAmount, uniqueCount, ...extraCalcs];
  };

  const results = [];
  categoryValues.forEach((value) => {
    const rowData = [value];
    const segment81Stats = calculateStats(value, "81");
    rowData.push(...segment81Stats);

    if (useSegment) {
      rowData.push(""); // Separator
      const otherSegmentsStats = calculateStats(value, "81", true);
      rowData.push(...otherSegmentsStats);
    }
    results.push(rowData);
  });

  if (results.length > 0) {
    const outputRange = sheet.getRangeByIndexes(startRow, headerStartCol, results.length, results[0].length);
    outputRange.values = results;
  }
  await sheet.context.sync();
}

/**
 * Нэгтгэсэн толгой мөрийг заасан мөрүүдээс уншиж үүсгэнэ.
 * @param {Excel.Worksheet} sheet - The worksheet object.
 * @param {string} rangeAddress - e.g., "A5:Y7".
 * @returns {Promise<string[]>} - Array of header labels.
 */
async function getCombinedHeadersFromRows(sheet, rangeAddress) {
  const headerSourceRange = sheet.getRange(rangeAddress);
  headerSourceRange.load("values");
  await sheet.context.sync();

  const values = headerSourceRange.values;
  const headerLabels = [];
  if (values.length > 0) {
    for (let i = 0; i < values[0].length; i++) {
      let combinedHeader = "";
      for (let j = 0; j < values.length; j++) {
        const cellValue = (values[j][i] || "").toString().trim().toUpperCase();
        if (cellValue) {
          combinedHeader = cellValue;
          break; // Take the first non-empty value from top to bottom
        }
      }
      headerLabels.push(combinedHeader);
    }
  }
  return headerLabels;
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
    // console.error is not available in this context, using setMessage instead
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
