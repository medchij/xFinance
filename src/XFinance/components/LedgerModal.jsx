import React, { useState, useEffect } from "react";
import { Button, Input, Field } from "@fluentui/react-components";
import { useAppContext } from "./AppContext";

const LedgerModal = ({ isOpen, onClose, selectedAccount, initialDateFrom = null, initialDateTo = null }) => {
  // AppContext-аас logger болон setMessage авах
  const { logger, setMessage } = useAppContext();
  
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [ledgerData, setLedgerData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [openingBalance, setOpeningBalance] = useState(0);
  const [closingBalance, setClosingBalance] = useState(0);

  // Default огноо тохируулах - сүүлийн 1 сар
  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());

      setDateFrom(initialDateFrom || oneMonthAgo.toISOString().split("T")[0]);
      setDateTo(initialDateTo || today.toISOString().split("T")[0]);
      setError("");
      setLedgerData([]);

      // LedgerModal нээгдсэн тухай мэдээлэл
      setMessage("Дансны хуулга нээгдлээ", "info");
    }
  }, [isOpen, initialDateFrom, initialDateTo]);

  // Filtered data update useEffect
  useEffect(() => {
    setFilteredData(ledgerData);
  }, [ledgerData]);

  // Account code авах function
  const getAccountCode = (account) => {
    if (!account) return "";
    const parts = account.split(" - ");
    return parts[0] || "";
  };

  // Excel date хөрвүүлэх
  const convertExcelDate = (excelDate) => {
    if (!excelDate || isNaN(excelDate)) return new Date();
    return new Date((excelDate - 25569) * 86400 * 1000);
  };

  // Date formatting
  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("mn-MN");
  };

  // Amount formatting
  const formatAmount = (amount) => {
    if (!amount && amount !== 0) return "";
    return new Intl.NumberFormat("mn-MN").format(amount);
  };

  // Search function
  const handleSearch = (searchValue) => {
    setSearchTerm(searchValue);

    if (!searchValue.trim()) {
      setFilteredData(ledgerData);
      return;
    }

    const filtered = ledgerData.filter(
      (transaction) =>
        transaction.description?.toLowerCase().includes(searchValue.toLowerCase()) ||
        transaction.customer?.toLowerCase().includes(searchValue.toLowerCase()) ||
        transaction.debitAccount?.toLowerCase().includes(searchValue.toLowerCase()) ||
        transaction.creditAccount?.toLowerCase().includes(searchValue.toLowerCase()) ||
        transaction.relatedAccount?.toLowerCase().includes(searchValue.toLowerCase()) ||
        formatAmount(transaction.debit)?.includes(searchValue) ||
        formatAmount(transaction.credit)?.includes(searchValue)
    );

    setFilteredData(filtered);
  };

  // Export to Excel using Office.js
  const exportToCSV = async () => {
    try {
      // Check if we're in Excel environment
      if (typeof Office === "undefined" || !Office.context) {
        // Fallback for non-Excel environment
        const csvContent = createCSVContent();
        downloadCSV(csvContent);
        return;
      }

      await Excel.run(async (context) => {
        // Create new worksheet
        const worksheets = context.workbook.worksheets;
        let exportSheet;

        try {
          exportSheet = worksheets.getItem("Дансны_хуулга_Export");
          exportSheet.delete();
          await context.sync();
        } catch (e) {
          // Sheet doesn't exist, which is fine
        }

        exportSheet = worksheets.add("Дансны_хуулга_Export");

        // Prepare summary data (ensure 11 columns)
        const summaryData = [
          ["Дансны хуулга", "", "", "", "", "", "", "", "", "", ""],
          ["Данс:", selectedAccount || "", "", "", "", "", "", "", "", "", ""],
          ["Огноо:", `${dateFrom} - ${dateTo}`, "", "", "", "", "", "", "", "", ""],
          ["Эхний үлдэгдэл:", formatAmount(openingBalance), "", "", "", "", "", "", "", "", ""],
          ["Эцсийн үлдэгдэл:", formatAmount(closingBalance), "", "", "", "", "", "", "", "", ""],
          ["Нийт гүйлгээ:", filteredData.length.toString(), "", "", "", "", "", "", "", "", ""],
          ["", "", "", "", "", "", "", "", "", "", ""], // Empty row
        ];

        // Prepare headers (ensure 11 columns)
        const headers = [
          "№",
          "Огноо",
          "Дебет данс",
          "Кредит данс",
          "Валют",
          "Гүйлгээний утга",
          "Харилцагч",
          "Харьцсан данс",
          "Дебет",
          "Кредит",
          "Үлдэгдэл",
        ];

        // Prepare transaction data (ensure 11 columns)
        const transactionData = filteredData.map((transaction, index) => [
          (index + 1).toString(),
          formatDate(transaction.date),
          transaction.debitAccount || "",
          transaction.creditAccount || "",
          transaction.currency || "",
          transaction.description || "",
          transaction.customer || "",
          transaction.relatedAccount || "",
          transaction.debit ? formatAmount(transaction.debit) : "-",
          transaction.credit ? formatAmount(transaction.credit) : "-",
          formatAmount(transaction.balance),
        ]);

        // Set all data at once to avoid multiple range operations
        const allData = [...summaryData, headers, ...transactionData];

        // Calculate the total range needed
        const totalRows = allData.length;

        // Set all data in one operation
        if (totalRows > 0) {
          const allDataRange = exportSheet.getRange(`A1:K${totalRows}`);
          allDataRange.values = allData;

          // Format header row (summary data length + 1 for the header row)
          const headerRowIndex = summaryData.length + 1;
          const headerRange = exportSheet.getRange(`A${headerRowIndex}:K${headerRowIndex}`);
          headerRange.format.font.bold = true;
          headerRange.format.fill.color = "#f5f5f5";
        }

        // Auto-fit columns
        exportSheet.getUsedRange().format.autofitColumns();

        // Activate the sheet
        exportSheet.activate();

        await context.sync();

        logger.info("Excel export амжилттай боллоо");
      });
    } catch (error) {
      logger.error("Export алдаа:", error);
      setError("Export хийхэд алдаа гарлаа: " + error.message);
    }
  };

  // Fallback CSV creation function
  const createCSVContent = () => {
    const headers = [
      "№",
      "Огноо",
      "Дебет данс",
      "Кредит данс",
      "Валют",
      "Гүйлгээний утга",
      "Харилцагч",
      "Харьцсан данс",
      "Дебет",
      "Кредит",
      "Үлдэгдэл",
    ];

    const csvData = filteredData.map((transaction, index) => [
      index + 1,
      formatDate(transaction.date),
      transaction.debitAccount || "",
      transaction.creditAccount || "",
      transaction.currency || "",
      transaction.description || "",
      transaction.customer || "",
      transaction.relatedAccount || "",
      transaction.debit ? formatAmount(transaction.debit) : "-",
      transaction.credit ? formatAmount(transaction.credit) : "-",
      formatAmount(transaction.balance),
    ]);

    const allData = [headers, ...csvData];
    return allData.map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(",")).join("\n");
  };

  // Download CSV (fallback)
  const downloadCSV = (csvContent) => {
    try {
      const BOM = "\uFEFF";
      const finalContent = BOM + csvContent;

      if (typeof window !== "undefined" && window.Blob) {
        const blob = new window.Blob([finalContent], { type: "text/csv;charset=utf-8;" });
        const link = window.document.createElement("a");
        const url = window.URL.createObjectURL(blob);

        link.setAttribute("href", url);
        const accountCode = getAccountCode(selectedAccount);
        const filename = `Дансны_хуулга_${accountCode}_${dateFrom}_${dateTo}.csv`;
        link.setAttribute("download", filename);
        link.style.visibility = "hidden";

        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);

        logger.info("CSV файл амжилттай үүсгэгдлээ:", filename);
      } else {
        logger.warn("CSV export дэмжигдэхгүй байна");
        setError("CSV export дэмжигдэхгүй байна");
      }
    } catch (error) {
      logger.error("CSV download алдаа:", error);
      setError("CSV файл татахад алдаа гарлаа: " + error.message);
    }
  };

  // Excel өгөгдөл авах function
  const fetchLedgerData = async () => {
    setIsLoading(true);
    setError("");
    setLedgerData([]);

    try {
      await Excel.run(async (context) => {
        const worksheet = context.workbook.worksheets.getItem("Journal");
        const range = worksheet.getUsedRange();
        range.load("values");

        await context.sync();

        const values = range.values;

        if (!values || values.length <= 1) {
          throw new Error("Excel sheet-д өгөгдөл байхгүй байна");
        }

        // Header мөр авах - шинэ багануудтай
        const headers = values[0];

        const headerIndexes = {
          id: headers.indexOf("Д/Д"),
          date: headers.indexOf("Огноо"),
          debitAccount: headers.indexOf("Дебет"),
          creditAccount: headers.indexOf("Кредит"),
          currency: headers.indexOf("Валют"),
          amount: headers.indexOf("Дүн"),
          description: headers.indexOf("Гүйлгээний утга"),
          customer: headers.indexOf("Харилцагч"),
          relatedAccount: headers.indexOf("Харьцсан данс"),
        };

        logger.info("Header indexes:", headerIndexes);

        const searchCode = getAccountCode(selectedAccount);

        const dateFromObj = new Date(dateFrom);
        const dateToObj = new Date(dateTo);

        // Хугацааны хязгаарыг нэмэх
        dateToObj.setHours(23, 59, 59, 999);

        logger.info("Date range:", { from: dateFromObj, to: dateToObj });

        // Эхлээд эхний үлдэгдэл тооцоолъё (сонгосон хугацаанаас өмнөх гүйлгээнүүд)
        let calculatedOpeningBalance = 0;

        for (let i = 1; i < values.length; i++) {
          const row = values[i];
          if (!row || row.length === 0) continue;

          // Account кодуудыг шалгах
          let debitAccount = row[headerIndexes.debitAccount];
          let creditAccount = row[headerIndexes.creditAccount];

          // Excel-ээс ирж буй account кодыг цэвэрлэх
          if (typeof debitAccount === "string" && debitAccount.startsWith("'")) {
            debitAccount = debitAccount.substring(1);
          }
          if (typeof creditAccount === "string" && creditAccount.startsWith("'")) {
            creditAccount = creditAccount.substring(1);
          }

          // Account matching хийх
          const isRelevant = debitAccount === searchCode || creditAccount === searchCode;
          if (!isRelevant) continue;

          // Огноо хөрвүүлэх
          const excelDate = row[headerIndexes.date];
          let transactionDate;

          if (typeof excelDate === "number") {
            transactionDate = convertExcelDate(excelDate);
          } else if (typeof excelDate === "string") {
            transactionDate = new Date(excelDate);
          } else {
            continue;
          }

          // Зөвхөн сонгосон хугацаанаас ӨМНӨХ гүйлгээнүүдийг тооцоолох
          if (transactionDate < dateFromObj) {
            const amount = parseFloat(row[headerIndexes.amount]) || 0;

            if (debitAccount === searchCode) {
              calculatedOpeningBalance += amount;
            }
            if (creditAccount === searchCode) {
              calculatedOpeningBalance -= amount;
            }
          }
        }

        setOpeningBalance(calculatedOpeningBalance);

        let transactions = [];
        let runningBalance = calculatedOpeningBalance;
        let totalRowsChecked = 0;
        let relevantRowsFound = 0;

        // Data мөрүүд боловсруулах
        for (let i = 1; i < values.length; i++) {
          const row = values[i];
          totalRowsChecked++;

          // Data validation
          if (!row || row.length === 0) continue;

          // Account кодуудыг шалгах - дебет болон кредит баганаас
          let debitAccount = row[headerIndexes.debitAccount];
          let creditAccount = row[headerIndexes.creditAccount];

          // Excel-ээс ирж буй account кодыг цэвэрлэх
          if (typeof debitAccount === "string" && debitAccount.startsWith("'")) {
            debitAccount = debitAccount.substring(1);
          }
          if (typeof creditAccount === "string" && creditAccount.startsWith("'")) {
            creditAccount = creditAccount.substring(1);
          }

          // Debug: эхний 10 мөрийн өгөгдлийг харуулах
          if (i <= 10) {
            logger.info(`Row ${i} - Debit: "${debitAccount}", Credit: "${creditAccount}", Search: "${searchCode}"`);
          }

          // Account matching хийх
          const isRelevant = debitAccount === searchCode || creditAccount === searchCode;

          if (isRelevant) {
            relevantRowsFound++;
            logger.info(`Found relevant row ${i}: Debit=${debitAccount}, Credit=${creditAccount}`);
          }

          if (!isRelevant) continue;

          // Огноо хөрвүүлэх
          const excelDate = row[headerIndexes.date];
          let transactionDate;

          if (typeof excelDate === "number") {
            transactionDate = convertExcelDate(excelDate);
          } else if (typeof excelDate === "string") {
            transactionDate = new Date(excelDate);
          } else {
            logger.warn("Invalid date format:", excelDate);
            continue;
          }

          // Огнооны хязгаар шалгах
          if (transactionDate < dateFromObj || transactionDate > dateToObj) {
            continue;
          }

          // Amount утгууд авах
          const amount = parseFloat(row[headerIndexes.amount]) || 0;

          // Balance тооцоо - дебет эсэх кредит эсэхээр
          let debitAmount = 0;
          let creditAmount = 0;

          if (debitAccount === searchCode) {
            debitAmount = amount;
            runningBalance += amount;
          }
          if (creditAccount === searchCode) {
            creditAmount = amount;
            runningBalance -= amount;
          }

          const transaction = {
            id: row[headerIndexes.id],
            date: transactionDate,
            debitAccount: debitAccount,
            creditAccount: creditAccount,
            currency: row[headerIndexes.currency] || "MNT",
            description: row[headerIndexes.description] || "",
            customer: row[headerIndexes.customer] || "",
            relatedAccount: row[headerIndexes.relatedAccount] || "",
            debit: debitAmount > 0 ? debitAmount : null,
            credit: creditAmount > 0 ? creditAmount : null,
            balance: runningBalance,
          };

          // Debug customer data
          logger.info(`Row ${i} customer data:`, {
            customerIndex: headerIndexes.customer,
            customerValue: row[headerIndexes.customer],
            finalCustomer: transaction.customer,
            rowData: row,
          });

          transactions.push(transaction);
        }

        // Огноогоор эрэмбэлэх
        transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

        setLedgerData(transactions);
        setClosingBalance(runningBalance);

        if (transactions.length === 0) {
          setError("Сонгосон хугацаанд гүйлгээ олдсонгүй");
        }
      });
    } catch (err) {
      setError("Excel өгөгдөл уншихад алдаа гарлаа: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Хайх товч дарах
  const handleFetchData = () => {
    if (!dateFrom || !dateTo) {
      setError("Эхлэх болон дуусах огноо оруулна уу");
      return;
    }
    if (new Date(dateFrom) > new Date(dateTo)) {
      setError("Эхлэх огноо дуусах огнооноос бага байх ёстой");
      return;
    }

    setMessage("Дансны хуулга хайж байна...", "info");
    fetchLedgerData();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 2000,
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "8px",
          width: "90vw",
          maxWidth: "1200px",
          maxHeight: "90vh",
          overflow: "auto",
          position: "relative",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>Дансны хуулга</h2>
          <Button onClick={onClose}>Хаах</Button>
        </div>

        {/* Date Filter */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
          <Field label="Эхлэх огноо">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </Field>
          <Field label="Дуусах огноо">
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </Field>
          <div style={{ display: "flex", alignItems: "end" }}>
            <Button appearance="primary" onClick={handleFetchData} disabled={isLoading}>
              Хайх
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              backgroundColor: "#ffebee",
              color: "#c62828",
              padding: "10px",
              borderRadius: "4px",
              marginBottom: "15px",
            }}
          >
            {error}
          </div>
        )}

        {/* Loading */}
        {isLoading && <div style={{ textAlign: "center", margin: "20px 0" }}>Хуулга хайж байна...</div>}

        {/* Search and Export Controls */}
        {ledgerData.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "15px",
              gap: "10px",
            }}
          >
            <div style={{ flex: 1, maxWidth: "400px" }}>
              <Input
                placeholder="Хайх... (утга, харилцагч, данс, дүн)"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>
            <Button appearance="secondary" onClick={exportToCSV} style={{ whiteSpace: "nowrap" }}>
              📊 Excel export
            </Button>
          </div>
        )}

        {/* Balance Summary */}
        {ledgerData.length > 0 && (
          <div
            style={{
              backgroundColor: "#f5f5f5",
              padding: "12px",
              borderRadius: "4px",
              marginBottom: "15px",
              fontSize: "13px",
            }}
          >
            {/* Account Name - Full Width Row */}
            <div
              style={{
                fontWeight: "600",
                color: "#495057",
                marginBottom: "8px",
                fontSize: "14px",
              }}
            >
              {selectedAccount}
            </div>

            {/* Balance Information */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>Эхний үлдэгдэл:</strong>
                <span
                  style={{
                    color: openingBalance >= 0 ? "#1976d2" : "#d32f2f",
                    fontWeight: "bold",
                    marginLeft: "5px",
                  }}
                >
                  {formatAmount(openingBalance)}
                </span>
              </div>
              <div>
                <strong>Эцсийн үлдэгдэл:</strong>
                <span
                  style={{
                    color: closingBalance >= 0 ? "#1976d2" : "#d32f2f",
                    fontWeight: "bold",
                    marginLeft: "5px",
                  }}
                >
                  {formatAmount(closingBalance)}
                </span>
              </div>
              <div>
                <strong>Нийт гүйлгээ:</strong> {filteredData.length}
                {filteredData.length < ledgerData.length && (
                  <span style={{ color: "#666", fontSize: "12px", marginLeft: "5px" }}>
                    (нийт: {ledgerData.length})
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Transaction Table */}
        {ledgerData.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ddd" }}>
              <thead>
                <tr style={{ backgroundColor: "#f5f5f5" }}>
                  <th style={{ padding: "4px", border: "1px solid #ddd", textAlign: "left", fontSize: "13px" }}>Д/Д</th>
                  <th style={{ padding: "4px", border: "1px solid #ddd", textAlign: "left", fontSize: "13px" }}>
                    Огноо
                  </th>
                  <th style={{ padding: "4px", border: "1px solid #ddd", textAlign: "left", fontSize: "13px" }}>
                    Дебет данс
                  </th>
                  <th style={{ padding: "4px", border: "1px solid #ddd", textAlign: "left", fontSize: "13px" }}>
                    Кредит данс
                  </th>
                  <th style={{ padding: "4px", border: "1px solid #ddd", textAlign: "left", fontSize: "13px" }}>
                    Валют
                  </th>
                  <th style={{ padding: "4px", border: "1px solid #ddd", textAlign: "left", fontSize: "13px" }}>
                    Гүйлгээний утга
                  </th>
                  <th style={{ padding: "4px", border: "1px solid #ddd", textAlign: "left", fontSize: "13px" }}>
                    Харилцагч
                  </th>
                  <th style={{ padding: "4px", border: "1px solid #ddd", textAlign: "left", fontSize: "13px" }}>
                    Харьцсан данс
                  </th>
                  <th style={{ padding: "4px", border: "1px solid #ddd", textAlign: "right", fontSize: "13px" }}>
                    Дебет
                  </th>
                  <th style={{ padding: "4px", border: "1px solid #ddd", textAlign: "right", fontSize: "13px" }}>
                    Кредит
                  </th>
                  <th style={{ padding: "4px", border: "1px solid #ddd", textAlign: "right", fontSize: "13px" }}>
                    Үлдэгдэл
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((transaction, index) => (
                  <tr key={index}>
                    <td style={{ padding: "4px", border: "1px solid #ddd", fontSize: "12px" }}>{transaction.id}</td>
                    <td style={{ padding: "4px", border: "1px solid #ddd", fontSize: "12px" }}>
                      {formatDate(transaction.date)}
                    </td>
                    <td style={{ padding: "4px", border: "1px solid #ddd", fontSize: "12px" }}>
                      {transaction.debitAccount}
                    </td>
                    <td style={{ padding: "4px", border: "1px solid #ddd", fontSize: "12px" }}>
                      {transaction.creditAccount}
                    </td>
                    <td style={{ padding: "4px", border: "1px solid #ddd", fontSize: "12px" }}>
                      {transaction.currency}
                    </td>
                    <td style={{ padding: "4px", border: "1px solid #ddd", fontSize: "12px" }}>
                      {transaction.description}
                    </td>
                    <td style={{ padding: "4px", border: "1px solid #ddd", fontSize: "12px" }}>
                      {transaction.customer}
                    </td>
                    <td style={{ padding: "4px", border: "1px solid #ddd", fontSize: "12px" }}>
                      {transaction.relatedAccount}
                    </td>
                    <td style={{ padding: "4px", border: "1px solid #ddd", textAlign: "right" }}>
                      {transaction.debit ? (
                        <span style={{ color: "#d32f2f", fontWeight: "600", fontSize: "12px" }}>
                          {formatAmount(transaction.debit)}
                        </span>
                      ) : (
                        <span style={{ color: "#999", fontSize: "12px" }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: "4px", border: "1px solid #ddd", textAlign: "right" }}>
                      {transaction.credit ? (
                        <span style={{ color: "#2e7d32", fontWeight: "600", fontSize: "12px" }}>
                          {formatAmount(transaction.credit)}
                        </span>
                      ) : (
                        <span style={{ color: "#999", fontSize: "12px" }}>-</span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "4px",
                        border: "1px solid #ddd",
                        textAlign: "right",
                        fontWeight: "bold",
                        fontSize: "12px",
                        color: transaction.balance >= 0 ? "#1976d2" : "#d32f2f",
                        backgroundColor: transaction.balance >= 0 ? "#e3f2fd" : "#ffebee",
                      }}
                    >
                      {formatAmount(transaction.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LedgerModal;
