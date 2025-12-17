import React, { useState } from "react";
import { getAuthToken, getSelectedCompany } from "../../config/token";
import { loadSettings, getSettingValue } from "../apiHelpers";
import { useAppContext } from "./AppContext";
import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogActions,
  Button,
  Dropdown,
  Option,
  Input,
} from "@fluentui/react-components";
import { Search20Regular, ArrowDownload20Regular, DocumentTableArrowRight20Regular, DocumentPdf20Regular } from "@fluentui/react-icons";
 
export default function AccountDateDialog({ open, onClose, onSearch }) {
  const [searchText, setSearchText] = useState("");
  const { setLoading, showMessage } = useAppContext();
  const [accountList, setAccountList] = React.useState([]);
  const [account, setAccount] = React.useState("");
  const [fromDate, setFromDate] = React.useState("");
  const [toDate, setToDate] = React.useState("");
  const [error, setError] = React.useState("");
  // Үр дүн хадгалах state
  const [tableHeaders, setTableHeaders] = React.useState([]);
  const [tableRows, setTableRows] = React.useState([]);
  const [resultMessage, setResultMessage] = React.useState("");

  React.useEffect(() => {
    async function fetchAccounts() {
      const companyId = getSelectedCompany();
      const settings = await loadSettings(companyId);
      const accountListSetting = getSettingValue(settings, "account_list");
      if (accountListSetting) {
        const list = accountListSetting.split(",").map((a) => a.trim()).filter(Boolean);
        setAccountList(list);
        setAccount(list[0] || "");
      } else {
        setError("Тохиргоонд account_list байхгүй байна. Админд хандана уу.");
        setAccountList([]);
        setAccount("");
      }
    }
    if (open) {
      fetchAccounts();
      // Set default dates: fromDate = 1 month ago, toDate = today
      const today = new Date();
      const toDateStr = today.toISOString().split("T")[0];
      const prevMonth = new Date(today);
      prevMonth.setMonth(today.getMonth() - 1);
      const fromDateStr = prevMonth.toISOString().split("T")[0];
      setFromDate(fromDateStr);
      setToDate(toDateStr);
    }
  }, [open]);

  const handleSearch = async () => {
    if (!account || !fromDate || !toDate) {
      setError("Бүх талбарыг бөглөнө үү!");
      return;
    }
    setError("");
    setResultMessage("");
    setTableHeaders([]);
    setTableRows([]);
    try {
      // onSearch-г дуудаж, үр дүнг авна (headers, rows-г буцаадаг гэж үзнэ)
      const result = await onSearch({ account, fromDate, toDate });
      const headers = result && result.headers ? result.headers : [];
      const rows = result && result.rows ? result.rows : [];
      //console.log("[TEST] rows:", rows); // Тестийн зорилгоор нэмсэн
      setTableHeaders(headers);
      setTableRows(rows);
      if (!(Array.isArray(rows) && rows.length > 0)) {
        setResultMessage("Амжилттай. Гэхдээ үр дүн хоосон байна.");
      } else {
        setResultMessage("");
      }
    } catch (e) {
      setResultMessage(e.message || "Алдаа гарлаа.");
    }
  };

  // Filter tableRows by searchText
  const filteredRows = searchText.trim()
    ? tableRows.filter(row => row.some(cell => String(cell).toLowerCase().includes(searchText.toLowerCase())))
    : tableRows;

  // Calculate income and expense from filtered rows
  const calculateTotals = () => {
    let income = 0;
    let expense = 0;
    
    filteredRows.forEach(row => {
      // Assuming the amount column is the 3rd column (index 2) or has "Debit" in header
      const debitIndex = tableHeaders.findIndex(h => h.toLowerCase().includes('debit') || h.toLowerCase().includes('дебет'));
      const creditIndex = tableHeaders.findIndex(h => h.toLowerCase().includes('credit') || h.toLowerCase().includes('кредит'));
      
      if (debitIndex >= 0 && row[debitIndex]) {
        const amount = parseFloat(String(row[debitIndex]).replace(/,/g, '')) || 0;
        if (amount < 0) expense += Math.abs(amount);
        else if (amount > 0) income += amount;
      }
      if (creditIndex >= 0 && row[creditIndex]) {
        const amount = parseFloat(String(row[creditIndex]).replace(/,/g, '')) || 0;
        if (amount < 0) expense += Math.abs(amount);
        else if (amount > 0) income += amount;
      }
    });
    
    return { income, expense };
  };

  const { income, expense } = calculateTotals();

  // Export helpers
  const buildCSV = (headers, rows) => {
    const escapeCell = (cell) => {
      const s = String(cell ?? "");
      // Escape quotes and wrap if needed
      if (s.includes(",") || s.includes("\n") || s.includes("\"")) {
        return '"' + s.replace(/\"/g, '""') + '"';
      }
      return s;
    };
    const headerLine = headers.map(escapeCell).join(",");
    const rowLines = rows.map(r => r.map(escapeCell).join(","));
    return [headerLine, ...rowLines].join("\n");
  };

  const downloadBlob = (content, mime, filename) => {
    try {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error", err);
    }
  };

  const exportToCSV = () => {
    if (!tableHeaders.length || !filteredRows.length) return;
    const csv = buildCSV(tableHeaders, filteredRows);
    downloadBlob(csv, "text/csv;charset=utf-8;", `transactions_${account}_${fromDate}_${toDate}.csv`);
  };

  const exportToExcel = () => {
    // Generate a simple HTML table and save with .xls so Excel opens it.
    if (!tableHeaders.length || !filteredRows.length) return;
    const styles = `
      <style>
        table { border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 6px; font-size: 12px; }
        th { background: #f0f0f0; }
      </style>
    `;
    const headerHtml = `<tr>${tableHeaders.map(h => `<th>${String(h)}</th>`).join("")}</tr>`;
    const rowsHtml = filteredRows.map(r => `<tr>${r.map(c => `<td>${String(c)}</td>`).join("")}</tr>`).join("");
    const html = `<!doctype html><html><head>${styles}</head><body>
      <table><thead>${headerHtml}</thead><tbody>${rowsHtml}</tbody></table>
    </body></html>`;
    downloadBlob(html, "application/vnd.ms-excel;charset=utf-8;", `transactions_${account}_${fromDate}_${toDate}.xls`);
  };

  const exportToPDF = () => {
    if (!tableHeaders.length || !filteredRows.length) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const styles = `
      <style>
        body { font-family: Arial, sans-serif; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 6px; font-size: 12px; }
        th { background: #f0f0f0; }
        h2 { font-size: 16px; margin: 0 0 8px; }
      </style>
    `;
    const headerHtml = `<tr>${tableHeaders.map(h => `<th>${String(h)}</th>`).join("")}</tr>`;
    const rowsHtml = filteredRows.map(r => `<tr>${r.map(c => `<td>${String(c)}</td>`).join("")}</tr>`).join("");
    win.document.write(`<!doctype html><html><head>${styles}</head><body>
      <h2>Гүйлгээний тайлан (${account})</h2>
      <div>Хугацаа: ${fromDate} → ${toDate}</div>
      <div>Нийт гүйлгээ: ${filteredRows.length} | Орлого: ${income.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | Зарлага: ${expense.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      <table><thead>${headerHtml}</thead><tbody>${rowsHtml}</tbody></table>
    </body></html>`);
    win.document.close();
    win.focus();
    // Trigger print dialog; user can save as PDF
    win.print();
  };

  return (
  <Dialog open={open} >
  <DialogSurface style={{ width: "auto", maxWidth: "95vw", minWidth: "min(400px, 90vw)" }}>
  <DialogBody style={{ display: "flex", flexDirection: "column", padding: 1 }}>
            <DialogTitle as="h3" style={{ fontWeight: 600, fontSize: 16, marginBottom: 12, textAlign: "left" }}>
              Данс сонгох
            </DialogTitle>
            {/* Form section - top */}
            <div style={{ marginBottom: 16, width: "100%" }}>
              <div style={{ marginBottom: 8 }}>
                <Dropdown
                  value={account}
                  selectedOptions={[account]}
                  onOptionSelect={(_, data) => setAccount(data.optionValue)}
                  style={{ width: "100%", minWidth: "140px" }}
                >
                  {accountList.map((acc) => (
                    <Option key={acc} value={acc}>{acc}</Option>
                  ))}
                </Dropdown>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: 8,
                  alignItems: "center",
                  width: "100%",
                  flexWrap: "wrap"
                }}
              >
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(_, data) => setFromDate(data.value)}
                  style={{ width: "140px", minWidth: "120px", flex: "0 1 140px" }}
                />
                <span style={{ fontSize: 18, color: "#999", padding: "0 4px", flexShrink: 0 }}>→</span>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(_, data) => setToDate(data.value)}
                  style={{ width: "140px", minWidth: "120px", flex: "0 1 140px" }}
                />
              </div>
              {/* Quick range buttons under date line */}
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
                <Button 
                  appearance="secondary" 
                  size="small"
                  onClick={() => {
                    const today = new Date().toISOString().split("T")[0];
                    setFromDate(today);
                    setToDate(today);
                  }}
                >
                  Өнөөдөр
                </Button>
                <Button 
                  appearance="secondary" 
                  size="small"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 1);
                    const y = d.toISOString().split("T")[0];
                    setFromDate(y);
                    setToDate(y);
                  }}
                >
                  Өчигдөр
                </Button>
                <Button 
                  appearance="secondary" 
                  size="small"
                  onClick={() => {
                    const today = new Date();
                    const toDateStr = today.toISOString().split("T")[0];
                    const sevenDaysAgo = new Date(today);
                    sevenDaysAgo.setDate(today.getDate() - 7);
                    const fromDateStr = sevenDaysAgo.toISOString().split("T")[0];
                    setFromDate(fromDateStr);
                    setToDate(toDateStr);
                  }}
                >
                  7 хоног
                </Button>
                <Button 
                  appearance="secondary" 
                  size="small"
                  onClick={() => {
                    const today = new Date();
                    const toDateStr = today.toISOString().split("T")[0];
                    const oneMonthAgo = new Date(today);
                    oneMonthAgo.setMonth(today.getMonth() - 1);
                    const fromDateStr = oneMonthAgo.toISOString().split("T")[0];
                    setFromDate(fromDateStr);
                    setToDate(toDateStr);
                  }}
                >
                  1 сар
                </Button>
                <Button 
                  appearance="secondary" 
                  size="small"
                  onClick={() => {
                    const today = new Date();
                    const toDateStr = today.toISOString().split("T")[0];
                    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    const fromDateStr = startOfMonth.toISOString().split("T")[0];
                    setFromDate(fromDateStr);
                    setToDate(toDateStr);
                  }}
                >
                  Сарын эхнээс
                </Button>
                <Button 
                  appearance="primary" 
                  onClick={handleSearch}
                  icon={<Search20Regular />}
                  style={{ minWidth: "40px", padding: "6px" }}
                />
              </div>
              {error && <div style={{ color: "#d32f2f", marginTop: 8, fontWeight: 500, fontSize: 13 }}>{error}</div>}
            </div>
            {/* Table/results section - full width below, scrollable if needed */}
            <div style={{ width: "100%", marginTop: 8, maxHeight: 400, overflowY: "auto", minWidth: 0, }}>
              {resultMessage && (
                <div style={{ color: (Array.isArray(tableHeaders) && tableHeaders.length > 0) ? "#388e3c" : "#d32f2f", marginBottom: 14, fontWeight: 500, fontSize: 15 }}>{resultMessage}</div>
              )}
              {Array.isArray(tableHeaders) && tableHeaders.length > 0 && Array.isArray(tableRows) && tableRows.length > 0 && (
                <>
                  {/* Summary statistics */}
                  <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                      <div style={{ fontSize: 14 }}>
                        <strong>Нийт гүйлгээний тоо:</strong> {filteredRows.length}
                      </div>
                      <div style={{ fontSize: 14, color: "#2e7d32" }}>
                        <strong>Орлого:</strong> {income.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div style={{ fontSize: 14, color: "#d32f2f" }}>
                        <strong>Зарлага:</strong> {expense.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button appearance="subtle" size="small" title="Export to Excel" icon={<DocumentTableArrowRight20Regular />} onClick={exportToExcel}>
                        Excel
                      </Button>
                      <Button appearance="subtle" size="small" title="Export to CSV" icon={<ArrowDownload20Regular />} onClick={exportToCSV}>
                        CSV
                      </Button>
                      <Button appearance="subtle" size="small" title="Export to PDF" icon={<DocumentPdf20Regular />} onClick={exportToPDF}>
                        PDF
                      </Button>
                    </div>
                  </div>
                  <div style={{ marginBottom: 8, display: "flex", justifyContent: "flex-end" }}>
                    <input
                      type="text"
                      value={searchText}
                      onChange={e => setSearchText(e.target.value)}
                      placeholder="Хүснэгтээс хайх..."
                      style={{ padding: 6, borderRadius: 4, border: "1px solid #ccc", minWidth: 180 }}
                    />
                  </div>
                  <div style={{ border: "1px solid #ccc", borderRadius: 4, maxHeight: "50vh", overflow: "auto", marginTop: 8, minWidth: 0 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "auto", minWidth: 400, minHeight: "100%" }}>
                      <thead>
                        <tr>
                          {tableHeaders.map((col, idx) => (
                            <th
                              key={idx}
                              style={{
                                background: "#f0f0f0",
                                padding: "8px",
                                border: "1px solid #ccc",
                                fontSize: "12px",
                                position: "sticky",
                                top: 0,
                                zIndex: 1,
                                whiteSpace: "nowrap"
                              }}
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.map((row, i) => (
                          <tr key={i} style={{ cursor: "pointer", transition: "background 0.2s" }}>
                            {row.map((cell, j) => (
                              <td
                                key={j}
                                style={{
                                  padding: "6px",
                                  border: "1px solid #eee",
                                  fontSize: "12px",
                                  maxWidth: "200px",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap"
                                }}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
           <div style={{ display: "flex", flexDirection: "row", gap: 12, marginTop: 16, justifyContent: "flex-end" }}>
                <Button appearance="secondary" onClick={onClose}>Хаах</Button>
              </div>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
