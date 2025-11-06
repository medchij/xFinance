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

  return (
  <Dialog open={open} >
  <DialogSurface style={{ width: "90vw", maxWidth: "90vw" }}>
  <DialogBody style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 0, }}>
          <div
            style={{
              padding: 12,
              minWidth: 0,
              width: "100%",
              maxWidth: "100vw",
              maxHeight: "90vh",
              overflowY: "auto",
              margin: "12px auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-start"
            }}
          >
            <DialogTitle as="h2" style={{ fontWeight: 700, fontSize: 22, marginBottom: 20, textAlign: "center" }}>
              Данс болон огноо сонгох
            </DialogTitle>
            {/* Form section - top */}
            <div style={{ minHeight: 80, marginBottom: 12, width: "100%" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  flexWrap: "wrap",
                  alignItems: "flex-end",
                  gap: 12,
                  minWidth: 0,
                  width: "100%",
                  maxWidth: "90vw",
                }}
              >
                <div style={{ flex: 1, minWidth: 100, maxWidth: 220, width: "100%" }}>
                  <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Данс</label>
                  <Dropdown
                    value={account}
                    onChange={(_, data) => setAccount(data.value)}
                    style={{ width: "100%", minWidth: 80 }}
                  >
                    {accountList.map((acc) => (
                      <Option key={acc} value={acc}>{acc}</Option>
                    ))}
                  </Dropdown>
                </div>
                <div style={{ flex: 1, minWidth: 100, maxWidth: 180, width: "100%" }}>
                  <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Эхлэх</label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(_, data) => setFromDate(data.value)}
                    style={{ width: "100%", minWidth: 80 }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 100, maxWidth: 180, width: "100%" }}>
                  <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Дуусах</label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(_, data) => setToDate(data.value)}
                    style={{ width: "100%", minWidth: 80 }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 100, maxWidth: 180, width: "100%"  }}>
                <Button appearance="primary" onClick={handleSearch}>Хайх</Button>
              </div>
              </div>
              {error && <div style={{ color: "#d32f2f", marginTop: 8, fontWeight: 500 }}>{error}</div>}
              {/* Action buttons below, left-aligned */}
              
            </div>
            {/* Table/results section - full width below, scrollable if needed */}
            <div style={{ width: "100%", marginTop: 8, maxHeight: 220, overflowY: "auto", minWidth: 0 }}>
              {resultMessage && (
                <div style={{ color: (Array.isArray(tableHeaders) && tableHeaders.length > 0) ? "#388e3c" : "#d32f2f", marginBottom: 14, fontWeight: 500, fontSize: 15 }}>{resultMessage}</div>
              )}
              {Array.isArray(tableHeaders) && tableHeaders.length > 0 && Array.isArray(tableRows) && tableRows.length > 0 && (
                <>
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
                    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "auto", minWidth: 400 }}>
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
          </div>
           <div style={{ display: "flex", flexDirection: "row", gap: 12, marginTop: 16, flexWrap: "wrap", width: "100%" }}>
                <Button appearance="secondary" onClick={onClose}>Хаах</Button>
              </div>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
