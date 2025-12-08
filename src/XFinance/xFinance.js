import { withLoading } from "./apiHelpers"; // туслах функц
import { BASE_URL } from "../config";
import activityTracker from "./utils/activityTracker"; // Activity tracker нэмэх
//Үндсэн функцүүд
export let lastImportedData = null;
export function loadXLSX() {
  return new Promise((resolve, reject) => {
    const timeout = 5000; // 5 seconds timeout
    const interval = 100; // check every 100ms
    let elapsedTime = 0;

    const checkXLSX = () => {
      if (window.XLSX) {
        resolve(window.XLSX);
      } else {
        elapsedTime += interval;
        if (elapsedTime >= timeout) {
          reject(new Error("XLSX library failed to load within 5 seconds."));
        } else {
          setTimeout(checkXLSX, interval);
        }
      }
    };

    checkXLSX();
  });
}

/**
 * Тухайн sheet-ийн тодорхой баганы сүүлийн хоосон мөрийг олох функц
 * @param {Excel.Worksheet} sheet - Excel worksheet объект
 * @param {string} columnLetter - Баганы үсэг (жнь: "B", "C")
 * @param {Excel.RequestContext} context - Excel context
 * @returns {Promise<number>} - Сүүлийн хоосон мөрийн индекс (0-based)
 */
export async function getLastEmptyRowInColumn(sheet, columnLetter, context) {
  const columnRange = sheet.getRange(`${columnLetter}:${columnLetter}`);
  const usedRange = columnRange.getUsedRangeOrNullObject();
  usedRange.load("rowIndex, rowCount, values");
  await context.sync();

  let lastEmptyRow = 0;
  if (!usedRange.isNullObject) {
    const values = usedRange.values;
    const startRowIndex = usedRange.rowIndex;
    // Сүүлээс эхлэн хоосон биш нүдийг олох
    for (let i = values.length - 1; i >= 0; i--) {
      if (values[i][0] !== null && values[i][0].toString().trim() !== "") {
        lastEmptyRow = startRowIndex + i + 1; // Дараагийн хоосон мөр
        break;
      }
    }
  }
  return lastEmptyRow;
}

export const handleFileImport = async (
  event,
  {
    sheetName, // 🆕 хэрэглэгчийн сонгосон нэр
    setLoading,
    setErrorMessage,
    setSheetData,
    setConfirmDialogOpen,
    setImportStatus,
    setSheetDialogOpen,
  }
) => {
  const file = event.target.files[0];
  if (!file || !sheetName) {
    setErrorMessage("❌ Sheet нэр эсвэл файл олдсонгүй.");
    return;
  }

  await withLoading(setLoading, setErrorMessage, async function importExcelData() {
    const reader = new FileReader();
    const buffer = await new Promise((resolve, reject) => {
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });

    const data = new Uint8Array(buffer);
    const XLSX = await loadXLSX();
    const workbook = XLSX.read(data, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const firstSheet = workbook.Sheets[firstSheetName];
    const rawSheetData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

    const processedData = rawSheetData.map((row) =>
      row.map((cell) => {
        if (typeof cell === "number" && cell.toString().length > 15) return "'" + cell;
        if (typeof cell === "string" && /^\d{16,}$/.test(cell)) return "'" + cell;
        return cell;
      })
    );

    setSheetData(processedData);

    const sheetExists = await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getItemOrNullObject(sheetName);
      await context.sync();
      return !sheet.isNullObject;
    });

    if (sheetExists) {
      setConfirmDialogOpen(true); // ❓ хуучин өгөгдөл байгаа тул зөвшөөрөл асуух
    } else {
      const { message, success } = await writeToImportSheet(
        sheetName, // 🆕 sheetName ашиглана
        processedData,
        true,
        setLoading,
        setErrorMessage
      );
      setErrorMessage(message);
      setImportStatus(success);
      if (setSheetDialogOpen) setSheetDialogOpen(true);
    }
  });

  event.target.value = null;
};

