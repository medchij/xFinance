import React, { useState, useEffect } from "react";
import {Button, Input, Checkbox, Switch } from "@fluentui/react-components";
import { Search16Regular, ArrowSortUp16Regular, ArrowSortDown16Regular,ArrowUndoRegular,CheckmarkRegular, ArrowClockwise16Regular } from "@fluentui/react-icons";
import { getActiveCellFormula, setActiveCellValue } from "../xFinance";
import { getSettingValue } from "../apiHelpers"; // ЗАСВАР: loadSettings-г устгав
import { useAppContext } from "./AppContext";

const SearchTableSheet = ({ isOpen, onClose }) => {
  // ЗАСВАР: AppContext-ээс settings болон fetchSettings-г авна
  const { setLoading, showMessage, settings, fetchSettings, selectedCompany } = useAppContext();
  const [searchText, setSearchText] = useState("");
  const [data, setData] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [previousValue, setPreviousValue] = useState(null);
  const [hideSelected, setHideSelected] = useState(false);
  const [lastKey, setLastKey] = useState(null);
  const [sortConfig, setSortConfig] = useState([]);

  useEffect(() => {
    if (isOpen && selectedCompany) {
      // Эхлээд тохиргоог (кэшээс) ачаална, дараа нь sheet-н датаг уншина
      fetchSettings(false).then(() => {
        fetchDataFromSheet();
      });
    }
  }, [isOpen, selectedCompany]); // Компани сонгогдсон үед ажиллана

  const fetchDataFromSheet = async () => {
    try {
      // ЗАСВАР: AppContext-ээс авсан settings-г шууд ашиглана
      if (settings.length === 0) {
        await fetchSettings(true); // Cache хоосон бол settings-г хүчээр дахин татна

        if (settings.length === 0) {
          showMessage("⚠️ Тохиргоо ачаалагдаагүй байна. Settings хуудсыг шалгана уу.", 0);
          return;
        }
      }

      const sheetname = getSettingValue(settings, "sheetname");
      if (!sheetname) throw new Error("⚠️ 'sheetname' тохиргоо олдсонгүй");

      await Excel.run(async (context) => {
        const sheet = context.workbook.worksheets.getItem(sheetname);
        const usedRange = sheet.getUsedRange();
        usedRange.load("values");
        await context.sync();

        const values = usedRange.values;
        if (values.length < 2) throw new Error("⚠️ Sheet-д шаардлагатай мэдээлэл алга байна");

        const header = values[0];
        const rows = values.slice(1);
        const lastColKey = header[header.length - 1];
        setLastKey(lastColKey);

        const parsed = rows.map((row, i) => {
          const item = {};
          header.forEach((key, idx) => {
            item[key] = formatCellValue(row[idx], key);
          });
          item.__index = i + 1;
          item.__lastKey = lastColKey;
          item.__lastValue = row[header.length - 1];
          return item;
        });
        setData(parsed);
      });
    } catch (err) {
      console.error("❌ Sheet-ээс уншихад алдаа:", err);
      showMessage("❌ " + err.message);
    }
  };

  const formatCellValue = (value, columnName = "") => {
    const lowerCol = columnName.toLowerCase();
    const isDateColumn = lowerCol.includes("огноо") || lowerCol.includes("date");

    if (isDateColumn && typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 60000) {
      const excelEpoch = new Date(1899, 11, 30);
      const dateObj = new Date(excelEpoch.getTime() + (value + 1) * 86400000);
      return dateObj.toISOString().split("T")[0];
    }

    if (typeof value === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    const num = parseFloat(value);
    if (!isNaN(num) && Number.isFinite(num) && value.toString().length <= 15) {
      return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    }

    return value;
  };

  const handleSort = (key) => {
    setSortConfig((prev) => {
      const existing = prev.find((item) => item.key === key);
      if (existing) {
        const direction = existing.direction === "ascending" ? "descending" : "ascending";
        return prev.map((item) => (item.key === key ? { ...item, direction } : item));
      } else {
        return [...prev, { key, direction: "ascending" }];
      }
    });
  };

  const handleRowClick = async (row) => {
    try {
      const formula = await getActiveCellFormula(showMessage, setLoading);
      
      // Хэрэв нүд хоосон биш бол бичихгүй
      if (formula !== null && formula !== undefined && formula !== "") {
        showMessage("⚠️ Сонгосон нүд хоосон биш байна. Хоосон нүд рүү шилжүүлнэ үү.");
        return;
      }
      
      setPreviousValue(formula);
      setSelectedRow(row);

      const insertValue = row[0] || Object.values(row)[0];
      await setActiveCellValue(insertValue, showMessage, setLoading);

      const rowIndex = row.__index;
      const lastKeyName = row.__lastKey || lastKey || "Сонгосон эсэх";

      setData((prev) =>
        prev.map((r) =>
          r.__index === rowIndex ? { ...r, [lastKeyName]: "✅ Сонгосон", __lastValue: "✅ Сонгосон" } : r
        )
      );

      await Excel.run(async (context) => {
        // ЗАСВАР: AppContext-ээс авсан settings-г шууд ашиглана
        const sheetname = getSettingValue(settings, "sheetname");
        const sheet = context.workbook.worksheets.getItem(sheetname);
        const usedRange = sheet.getUsedRange();
        usedRange.load("values,columnCount");
        await context.sync();

        let lastColIndex = usedRange.columnCount;
        const headers = usedRange.values[0];
        if (!headers.includes("Сонгосон эсэх")) {
          sheet.getCell(0, lastColIndex).values = [["Сонгосон эсэх"]];
          await context.sync();
        } else {
          lastColIndex = headers.indexOf("Сонгосон эсэх");
        }

        sheet.getCell(rowIndex, lastColIndex).values = [["✅ Сонгосон"]];
        await context.sync();
      });
    } catch (error) {
      showMessage("❌ Алдаа: " + error.message);
    }
  };

 
       const handleUndoSelection = async () => {
      if (previousValue !== null && selectedRow) {
        await setActiveCellValue(previousValue, showMessage, setLoading);
        // Excel sheet дээр утгыг хоослох
        try {
          const sheetname = getSettingValue(settings, "sheetname");
          const rowIndex = selectedRow.__index ; // Excel API-д 0-based index
          const lastKeyName = selectedRow.__lastKey || lastKey || "Сонгосон эсэх";
          await Excel.run(async (context) => {
            const sheet = context.workbook.worksheets.getItem(sheetname);
            const usedRange = sheet.getUsedRange();
            usedRange.load("values,columnCount");
            await context.sync();
            let lastColIndex = usedRange.columnCount;
            const headers = usedRange.values[0];
            if (!headers.includes("Сонгосон эсэх")) {
              showMessage("⚠️ 'Сонгосон эсэх' багана олдсонгүй!");
              return;
            } else {
              lastColIndex = headers.indexOf("Сонгосон эсэх");
            }
            sheet.getCell(rowIndex, lastColIndex).values = [[""]];
            await context.sync();
            showMessage(`Excel-д мөр ${rowIndex + 1}, багана ${lastColIndex + 1} утгыг хоосоллоо.`);
          });
        } catch (err) {
          showMessage("❌ Сонгосон баганыг хоослох үед алдаа: " + err.message);
        }
        // React state дээрх утгыг буцаахын тулд sheet-ээс дахин уншина
        await fetchDataFromSheet();
        setSelectedRow(null);
        setPreviousValue(null);
        //showMessage("↩️ Сонголт буцаагдлаа.");
      }
    };
  
    const handleConfirmAndClose = () => {
      setSelectedRow(null);
      setPreviousValue(null);
      onClose();
    };

  const filteredData = data.filter((row) => {
    const textMatch = Object.values(row).some((v) => v?.toString().toLowerCase().includes(searchText.toLowerCase()));
    const hideMatch = hideSelected ? (row.__lastValue !== "✅ Сонгосон" && !Object.values(row).some(v => v === "ББӨ")) : true;
    return textMatch && hideMatch;
  });

  const clearSort = () => {
    setSortConfig([]);
  };

  const sortedData = [...filteredData].sort((a, b) => {
    for (const { key, direction } of sortConfig) {
      const aVal = a[key];
      const bVal = b[key];

      const aStr = aVal?.toString().trim();
      const bStr = bVal?.toString().trim();

      const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v);
      const aIsDate = isDate(aStr);
      const bIsDate = isDate(bStr);

      let result = 0;

      if (aIsDate && bIsDate) {
        result = new Date(aStr) - new Date(bStr);
      } else {
        const aNum = parseFloat(aStr.replace(/[, ]/g, ""));
        const bNum = parseFloat(bStr.replace(/[, ]/g, ""));

        const aIsNum = !isNaN(aNum) && isFinite(aNum);
        const bIsNum = !isNaN(bNum) && isFinite(bNum);

        if (aIsNum && bIsNum) {
          result = aNum - bNum;
        } else {
          result = aStr.localeCompare(bStr, undefined, {
            numeric: true,
            sensitivity: "base",
          });
        }
      }

      if (result !== 0) return direction === "ascending" ? result : -result;
    }
    return 0;
  });

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>📋Sheet-ээс хайх</h2>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: "10px" }}>
          <Input
            appearance="outline"
            contentBefore={<Search16Regular />}
            placeholder="Хайлт хийх..."
            value={searchText}
            onChange={(_, d) => setSearchText(d.value)}
            style={{ flex: 1 }}
          />
          <Button 
            appearance="secondary" 
            size="small"
            icon={<ArrowClockwise16Regular />}
            onClick={fetchDataFromSheet}
            title="Дата шинэчлэх"
          >
            Шинэчлэх
          </Button>
          <span style={{ marginLeft: 16 }}>Сонгосон мөрийг нуух</span>
          <Switch
            checked={hideSelected}
            onChange={(_, data) => setHideSelected(data.checked)}
            aria-label="Сонгосон мөрийг Excel-ээс түр нуух"
          />
          <span style={{ marginLeft: 16 }}>Сорт арилгах</span>
           <Switch
            checked={sortConfig.length === 0}
            onChange={() => clearSort()}
            aria-label="Сорт арилгах"
          />
          
        </div>
        
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                {Object.keys(data[0] || {})
                  .filter((k) => !k.startsWith("__"))
                  .map((key) => {
                    const sortIndex = sortConfig.findIndex((c) => c.key === key);
                    const sortItem = sortConfig[sortIndex];
                    const sortIcon = sortItem ? (
                      sortItem.direction === "ascending" ? (
                        <ArrowSortUp16Regular />
                      ) : (
                        <ArrowSortDown16Regular />
                      )
                    ) : null;

                    return (
                      <th key={key} style={{ ...styles.th, cursor: "pointer" }} onClick={() => handleSort(key)}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span>{key}</span>
                          {sortIcon}
                          {sortIndex >= 0 && <span style={{ fontSize: "10px", opacity: 0.5 }}>({sortIndex + 1})</span>}
                        </div>
                      </th>
                    );
                  })}
              </tr>
            </thead>
            <tbody>
              {sortedData.map((row, idx) => (
                <tr key={idx} style={styles.tr} onDoubleClick={() => handleRowClick(row)}>
                  {Object.entries(row)
                    .filter(([k]) => !k.startsWith("__"))
                    .map(([k, val], i) => (
                      <td key={i} style={styles.td}>
                        {val}
                      </td>
                    ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: "15px", textAlign: "right" }}>
          {selectedRow ? (
            <>
              <Button icon={<ArrowUndoRegular />} onClick={handleUndoSelection}>
                Буцаах
              </Button>
              <Button appearance="primary" icon={<CheckmarkRegular />} onClick={handleConfirmAndClose}>
                Баталгаажуулах
              </Button>
            </>
          ) : (
            <button style={styles.closeButton} onClick={onClose}>
              Хаах
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "rgba(0,0,0,0.3)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modal: {
    width: "90%",
    maxWidth: "1000px",
    background: "#fff",
    padding: "20px",
    borderRadius: "8px",
    maxHeight: "85vh",
    overflowY: "auto",
  },
  title: {
    fontSize: "14px",
    marginBottom: "10px",
    borderBottom: "1px solid #ddd",
    paddingBottom: "5px",
  },
  tableContainer: {
    border: "1px solid #ccc",
    borderRadius: "4px",
    maxHeight: "70vh",
    overflow: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "auto",
  },
  th: {
    background: "#f0f0f0",
    padding: "8px",
    border: "1px solid #ccc",
    fontSize: "12px",
    position: "sticky",
    top: 0,
    zIndex: 1,
    whiteSpace: "nowrap",
  },
  td: {
    padding: "6px",
    border: "1px solid #eee",
    fontSize: "12px",
    maxWidth: "200px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  tr: {
    cursor: "pointer",
    transition: "background 0.2s",
  },
  selectedRow: {
    background: "#e6f7ff",
    padding: "8px",
    marginBottom: "10px",
    borderRadius: "4px",
    fontSize: "8px",
  },
  undoButton: {
    background: "#e74c3c",
    color: "#fff",
    border: "none",
    padding: "5px 10px",
    marginLeft: "10px",
    cursor: "pointer",
    borderRadius: "4px",
  },
  closeButton: {
    background: "#ccc",
    border: "none",
    padding: "8px 15px",
    cursor: "pointer",
    borderRadius: "4px",
  },
};

export default SearchTableSheet;
