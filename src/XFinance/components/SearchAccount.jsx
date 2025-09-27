import React, { useState, useEffect } from "react";
import {  Input, TabList, Tab } from "@fluentui/react-components";
import { Search16Regular } from "@fluentui/react-icons";
import { setActiveCellValue, getActiveCellFormula, fetchAccountBalanceData } from "../xFinance";
import { useAppContext } from "./AppContext";
import { BASE_URL } from "../../config";

const SearchAccount = ({ isOpen, onClose, onSelect }) => {
  const { dataDir, setLoading, showMessage } = useAppContext();
  const [activeTab, setActiveTab] = useState("account");
  const [accountData, setAccountData] = useState([]);
  const [cfData, setCfData] = useState([]);
  const [customerData, setCustomerData] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [hoveredRow, setHoveredRow] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [previousValue, setPreviousValue] = useState(null);

  useEffect(() => {
    // If the dialog is closed or no company is selected, do nothing and clear old data.
    if (!isOpen || !dataDir) {
      setAccountData([]);
      setCfData([]);
      setCustomerData([]);
      return;
    }

    const fetchAllDataForCompany = async () => {
      console.log(`🏢 Fetching data for company: ${dataDir}`);
      setLoading(true);
      showMessage("⏳ Мэдээлэл татаж байна...", 0); // Show loading message indefinitely

      try {
        const [accountsRes, cfRes, customersRes] = await Promise.all([
          fetch(`${BASE_URL}/api/account?company_id=${dataDir}`),
          fetch(`${BASE_URL}/api/cf?company_id=${dataDir}`),
          fetch(`${BASE_URL}/api/customer?company_id=${dataDir}`),
        ]);

        // Check for network errors
        if (!accountsRes.ok || !cfRes.ok || !customersRes.ok) {
           throw new Error('Нэг эсвэл түүнээс дээш хүсэлт амжилтгүй боллоо.');
        }

        const accounts = await accountsRes.json();
        const cf = await cfRes.json();
        const customers = await customersRes.json();

        // Check for application-level errors returned in the JSON body
        if (accounts.error || cf.error || customers.error) {
            const errorMessage = accounts.message || cf.message || customers.message;
            throw new Error(errorMessage);
        }

        setAccountData(accounts);
        setCfData(cf);
        setCustomerData(customers);
        showMessage("✅ Мэдээлэл амжилттай татлаа.", 3000);

      } catch (error) {
        console.error("📌 Дата татахад алдаа гарлаа:", error);
        showMessage(`❌ Алдаа: ${error.message}`, 5000);
        // Clear data on error to avoid showing stale information
        setAccountData([]);
        setCfData([]);
        setCustomerData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllDataForCompany();

  }, [isOpen, dataDir, setLoading, showMessage]); // Effect depends on these

 
  const switchTab = (tab) => {
    setActiveTab(tab);
    setSearchText("");
    setSelectedRow(null);
  };

  const handleRowClick = async (row, valueToInsert) => {
    try {
      setSelectedRow(row);
      if (onSelect) {
        onSelect(row); 
        onClose();
      } else {
        const currentFormula = await getActiveCellFormula(showMessage, setLoading);
        setPreviousValue(currentFormula);
        await setActiveCellValue(valueToInsert, showMessage, setLoading);
      }
    } catch (err) {
      console.error("❌ Row click error:", err);
      showMessage(`❌ Алдаа: ${err.message}`, 5000);
    }
  };

  const handleUndoSelection = async () => {
    if (previousValue !== null) {
      await setActiveCellValue(previousValue, showMessage, setLoading);
      setSelectedRow(null);
      setPreviousValue(null);
    }
  };

  if (!isOpen) return null;

  const data = activeTab === "account" ? accountData : activeTab === "cf" ? cfData : customerData;

  const filteredData = data.filter((row) => {
    if (!row) return false;
    const lowerSearchText = searchText.toLowerCase();
    
    if (activeTab === "account") {
      return (
        row["Дансны дугаар"]?.toLowerCase().includes(lowerSearchText) ||
        row["Дансны нэр"]?.toLowerCase().includes(lowerSearchText)
      );
    } else if (activeTab === "cf") {
      // Assuming cf data from DB now has 'name' and 'code'
      return (
        row.code?.toLowerCase().includes(lowerSearchText) ||
        row.name?.toLowerCase().includes(lowerSearchText)
      );
    } else { // customer
      return row["name"]?.toLowerCase().includes(lowerSearchText);
    }
  });

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <TabList selectedValue={activeTab} onTabSelect={(_, data) => switchTab(data.value)} style={styles.tabContainer}>
          <Tab value="account">🏦 Данс</Tab>
          <Tab value="cf">💸 CF</Tab>
          <Tab value="customer">👤 Харилцагч</Tab>
        </TabList>

        <div style={styles.row}>
          <Input
            appearance="outline"
            contentBefore={<Search16Regular />}
            type="text"
            placeholder={
              activeTab === "account"
                ? "Дансны нэр эсвэл дугаар хайх..."
                : activeTab === "cf"
                  ? "CF нэр эсвэл код хайх..."
                  : "Харилцагчийн нэр хайх..."
            }
            value={searchText}
            onChange={(_, data) => setSearchText(data.value)}
          />
        </div>

        {selectedRow && (
          <div style={styles.selectedAccount}>
            <strong>Сонгогдсон:</strong>{" "}
            {activeTab === "account"
              ? `${selectedRow["Дансны дугаар"]} - ${selectedRow["Дансны нэр"]}`
              : activeTab === "cf"
                ? `${selectedRow.code} - ${selectedRow.name}`
                : `${selectedRow["name"]}`}
            <button style={styles.undoButton} onClick={handleUndoSelection}>
              ❌ Буцаах
            </button>
          </div>
        )}

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
                    ...(hoveredRow === index ? styles.tableRowHover : {}),
                    ...(selectedRow === row ? styles.selectedRow : {}),
                  }}
                  onMouseEnter={() => setHoveredRow(index)}
                  onMouseLeave={() => setHoveredRow(null)}
                  onDoubleClick={() =>
                    handleRowClick(
                      row,
                      activeTab === "account" ? row["Дансны дугаар"] : activeTab === "cf" ? row.code : row["name"]
                    )
                  }
                >
                  {activeTab === "account" ? (
                    <>
                      <td style={styles.td}>{row.id}</td>
                      <td style={styles.td}>{row["Дансны дугаар"]}</td>
                      <td style={styles.td}>{row["Дансны нэр"]}</td>
                      <td style={styles.td}>{row["Валют"]}</td>
                      <td style={styles.td}>{row["Салбар"]}</td>
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
                      <td style={styles.td}>{row["name"]}</td>
                      <td style={styles.td}>{row.status}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={styles.buttonRow}>
          {activeTab === "account" ? (
            <button
              style={styles.fetchButton}
              onClick={async () => {
                  showMessage("🔄 Энэ функц идэвхгүй байна.", 3000);
              }}
            >
              🔄 Account шинэчлэх
            </button>
          ) : (
            <button style={{ visibility: "hidden" }}>.</button>
          )}

          <button style={styles.cancelButton} onClick={onClose}>
            Хаах
          </button>
        </div>
      </div>
    </div>
  );
};

// Styles remain the same...
const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "rgba(0, 0, 0, 0.3)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modal: {
    width: "90%",
    maxWidth: "900px",
    maxHeight: "90vh",
    overflowY: "auto",
    background: "#fff",
    padding: "20px",
    borderRadius: "5px",
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
    display: "flex",
    flexDirection: "column",
  },
  title: {
    textAlign: "left",
    fontSize: "18px",
    marginBottom: "15px",
    borderBottom: "1px solid #ddd",
    paddingBottom: "10px",
  },
  tabContainer: {
    display: "flex",
    marginBottom: "10px",
  },
  tabButton: {
    flex: 1,
    padding: "10px",
    border: "none",
    backgroundColor: "#fff",
    cursor: "pointer",
    fontSize: "16px",
  },
  activeTab: {
    backgroundColor: "#7e57c2",
    color: "white",
    transition: "background 0.3s ease-in-out",
  },
  row: {
    display: "flex",
    flexDirection: "column",
    marginBottom: "10px",
  },
  input: {
    padding: "8px",
    fontSize: "14px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    width: "100%",
    boxSizing: "border-box",
  },
  selectedAccount: {
    backgroundColor: "#f0f0f0",
    padding: "5px",
    borderRadius: "4px",
    marginBottom: "5px",
    fontSize: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  undoButton: {
    background: "#ff6347",
    color: "#fff",
    border: "none",
    marginLeft: "10px",
    padding: "5px 8px",
    cursor: "pointer",
borderRadius: "4px",
  },
  tableContainer: {
    width: "100%",
    overflowX: "auto",
    overflowY: "auto",
    maxHeight: "400px",
    border: "1px solid #ccc",
    borderRadius: "4px",
  },
  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    minWidth: "600px",
  },
  th: {
    backgroundColor: "#f7f7f7",
    padding: "10px",
    borderBottom: "1px solid #ddd",
    borderTop: "1px solid #ddd",
    textAlign: "left",
    fontSize: "12px",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  td: {
    padding: "0 5px",
    fontSize: "12px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "180px",
  },
  tableRow: {
    cursor: "pointer",
    transition: "background 0.3s ease-in-out",
  },
  tableRowHover: {
    background: "#f0f0f0",
  },
  selectedRow: {
    background: "#d6eaf8",
  },
  buttonRow: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "15px",
  },
  cancelButton: {
    background: "#ccc",
    border: "none",
    padding: "10px 15px",
    cursor: "pointer",
    borderRadius: "4px",
  },
  fetchButton: {
    background: "#ccc",
    border: "none",
    padding: "10px 15px",
    cursor: "pointer",
    borderRadius: "4px",
  },
};

export default SearchAccount;