export async function writeToImportSheet(sheetName, sheetData, confirmStatus, setLoading, setMessage) {
  return withLoading(setLoading, setMessage, async function writeToImportSheet() {
    return await Excel.run(async (context) => {
      const workbook = context.workbook;
      let sheet = workbook.worksheets.getItemOrNullObject(sheetName);
      await context.sync();

      const sheetExists = !sheet.isNullObject;

      if (!sheetExists) {
        sheet = workbook.worksheets.add(sheetName);
        await context.sync();
        confirmStatus = true; // шинэ sheet бол clear заавал хийнэ
      }

      let startRow = 0;

      if (sheetExists && confirmStatus) {
        const clearRange = sheetName === "Import" ? "A:M" : sheet.getUsedRange();
        if (typeof clearRange === "string") {
          sheet.getRange(clearRange).clear();
        } else {
          clearRange.load("address");
          await context.sync();
          sheet.getRange(clearRange.address).clear();
        }
        await context.sync();
      }

      let existingHeaders = [];
      if (sheetExists && !confirmStatus) {
        startRow = await getLastEmptyRowInColumn(sheet, "B", context);
        console.log("Determined startRow for import:", startRow);
        // Оруулах өгөгдөл хамгийн доод талын хоосон нүднээс эхэлнэ

        // Header mapping
        const sheetUsedRange = sheet.getUsedRange();
        sheetUsedRange.load("columnCount");
        await context.sync();
        const headerRowIndex = sheetName === "Journal" ? 1 : 0;
        const existingHeadersRange = sheet.getRangeByIndexes(headerRowIndex, 0, 1, sheetUsedRange.columnCount);
        existingHeadersRange.load("values");
        await context.sync();
        existingHeaders = existingHeadersRange.values[0] || [];
        const newHeaders = sheetData[0] || [];
        const mappedSheetData = sheetData.map(row => {
          const newRow = [];
          for (let i = 0; i < existingHeaders.length; i++) {
            const header = existingHeaders[i];
            const newColIdx = newHeaders.indexOf(header);
            newRow.push(newColIdx >= 0 ? row[newColIdx] : "");
          }
          return newRow;
        });
        sheetData = mappedSheetData;

        setMessage("⚠️ Хуучин өгөгдлийг хадгалж, header mapping хийж нэмлээ.");
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }

      let dataToWrite = sheetData;
      let columns;
      if (confirmStatus) {
        columns = sheetData.reduce((max, row) => Math.max(max, row.length), 0);
      } else {
        columns = existingHeaders.length;
        dataToWrite = sheetData.slice(1);
      }
      const rows = dataToWrite.length;

      if (rows === 0 || columns === 0) {
        throw new Error("❌ SheetData хоосон байна!");
      }

      if (sheetName === "Import" && columns > 13) {
        throw new Error("❌ Баганын тоо 13-аас хэтэрсэн байна!");
      }

      const normalizedData = dataToWrite.map((row) =>
        row.length === columns ? row : [...row, ...Array(columns - row.length).fill("")]
      );

      const range = sheet.getRangeByIndexes(startRow, 0, rows, columns); // ✨ Нэмэх эсвэл A1-с бичих
      range.values = normalizedData;
      //range.format.autofitColumns();
      range.format.autofitRows();

      sheet.activate();
      await context.sync();

      const message = `✅ "${sheetName}" sheet дээр өгөгдөл амжилттай бичигдлээ!`;
      setMessage(message);
      return { message, success: true };
    });
  });
}

export async function insertText(text, setMessage, setLoading) {
  // Write text to the active cell only if it is empty. Show message. Show loading.
  return withLoading(setLoading, setMessage, async function insertTextWithLoading() {
    try {
      await Excel.run(async (context) => {
        const range = context.workbook.getActiveCell();
        range.load("values, address");
        await context.sync();
        const currentValue = range.values[0][0];
        if (currentValue === null || currentValue === "") {
          range.values = [[text]];
          range.format.autofitColumns();
          await context.sync();
          if (setMessage) setMessage(`✅ ${range.address} нүдэнд утга амжилттай бичигдлээ.`);
        } else {
          if (setMessage) setMessage(`⚠️ ${range.address} нүдэнд аль хэдийн утга байна.`);
        }
      });
    } catch (error) {
      if (setMessage) setMessage("❌ Алдаа: " + error.message);
    }
  });
}


