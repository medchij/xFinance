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

      if (sheetExists && !confirmStatus) {
        const usedRange = sheet.getRange("A:A").getUsedRangeOrNullObject();
        usedRange.load("rowCount");
        await context.sync();
        startRow = usedRange.isNullObject ? 0 : usedRange.rowCount;

        setMessage("⚠️ Хуучин өгөгдлийг хадгалж, үргэлжлүүлж бичлээ.");
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }

      const rows = sheetData.length;
      const columns = sheetData.reduce((max, row) => Math.max(max, row.length), 0);

      if (rows === 0 || columns === 0) {
        throw new Error("❌ SheetData хоосон байна!");
      }

      if (sheetName === "Import" && columns > 13) {
        throw new Error("❌ Баганын тоо 13-аас хэтэрсэн байна!");
      }

      const normalizedData = sheetData.map((row) =>
        row.length === columns ? row : [...row, ...Array(columns - row.length).fill("")]
      );

      const range = sheet.getRangeByIndexes(startRow, 0, rows, columns); // ✨ Нэмэх эсвэл A1-с бичих
      range.values = normalizedData;
      range.format.autofitColumns();
      range.format.autofitRows();

      sheet.activate();
      await context.sync();

      const message = `✅ "${sheetName}" sheet дээр өгөгдөл амжилттай бичигдлээ!`;
      setMessage(message);
      return { message, success: true };
    });
  });
}

export async function insertText(text) {
  // Write text to the top left cell.
  try {
    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();
      const range = sheet.getRange("A1");
      range.values = [[text]];
      range.format.autofitColumns();
      await context.sync();
    });
  } catch (error) {
    // Error handling without console output
  }
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
    let filterRange;
    let filterValue;

    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();
      const activeCell = context.workbook.getActiveCell();

      activeCell.load(["rowIndex", "columnIndex", "values"]);
      await context.sync();

      const rowIndex = activeCell.rowIndex;
      const colIndex = activeCell.columnIndex;
      filterValue = activeCell.values[0][0];

      const usedRange = sheet.getUsedRange();
      usedRange.load(["rowCount", "columnCount"]);
      await context.sync();

      const rowRange = sheet.getRangeByIndexes(rowIndex, 0, 1, usedRange.columnCount);
      const lastCellInRow = rowRange.getLastCell();
      lastCellInRow.load("columnIndex");
      await context.sync();

      const lastColIndex = lastCellInRow.columnIndex;
      const totalRows = usedRange.rowCount;
      const dataRowCount = totalRows - rowIndex;

      if (dataRowCount <= 1) {
        throw new Error("⚠️ Доош мөр алга байна.");
      }

      filterRange = sheet.getRangeByIndexes(rowIndex, colIndex, dataRowCount, 1);
      filterRange.load("address");
      await context.sync();

      // AutoFilter цэвэрлэх
      try {
        sheet.autoFilter.clear();
      } catch (e) {
        // AutoFilter байхгүй эсвэл цэвэрлэгдсэн
      }

      sheet.tables.load("items");
      await context.sync();

      sheet.tables.items.forEach((table) => table.convertToRange());
      await context.sync();

      const table = sheet.tables.add(filterRange.address, true);
      table.name = "FilteredTable";
      table.style = "TableStyleLight1";
      table.showBandedRows = false;
      table.showBandedColumns = false;
      table.getHeaderRowRange().format.fill.clear();
      table.getHeaderRowRange().format.font.bold = false;

      table.columns.getItemAt(0).filter.applyCustomFilter(`*${filterValue}*`, null);

      const msg = `✅ "${filterValue}" утгаар filter тавигдлаа. FilterRange: ${filterRange.address}`;
      setMessage(msg);
    });
  });
};

export const clearAutoFilter = async (setMessage, setLoading) => {
  return withLoading(setLoading, setMessage, async function clearAutoFilter() {
    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();

      const tables = sheet.tables;
      tables.load("items/name");
      await context.sync();

      const filteredTable = tables.items.find((t) => t.name === "FilteredTable");
      if (!filteredTable) {
        throw new Error("⚠️ 'FilteredTable' нэртэй хүснэгт олдсонгүй.");
      }

      filteredTable.clearFilters();
      await context.sync();

      const range = filteredTable.getRange();
      range.load(["columnCount", "values", "format"]);
      await context.sync();

      filteredTable.convertToRange();
      await context.sync();

      const headerRow = range.getRow(0);
      headerRow.load("values");
      await context.sync();

      const originalValues = headerRow.values[0];
      const cleanedValues = originalValues.map((v) =>
        typeof v === "string" && v.toLowerCase().includes("column") ? "" : v
      );

      headerRow.values = [cleanedValues];
      await context.sync();
    });

    setMessage("✅ FilteredTable амжилттай цэвэрлэгдлээ.");
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