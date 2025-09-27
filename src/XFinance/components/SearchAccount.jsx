import React, { useState, useEffect, useCallback } from "react";
import { Input, TabList, Tab, Spinner } from "@fluentui/react-components";
import { Search16Regular } from "@fluentui/react-icons";
import { setActiveCellValue, getActiveCellFormula } from "../xFinance";
import { useAppContext } from "./AppContext";
import { BASE_URL } from "../../config";

const SearchAccount = ({ isOpen, onClose, onSelect }) => {
  // REFACTOR: Use selectedCompany instead of dataDir
  const { selectedCompany, setLoading, showMessage } = useAppContext();
  
  const [activeTab, setActiveTab] = useState("account");
  const [data, setData] = useState({ account: [], cf: [], customer: [] });
  const [searchText, setSearchText] = useState("");
  const [selectedRow, setSelectedRow] = useState(null);
  const [previousValue, setPreviousValue] = useState(null);
  const [isFetching, setIsFetching] = useState(false);

  // REFACTOR: Fetch data based on selectedCompany
  const fetchDataForCompany = useCallback(async () => {
    // Don't fetch if the dialog is closed or no company is selected
    if (!isOpen || !selectedCompany) {
      setData({ account: [], cf: [], customer: [] }); // Clear data if no company
      return;
    }

    console.log(`🏢 Fetching data for company: ${selectedCompany}`);
    setIsFetching(true);
    showMessage("⏳ Мэдээлэл татаж байна...", 0); // Show loading message

    try {
      const endpoints = ["account", "cf", "customer"];
      const responses = await Promise.all(
        endpoints.map(ep => fetch(`${BASE_URL}/api/${ep}?company_id=${selectedCompany}`))
      );

      for (const res of responses) {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ message: "Тодорхойгүй сүлжээний алдаа" }));
          throw new Error(`Серверээс дата татахад алдаа гарлаа: ${errorData.message}`);
        }
      }

      const [account, cf, customer] = await Promise.all(responses.map(res => res.json()));

      setData({ account, cf, customer });
      showMessage("✅ Мэдээлэл амжилттай татлаа.");

    } catch (error) {
      console.error("📌 Дата татахад алдаа гарлаа:", error);
      showMessage(`❌ Алдаа: ${error.message}`);
      setData({ account: [], cf: [], customer: [] }); // Clear data on error
    } finally {
      setIsFetching(false);
      setLoading(false); // Make sure global loading is also turned off
    }
  }, [isOpen, selectedCompany, showMessage, setLoading]);


  useEffect(() => {
    fetchDataForCompany();
  }, [fetchDataForCompany]); // Effect depends on the memoized fetch function

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
      showMessage(`❌ Алдаа: ${err.message}`);
    }
  };
  
  if (!isOpen) return null;

  // Show a message if no company is selected
  if (!selectedCompany) {
      return (
          <div style={styles.overlay}>
              <div style={styles.modal}><p>⚠️ Хайлт хийхийн тулд эхлээд Профайл хуудаснаас компани сонгоно уу.</p><button style={styles.cancelButton} onClick={onClose}>Хаах</button></div>
          </div>
      )
  }

  const currentData = data[activeTab] || [];
  const filteredData = currentData.filter((row) => {
    if (!row) return false;
    const lowerSearchText = searchText.toLowerCase();
    
    if (activeTab === "account") {
      return (
        row["Дансны дугаар"]?.toLowerCase().includes(lowerSearchText) ||
        row["Дансны нэр"]?.toLowerCase().includes(lowerSearchText)
      );
    } else if (activeTab === "cf") {
      return (
        row.code?.toLowerCase().includes(lowerSearchText) ||
        row.name?.toLowerCase().includes(lowerSearchText)
      );
    } else { // customer
      return row.name?.toLowerCase().includes(lowerSearchText);
    }
  });

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {isFetching ? (
          <Spinner label="Мэдээлэл ачааллаж байна..." />
        ) : (
          <>
            <TabList selectedValue={activeTab} onTabSelect={(_, data) => setActiveTab(data.value)}>
              <Tab value="account">🏦 Данс ({data.account.length})</Tab>
              <Tab value="cf">💸 CF ({data.cf.length})</Tab>
              <Tab value="customer">👤 Харилцагч ({data.customer.length})</Tab>
            </TabList>

            <Input
              contentBefore={<Search16Regular />}
              type="text"
              placeholder={`Хайх...`}
              value={searchText}
              onChange={(_, data) => setSearchText(data.value)}
              style={{margin: '10px 0'}}
            />

            <div style={styles.tableContainer}>
              {/* Table rendering logic remains mostly the same, but uses filteredData */}
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
                  }}
                  onDoubleClick={() =>
                    handleRowClick(
                      row,
                      activeTab === "account" ? row["Дансны дугаар"] : activeTab === "cf" ? row.code : row.name
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
              <button style={styles.cancelButton} onClick={onClose}>Хаах</button>
            </div>
          </>
        )}
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
      width: "clamp(300px, 90%, 900px)",
      maxHeight: "80vh",
      background: "#fff",
      padding: "20px",
      borderRadius: "8px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
      display: "flex",
      flexDirection: "column",
    },
    tableContainer: {
      flexGrow: 1,
      overflowY: "auto",
      border: "1px solid #ddd",
      borderRadius: "4px",
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
    },
    th: {
        backgroundColor: "#f7f7f7",
        padding: "8px 12px",
        borderBottom: "1px solid #ddd",
        textAlign: "left",
        fontSize: "14px",
        position: "sticky",
        top: 0,
        zIndex: 1,
    },
    td: {
        padding: "8px 12px",
        fontSize: "13px",
        borderBottom: "1px solid #eee",
    },
    tableRow: {
        cursor: "pointer",
        transition: "background-color 0.2s ease",
    },
    buttonRow: {
      display: "flex",
      justifyContent: "flex-end",
      marginTop: "15px",
    },
    cancelButton: {
        padding: '8px 16px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
    },
  };
  

export default SearchAccount;