//Тоо руу хөрвүүлэх функц
export const handleNumberConversion = async (setMessage, setLoading) => {
  return withLoading(setLoading, setMessage, async function handleNumberConversion() {
    await Excel.run(async (context) => {
      const range = context.workbook.getSelectedRange();
      range.load("values");
      await context.sync();

      range.numberFormat = [['_(* #,##0_);_(* (#,##0);_(* "-"??_);_(@_)']];
      range.values = range.values;

      await context.sync();
    });
    setMessage("✅ Амжилттай!");
  });
};
export const handleNegativeConversion = async (setMessage, setLoading) => {
  return withLoading(setLoading, setMessage, async function handleNegativeConversion() {
    await Excel.run(async (context) => {
      const range = context.workbook.getSelectedRange();
      range.load("values");
      await context.sync();

      const originalValues = range.values;

      const newValues = originalValues.map((row) =>
        row.map((cell) =>
          typeof cell === "number" && !isNaN(cell)
            ? cell > 0
              ? -cell
              : cell // эерэгийг сөрөг болгоно
            : cell
        )
      );

      range.values = newValues;
      await context.sync();
    });

    setMessage("✅ Сонгосон тоонуудыг сөрөг болголоо.");
  });
};

//Текст рүү хөрвүүлэх функц
export const handleTextConversion = async (setMessage, setLoading) => {
  return withLoading(setLoading, setMessage, async function handleTextConversion() {
    await Excel.run(async (context) => {
      const range = context.workbook.getSelectedRange();
      range.load("values");
      await context.sync();

      const originalValues = range.values;

      const newValues = originalValues.map((row) =>
        row.map((cell) => (cell !== null && cell !== "" ? `'${cell}` : ""))
      );

      range.values = newValues;
      await context.sync();
    });

    setMessage("✅ Амжилттай!");
  });
};

