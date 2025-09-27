import React, { useState, useEffect } from "react";
import {
  Input,
  TabList,
  Tab,
  Spinner,
  Button,
} from "@fluentui/react-components";
import {
  Search16Regular,
  ArrowClockwise16Regular,
  CheckmarkRegular,
  ArrowUndoRegular,
} from "@fluentui/react-icons";
import { setActiveCellValue, getActiveCellFormula } from "../xFinance";
import { useAppContext } from "./AppContext";

const SearchAccount = ({ isOpen, onClose, onSelect }) => {
  const { selectedCompany, setLoading, showMessage, searchData, fetchSearchData, loading } = useAppContext();

  const [activeTab, setActiveTab] = useState("account");
  const [searchText, setSearchText] = useState("");
  const [selectedRow, setSelectedRow] = useState(null);
  const [previousValue, setPreviousValue] = useState(null);

  useEffect(() => {
    if (isOpen) {
      // Reset state every time the modal opens
      setSelectedRow(null);
      setPreviousValue(null);
      fetchSearchData(false);
    }
  }, [isOpen, fetchSearchData]);

  const handleRefresh = () => {
    fetchSearchData(true);
  };

  // ЗАСВАР: Double-click хийхэд цонхыг хаахгүй, зөвхөн утгыг урьдчилан бичнэ.
  const handleRowClick = async (row, valueToInsert) => {
    try {
      setSelectedRow(row);
      if (onSelect) {
        // onSelect-ийн хувьд шууд дамжуулаад хаана (хуучин логик хэвээрээ)
        onSelect(row); 
        onClose();
      } else {
        // Excel-д бичих үед баталгаажуулалт шаардана
        const currentFormula = await getActiveCellFormula(showMessage, setLoading);
        setPreviousValue(currentFormula);
        await setActiveCellValue(valueToInsert, showMessage, setLoading);
      }
    } catch (err) {
      console.error("❌ Row click error:", err);
      showMessage(`❌ Алдаа: ${err.message}`);
    }
  };

  // ШИНЭ ФУНКЦ: Сонголтыг буцаах
  const handleUndoSelection = async () => {
    if (previousValue !== null) {
      await setActiveCellValue(previousValue, showMessage, setLoading);
      setSelectedRow(null);
      setPreviousValue(null);
      showMessage("↩️ Сонголт буцаагдлаа.");
    }
  };

  // ШИНЭ ФУНКЦ: Сонголтыг баталгаажуулж, цонхыг хаах
  const handleConfirmAndClose = () => {
    setSelectedRow(null);
    setPreviousValue(null);
    onClose();
  };
  
  if (!isOpen) return null;

  if (!selectedCompany) {
      return (
          <div style={styles.overlay}>
              <div style={styles.modal}><p>⚠️ Хайлт хийхийн тулд эхлээд Профайл хуудаснаас компани сонгоно уу.</p><button style={styles.cancelButton} onClick={onClose}>Хаах</button></div>
          </div>
      )
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
        row.original_id?.toLowerCase().includes(lowerSearchText) ||
        row.name?.toLowerCase().includes(lowerSearchText)
      );
    } else { // customer
      return row.name?.toLowerCase().includes(lowerSearchText);
    }
  });

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {loading && searchData.account.length === 0 ? (
          <Spinner label="Мэдээлэл ачааллаж байна..." />
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <TabList selectedValue={activeTab} onTabSelect={(_, data) => setActiveTab(data.value)}>
                    <Tab value="account">🏦 Данс ({searchData.account.length})</Tab>
                    <Tab value="cf">💸 CF ({searchData.cf.length})</Tab>
                    <Tab value="customer">👤 Харилцагч ({searchData.customer.length})</Tab>
                </TabList>
                <Button icon={<ArrowClockwise16Regular />} appearance="subtle" onClick={handleRefresh} aria-label="Сэргээх" disabled={loading}></Button>
            </div>

            <Input
              contentBefore={<Search16Regular />}
              type="text"
              placeholder={`Хайх...`}
              value={searchText}
              onChange={(_, data) => setSearchText(data.value)}
              style={{margin: '10px 0'}}
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
                        style={selectedRow?.id === row.id ? styles.selectedTableRow : styles.tableRow}
                        onDoubleClick={() =>
                            handleRowClick(
                            row,
                            activeTab === "account" ? row.account_number : activeTab === "cf" ? row.original_id : row.name
                            )
                        }
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
                            <td style={styles.td}>{row.original_id}</td>
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

            {/* ЗАСВАР: Сонголтын төлвөөс хамаарч товчнуудыг харуулна */}
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
                <Button onClick={onClose}>Хаах</Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// СТИЛЬД ӨӨРЧЛӨЛТ ОРООГҮЙ (зөвхөн сонгогдсон мөрийн өнгө нэмэгдсэн)
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
    // ШИНЭ СТИЛЬ: Сонгогдсон мөрийн загвар
    selectedTableRow: {
        cursor: "pointer",
        backgroundColor: "#e1f0ff",
    },
    buttonRow: {
      display: "flex",
      justifyContent: "flex-end",
      gap: "10px", // Товчнуудын хооронд зай нэмэв
      marginTop: "15px",
    },
    // Энэ стиль ашиглагдахгүй болсон ч, таны хүсэлтээр хэвээр үлдээв
    cancelButton: {
        padding: '8px 16px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
    },
  };
  

export default SearchAccount;
