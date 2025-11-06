import React, { useState, useEffect } from "react";
import { Input, TabList, Tab, Button } from "@fluentui/react-components";
import { Search16Regular, ArrowClockwise16Regular, CheckmarkRegular, ArrowUndoRegular } from "@fluentui/react-icons";
import { setActiveCellValue, getActiveCellFormula } from "../xFinance";
import { useAppContext } from "./AppContext";
import { useActivityTracking, useModalTracking, useTabTracking, useSearchTracking } from "../hooks/useActivityTracking";

const SearchAccount = ({ isOpen, onClose, onSelect }) => {
  const { selectedCompany, setLoading, showMessage, searchData, fetchSearchData, loading } = useAppContext();

  const [activeTab, setActiveTab] = useState("account");
  const [searchText, setSearchText] = useState("");
  const [selectedRow, setSelectedRow] = useState(null);
  const [previousValue, setPreviousValue] = useState(null);

  // Activity tracking hooks
  const { trackExcelAction } = useActivityTracking("SearchAccount");
  useModalTracking("SearchAccount", isOpen);
  useTabTracking(activeTab, "SearchAccount");
  const { trackSearch, trackSelection } = useSearchTracking("account_search");
  const [hoveredRow, setHoveredRow] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedRow(null);
      setPreviousValue(null);
      setHoveredRow(null);
      fetchSearchData(false);
    }
  }, [isOpen, fetchSearchData]);

  const handleRefresh = () => {
    trackSearch("refresh", activeTab);
    showMessage("Мэдээллийг дахин ачааллаж байна...");
    fetchSearchData(true);
  };

  const handleRowClick = async (row, valueToInsert) => {
    try {
       const currentFormula = await getActiveCellFormula(showMessage, setLoading);
      setSelectedRow(row);
      trackSelection(activeTab, row.id || row.account_number || row.cf_number, valueToInsert);
      if (currentFormula !== null && currentFormula !== undefined && currentFormula !== "") {
        showMessage("⚠️ Сонгосон нүд хоосон биш байна. Хоосон нүд рүү шилжүүлнэ үү.");
        return;
      }
      if (onSelect) {
        onSelect(row);
        onClose();
      } else {
       
        setPreviousValue(currentFormula);
        await setActiveCellValue(valueToInsert, showMessage, setLoading);
        trackExcelAction("cell_value_set", { value: valueToInsert, cellType: activeTab });
      }
    } catch (err) {
      console.error("❌ Row click error:", err);
      showMessage(`❌ Алдаа: ${err.message}`);
    }
  };

  const handleUndoSelection = async () => {
    if (previousValue !== null) {
      await setActiveCellValue(previousValue, showMessage, setLoading);
      setSelectedRow(null);
      setPreviousValue(null);
      showMessage("↩️ Сонголт буцаагдлаа.");
    }
  };

  const handleConfirmAndClose = () => {
    setSelectedRow(null);
    setPreviousValue(null);
    onClose();
  };

  if (!isOpen) return null;

  if (!selectedCompany) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <p>⚠️ Хайлт хийхийн тулд эхлээд Профайл хуудаснаас компани сонгоно уу.</p>
          <div style={styles.buttonRow}>
            <button style={styles.cancelButton} onClick={onClose}>
              Хаах
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentData = searchData[activeTab] || [];

  const filteredData = currentData.filter((row) => {
    if (!row) return false;
    const lowerSearchText = searchText.toLowerCase();

    if (activeTab === "account") {
      return (
        row.account_number?.toLowerCase().includes(lowerSearchText) ||
        row.account_name?.toLowerCase().includes(lowerSearchText)
      );
    } else if (activeTab === "cf") {
      return (
        row.code?.toLowerCase().includes(lowerSearchText) || row.name?.toLowerCase().includes(lowerSearchText)
      );
    } else {
      // customer
      return row.name?.toLowerCase().includes(lowerSearchText);
    }
  });

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.tabContainer}>
          <TabList selectedValue={activeTab} onTabSelect={(_, data) => setActiveTab(data.value)} style={{ flex: 1 }}>
            <Tab
              style={activeTab === "account" ? { ...styles.tabButton, ...styles.activeTab } : styles.tabButton}
              value="account"
            >
              🏦 Данс ({searchData.account.length})
            </Tab>
            <Tab
              style={activeTab === "cf" ? { ...styles.tabButton, ...styles.activeTab } : styles.tabButton}
              value="cf"
            >
              💸 CF ({searchData.cf.length})
            </Tab>
            <Tab
              style={activeTab === "customer" ? { ...styles.tabButton, ...styles.activeTab } : styles.tabButton}
              value="customer"
            >
              👤 Харилцагч ({searchData.customer.length})
            </Tab>
          </TabList>
          <Button
            icon={<ArrowClockwise16Regular />}
            appearance="subtle"
            onClick={handleRefresh}
            aria-label="Сэргээх"
            disabled={loading}
          ></Button>
        </div>

        <Input
          contentBefore={<Search16Regular />}
          type="text"
          placeholder={`Хайх...`}
          value={searchText}
          onChange={(_, data) => setSearchText(data.value)}
          style={styles.input}
        />

        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                {activeTab === "account" ? (
                  <>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>Дансны дугаар</th>
                    <th style={styles.th}>Дансны нэр</th>
                    <th style={styles.th}>Валют</th>
                    <th style={styles.th}>Салбар</th>
                  </>
                ) : activeTab === "cf" ? (
                  <>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>Код</th>
                    <th style={styles.th}>Нэр</th>
                  </>
                ) : (
                  <>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>Харилцагч</th>
                    <th style={styles.th}>Статус</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, index) => (
                <tr
                  key={row.id || index}
                  style={{
                    ...styles.tableRow,
                    ...(hoveredRow === (row.id || index) && styles.tableRowHover),
                    ...(selectedRow?.id === row.id && styles.selectedRow),
                  }}
                  onDoubleClick={() =>
                    handleRowClick(
                      row,
                      activeTab === "account" ? row.account_number : activeTab === "cf" ? row.code : row.name
                    )
                  }
                  onMouseEnter={() => setHoveredRow(row.id || index)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  {activeTab === "account" ? (
                    <>
                      <td style={styles.td}>{row.id}</td>
                      <td style={styles.td}>{row.account_number}</td>
                      <td style={styles.td}>{row.account_name}</td>
                      <td style={styles.td}>{row.currency}</td>
                      <td style={styles.td}>{row.branch}</td>
                    </>
                  ) : activeTab === "cf" ? (
                    <>
                      <td style={styles.td}>{row.id}</td>
                      <td style={styles.td}>{row.code}</td>
                      <td style={styles.td}>{row.name}</td>
                    </>
                  ) : (
                    <>
                      <td style={styles.td}>{row.id}</td>
                      <td style={styles.td}>{row.name}</td>
                      <td style={styles.td}>{row.status}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={styles.buttonRow}>
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
            <button style={styles.cancelButton} onClick={onClose}>
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
    background: "rgba(0, 0, 0, 0.4)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1001,
  },
  modal: {
    width: "90%",
    maxWidth: "900px",
    maxHeight: "90vh",
    background: "#fff",
    padding: "12px",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  tabContainer: {
    display: "flex",
    marginTop: "10px",
  },
  tabButton: {
    flex: 1,
    padding: "5px",
    border: "none",
    borderBottom: "2px solid transparent",
    backgroundColor: "#fff",
    cursor: "pointer",
    fontSize: "15px",
    transition: "background 0.3s ease-in-out, border-bottom 0.3s ease-in-out",
  },
  activeTab: {
    borderBottom: "2px solid #7e57c2",
    color: "#7e57c2",
  },
  input: {
    padding: "8px",
    fontSize: "14px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    width: "100%",
    boxSizing: "border-box",
  },
  tableContainer: {
    flexGrow: 1,
    width: "100%",
    overflow: "auto",
    border: "1px solid #ddd",
    borderRadius: "4px",
  },
  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
  },
  th: {
    backgroundColor: "#f7f7f7",
    padding: "6px 10px",
    borderBottom: "1px solid #ddd",
    textAlign: "left",
    fontSize: "11px",
    position: "sticky",
    top: 0,
    zIndex: 1,
  },
  td: {
    padding: "3px 5px",
    fontSize: "12px",
    borderBottom: "1px solid #eee",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "180px",
  },
  tableRow: {
    cursor: "pointer",
    transition: "background 0.2s ease-in-out",
  },
  tableRowHover: {
    backgroundColor: "#f0f0f0",
  },
  selectedRow: {
    backgroundColor: "#d6eaf8",
    fontWeight: "bold",
  },
  buttonRow: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "5px",
    paddingTop: "5px",
    borderTop: "1px solid #ddd",
  },
  cancelButton: {
    background: "#f0f0f0",
    color: "#333",
    border: "1px solid #ccc",
    padding: "4px 12px",
    cursor: "pointer",
    borderRadius: "4px",
  },
};

export default SearchAccount;