//Огноо руу хөрвүүлэх функц
export const handleDateConversion = async (setMessage, setLoading) => {
  return withLoading(setLoading, setMessage, async function handleDateConversion() {
    await Excel.run(async (context) => {
      const range = context.workbook.getSelectedRange();
      range.load("values");
      await context.sync();

      const originalValues = range.values;

      // Бүх утгыг yyyy-mm-dd форматтай текст болгоно (таймзон зөрөхөөс сэргийлнэ)
      const formatDate = (dateObj) => {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, "0");
        const day = String(dateObj.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      const newValues = originalValues.map((row) =>
        row.map((cell) => {
          if (cell === null || cell === "") return "";

          // Хэрэв тоо бол Excel serial date байж болно
          if (typeof cell === "number") {
            const excelEpoch = new Date(1899, 11, 30);
            const jsDate = new Date(excelEpoch.getTime() + cell * 86400000);
            return formatDate(jsDate);
          }

          // Хэрэв текст бол Date parse хийх
          if (typeof cell === "string") {
            const parsed = new Date(cell);
            if (!isNaN(parsed.getTime())) {
              return formatDate(parsed);
            }
          }

          return cell;
        })
      );

      range.values = newValues;
      // Text хэлбэрээр хадгалах; Excel өөр формат руу хөрвүүлэхээс хамгаална
      range.numberFormat = [["@"]] ;
      await context.sync();
    });

    setMessage("✅ Огноо руу амжилттай хөрвүүллээ!");
  });
};


// ✅ Excel-ийн идэвхтэй нүдэнд утга оруулах функц
export const setActiveCellValue = async (value, setMessage, setLoading) => {
  return withLoading(setLoading, setMessage, async function setActiveCellValue() {
    await Excel.run(async (context) => {
      const range = context.workbook.getActiveCell();
      range.values = `'${value}`;
      await context.sync();
    });

    setMessage("✅ Амжилттай");
  });
};

export const setActiveCellValue2 = async (value, setMessage, setLoading) => {
  return withLoading(setLoading, setMessage, async function setActiveCellValue2() {
    await Excel.run(async (context) => {
      const range = context.workbook.getActiveCell();
      range.values = [[value]];
      await context.sync();
    });

    setMessage("✅ Амжилттай");
  });
};

// ✅ Excel-ийн идэвхтэй нүдний утгыг авах функц
export const getActiveCellValue = async (setMessage, setLoading) => {
  return withLoading(setLoading, setMessage, async function getActiveCellValue() {
    const value = await Excel.run(async (context) => {
      const range = context.workbook.getActiveCell();
      range.load("values");
      await context.sync();
      return range.values[0][0];
    });

    setMessage(`✅ Утга: ${value}`);
    return value;
  });
};
// Идэвхтэй байгаа нүдний formula-г авах функц
export const getActiveCellFormula = async (setMessage, setLoading) => {
  return withLoading(setLoading, setMessage, async function getActiveCellFormula() {
    const formula = await Excel.run(async (context) => {
      const range = context.workbook.getActiveCell();
      range.load("formulas");
      await context.sync();
      return range.formulas[0][0];
    });

    setMessage(`✅ Formula: ${formula}`);
    return formula;
  });
};
// ✅ Идэвхтэй нүдний утгаар шүүх функц
export const filterByActiveCellValue = async (setMessage, setLoading) => {
  return withLoading(setLoading, setMessage, async function filterByActiveCellValue() {
    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();
      const activeCell = context.workbook.getActiveCell();

      activeCell.load(["rowIndex", "columnIndex", "values"]);
      await context.sync();

      const rowIndex = activeCell.rowIndex;
      const colIndex = activeCell.columnIndex;
      const filterValue = activeCell.values[0][0];

      const usedRange = sheet.getUsedRange();
      usedRange.load(["rowCount", "columnCount"]);
      await context.sync();

      // Filter тавих range (header + data)
      const filterRange = sheet.getRangeByIndexes(rowIndex, 0, usedRange.rowCount - rowIndex, usedRange.columnCount);
      filterRange.load("address");
      await context.sync();
      const filterRangeAddress = filterRange.address;

      // AutoFilter цэвэрлэх
      try {
        sheet.autoFilter.clear();
      } catch (e) {}

      // Шууд filter тавих (table үүсгэхгүй)
      //sheet.autoFilter.apply(filterRange, colIndex, { filterOn: Excel.FilterOn.values, values: [`*${filterValue}*`] });
      sheet.autoFilter.apply(filterRange, colIndex, {
  filterOn: Excel.FilterOn.custom,
  criterion1: `*${filterValue}*`,
  filterOperator: Excel.FilterOperator.and
});

      setMessage(`✅ "${filterValue}" утгаар filter тавигдлаа. FilterRange: ${filterRangeAddress}`);
    });
  });
};

export const clearAutoFilter = async (setMessage, setLoading) => {
  return withLoading(setLoading, setMessage, async function clearAutoFilter() {
    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();
      // AutoFilter байгаа эсэхийг шалгана
      sheet.load("autoFilter");
      await context.sync();
      if (sheet.autoFilter && sheet.autoFilter.enabled) {
        sheet.autoFilter.remove();
        setMessage("✅ AutoFilter амжилттай цэвэрлэгдлээ.");
      } else {
        setMessage("⚠️ AutoFilter байхгүй эсвэл идэвхгүй байна.");
      }
    });
  });
};

export async function fetchAccountBalanceData(setMessage, setLoading) {
  return withLoading(setLoading, setMessage, async function fetchAccountBalanceData() {
    setMessage("⏳ Дансны мэдээллийг татаж байна...");

    // Backend-ээс дансны жагсаалт татах (timeout-той)
    const res = await fetch(`${BASE_URL}/api/account`);
    if (!res.ok) throw new Error("Серверээс амжилтгүй хариу ирлээ.");
    const data = await res.json();

    // Хариу массив эсэхийг шалгая
    if (!Array.isArray(data)) {
      throw new Error("Серверийн хариу буруу форматтай байна (Array хүлээсэн).");
    }

    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getItemOrNullObject("AccountBalance");
      await context.sync();

      if (sheet.isNullObject) {
        throw new Error("⚠️ 'AccountBalance' нэртэй хуудас олдсонгүй.");
      }

      const headerRow = sheet.getRange("A5:C5");
      headerRow.load("values");
      await context.sync();

      const headers = headerRow.values[0] || [];
      const accountNameCol = headers.indexOf("Дансны нэр");
      const accountNumberCol = headers.indexOf("Дансны дугаар");
      const currencyCol = headers.indexOf("Валют");

      if (accountNameCol === -1 || accountNumberCol === -1 || currencyCol === -1) {
        throw new Error("⚠️ A5–C5 мөрөнд 'Дансны нэр', 'Дансны дугаар', 'Валют' баганууд байхгүй байна.");
      }

      // ✨ Дансны дугаараар эрэмбэлэх
      data.sort((a, b) => {
        const numA = (a["Дансны дугаар"] || "").toString();
        const numB = (b["Дансны дугаар"] || "").toString();
        return numA.localeCompare(numB, undefined, { numeric: true });
      });

      // A8-с эхлэн бичих
      const startRow = 8;
      data.forEach((item, idx) => {
        const rowIdx = startRow + idx;
        sheet.getCell(rowIdx, accountNameCol).values = [[item["Дансны нэр"] || ""]];
        sheet.getCell(rowIdx, accountNumberCol).values = [[`'${item["Дансны дугаар"] || ""}`]]; // текст болгох
        sheet.getCell(rowIdx, currencyCol).values = [[item["Валют"] || ""]];
      });

      await context.sync();
    });

    setMessage("✅ Амжилттай.");
  });
}

// Шинэ функц: Сонгосон range-д account data бичих
export async function writeAccountDataToSelectedRange(accountData, setMessage, setLoading) {
  return withLoading(setLoading, setMessage, async function writeAccountDataToSelectedRange() {
    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();
      const selectedRange = context.workbook.getSelectedRange();
      selectedRange.load("values, rowIndex, columnIndex, rowCount, columnCount");
      await context.sync();

      const selectedValues = selectedRange.values;
      if (!selectedValues || selectedValues.length === 0) {
        throw new Error("⚠️ Сонгосон range-д header алга.");
      }

      const excelHeaders = selectedValues[0];

      if (!Array.isArray(accountData) || accountData.length === 0) {
        throw new Error("⚠️ Account data хоосон байна.");
      }

      // Дансны дугаараар эрэмбэлэх
      accountData.sort((a, b) => {
        const numA = (a["Дансны дугаар"] || "").toString();
        const numB = (b["Дансны дугаар"] || "").toString();
        return numA.localeCompare(numB, undefined, { numeric: true });
      });

      // Data-г бэлтгэх - таарч байгаа header-үүдийг бичих
      const dataToWrite = accountData.map(item => {
        return excelHeaders.map(header => {
          return item[header] || "";
        });
      });

      // Header-ийн дараа бичих
      const startRow = selectedRange.rowIndex + 1;
      const startCol = selectedRange.columnIndex;
      const rangeToWrite = sheet.getRangeByIndexes(startRow, startCol, dataToWrite.length, dataToWrite[0].length);
      rangeToWrite.values = dataToWrite;
      rangeToWrite.format.autofitColumns();

      await context.sync();

      setMessage("✅ Дансны мэдээлэл амжилттай бичигдлээ.");
    });
  });
}

// Excel-д ашиглагдаж буй range-ийг export хийх функц
export async function exportSelectedRangesToXLSX(setMessage) {
  try {
    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();
      const selection = context.workbook.getSelectedRange();
      const currentRegion = selection.getSurroundingRegion();
      currentRegion.load("values, address");
      await context.sync();

      const values = currentRegion.values;
      if (!values || values.length === 0) {
        throw new Error("⚠️ CurrentRegion-д утга алга.");
      }

      const XLSX = await loadXLSX();
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(values);
      XLSX.utils.book_append_sheet(wb, ws, "CurrentRegion");

      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "CurrentRegionExport.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setMessage("✅ CurrentRegion экспорт хийгдлээ.");
    });
  } catch (error) {
    setMessage("❌ Алдаа гарлаа: " + error.message);
  }
}
export const pasteValuesOnly = async (setMessage, setLoading) => {
  return withLoading(setLoading, setMessage, async function pasteValuesOnly() {
    await Excel.run(async (context) => {
      let text = "";
      try {
        text = await navigator.clipboard.readText();
      } catch (err) {
        throw new Error("Clipboard-оос уншиж чадсангүй: " + err);
      }
      if (!text) throw new Error("Clipboard-д утга алга!");

      const range = context.workbook.getSelectedRange();
      range.load(["rowCount", "columnCount"]);
      await context.sync();

      const rows = text.split(/\r?\n/).map(row => row.split('\t'));
      // Range-ийн хэмжээнд тааруулна
      const normalizedRows = [];
      for (let i = 0; i < range.rowCount; i++) {
        const row = rows[i] || [];
        const normalizedRow = [];
        for (let j = 0; j < range.columnCount; j++) {
          normalizedRow.push(row[j] !== undefined ? row[j] : "");
        }
        normalizedRows.push(normalizedRow);
      }
      range.values = normalizedRows;
      await context.sync();
    });
    setMessage("✅ Clipboard утгыг зөвхөн value хэлбэрээр буулгалаа.");
  });
};

/**
 * Монгол хэлээр тоог үг болгон хөрвүүлэх функц
 * @param {number} number - Өөрлөх тоо (0-ээс их)
 * @returns {string} - Монгол үгээр илэрхийлэгдсэн тоо
 */
export async function handleNumberToWordsConversion(showMessage, setLoading) {
  return withLoading(setLoading, showMessage, async () => {
    try {
      await Excel.run(async (context) => {
        const range = context.workbook.getActiveCell();
        range.load("values");
        await context.sync();

        const value = range.values?.[0]?.[0];
        if (!value || isNaN(value)) {
          showMessage("⚠️ Идэвхитэй нүдэнд тоо оруулна уу.");
          return;
        }

        const numberValue = parseFloat(value);
        const words = convertNumberToWords(numberValue);
        
        const newRange = range.getOffsetRange(0, 1);
        newRange.values = [[words]];
        await context.sync();

        showMessage(`✅ "${value}" → "${words}"`);
      });
    } catch (error) {
      console.error("Алдаа:", error);
      showMessage("❌ Алдаа гарлаа: " + error.message);
    }
  });
}

/**
 * Тоог монгол хэлээр үг болгон хөрвүүлэх үндсэн функц
 * @param {number} number - Өөрлөх тоо
 * @returns {string} - Монгол үгээр илэрхийлэгдсэн тоо
 */
function convertNumberToWords(number) {
  // Монгол үгүүд (нэг, хоёр, гурав, дөрөв, таван, зургаа, доман, найман, ес)
  const ones = [
    "нэг", "хоёр", "гурав", "дөрөв", "тав", "зургаа", "долоо", "найм", "ес"
  ];
  
  // Олонлог үгүүд (нэг, хоёр, гурван, дөрвөн, таван, зургаан, доман, наймаан, есүүн)
  const onesPlural = [
    "нэг", "хоёр", "гурван", "дөрвөн", "таван", "зургаан", "долоон", "найман", "есөн"
  ];

  // Аравын ариу үгүүд (арван, хорин, гучин, дөчин, тавин, жаран, далан, наян, ерөн)
  const tens = [
    "арван", "хорин", "гучин", "дөчин", "тавин",
    "жаран", "далан", "наян", "ерөн"
  ];

  // Аравын ариу үгүүдийн олонлог (арав, хорь, гуч, дөч, тавь, жар, дал, ная, ер)
  const tensPlural = [
    "арав", "хорь", "гуч", "дөч", "тавь",
    "жар", "дал", "ная", "ер"
  ];

  // Зуутын үгүүд (нэг зуун, хоёр зуун, ...)
  const hundreds = [
    "нэг зуун", "хоёр зуун", "гурван зуун", "дөрвөн зуун",
    "таван зуун", "зургаан зуун", "долоон зуун", "найман зуун", "есөн зуун"
  ];

  // Масштабын үгүүд (мянга, сая, төрбум, их науяд, наяд)
  const scales = [
    "мянга", "сая", "тэрбум", "их наяд", "наяд"
  ];

  if (number === 0) return "тэг";
  if (number < 0) return "сөрөг " + convertNumberToWords(Math.abs(number));

  // Хүснэгт боловсруулах (3 орноор хувааж хүснэгт үүсгэх)
  const formattedNumber = String(Math.floor(number)).padStart(12, "0");
  const parts = [];
  for (let i = 0; i < 4; i++) {
    parts.push(parseInt(formattedNumber.substr(i * 3, 3)));
  }

  let result = "";

  // Илэрхийлэх хэсэг бүрийг боловсруулах
  for (let partIndex = 0; partIndex < parts.length; partIndex++) {
    const partNumber = parts[partIndex];
    let temp = "";

    if (partNumber === 0) continue;

    // Зуут
    const hundredsDigit = Math.floor(partNumber / 100);
    if (hundredsDigit > 0) {
      temp += hundreds[hundredsDigit - 1] + " ";
    }

    // Аравт
    const tensDigit = Math.floor((partNumber % 100) / 10);
    if (tensDigit > 0) {
      const isLastPart = partIndex === parts.length - 1;
      const onesDigit = partNumber % 10;
      // Always use full form (tens) - only use singular when ending in 0
      temp += tens[tensDigit - 1] + " ";
    }

    // Нэгжүүд
    const onesDigit = partNumber % 10;
    if (onesDigit > 0) {
      const isLastPart = partIndex === parts.length - 1;
      const hasTensDigit = Math.floor((partNumber % 100) / 10) > 0;
      // Last part: If has tens digit, use singular; if no tens, use plural
      if (isLastPart && hasTensDigit) {
        temp += ones[onesDigit - 1] + " ";
      } else {
        temp += onesPlural[onesDigit - 1] + " ";
      }
    }

    // Масштабын үгүүд нэмэх (сүүлийн хэсэгээс бусад бүх хэсэгт)
    if (temp && partIndex < parts.length - 1) {
      if (partIndex === parts.length - 2) {
        temp += scales[0]; // мянга
      } else if (partIndex === parts.length - 3) {
        temp += scales[1]; // сая
      } else if (partIndex === parts.length - 4) {
        temp += scales[2]; // төрбум
      }
      temp += " ";
    }

    result += temp;
  }

  // Сүүлийн цифрийн аравтын байрны үгийг олонлогоос ганц хэлбэрт хөрвүүлэх
  // (зөвхөн аравтын байрт нэгжийн байр байхгүй үед)
  const lastPart = parts[parts.length - 1];
  if (lastPart > 0 && lastPart % 10 === 0) {
    // Зөвхөн аравтын байр байгаа бол (жнь: 10, 20, 30... 90)
    result = replaceLastWord(result, "арван", "арав");
    result = replaceLastWord(result, "хорин", "хорь");
    result = replaceLastWord(result, "гучин", "гуч");
    result = replaceLastWord(result, "дөчин", "дөч");
    result = replaceLastWord(result, "тавин", "тавь");
    result = replaceLastWord(result, "жаран", "жар");
    result = replaceLastWord(result, "далан", "дал");
    result = replaceLastWord(result, "наян", "ная");
    result = replaceLastWord(result, "ерөн", "ер");
  }

  return result.trimRight();
}

/**
 * Текстийн сүүлийн үгийг сольж өөрчлөх функц
 * @param {string} text - Анхны текст
 * @param {string} oldWord - Өөрлөх үг
 * @param {string} newWord - Шинэ үг
 * @returns {string} - Өөрлөгдсөн текст
 */
function replaceLastWord(text, oldWord, newWord) {
  const trimmed = text.trimRight();
  if (trimmed.endsWith(oldWord)) {
    return trimmed.slice(0, -oldWord.length) + newWord;
  }
  return text;
}


