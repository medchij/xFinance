import React, { useState, useEffect } from "react";
import { Input, Dropdown, Button, Textarea, Field, Option } from "@fluentui/react-components";
import { Search16Regular } from "@fluentui/react-icons";
import SearchAccount from "./SearchAccount";
import LedgerModal from "./LedgerModal";
import { withLoading } from "../apiHelpers";
import { useAppContext } from "./AppContext";
import logger from "../utils/logger"; // Logger import нэмэх

const TransactionModal = ({ isOpen, onClose }) => {
  const { showMessage, currentUser } = useAppContext(); // currentUser нэмэх
  const [transactionDate, setTransactionDate] = useState("");
  const [debitAccount, setDebitAccount] = useState("");
  const [creditAccount, setCreditAccount] = useState("");
  const [debitCurrency, setDebitCurrency] = useState("MNT");
  const [creditCurrency, setCreditCurrency] = useState("MNT");
  const [debitRate, setDebitRate] = useState(1);
  const [creditRate, setCreditRate] = useState(1);
  const [debitAmount, setDebitAmount] = useState(0);
  const [creditAmount, setCreditAmount] = useState(0);
  const [exchangeType, setExchangeType] = useState("АЛБАН ХАНШ");
  const [focusedField, setFocusedField] = useState(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 400);
  //const [message, setMessage] = useState("");
  const [cfName, setCfName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [transactionDescription, setTransactionDescription] = useState("");

  // Ledger modal state
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [selectedAccountForLedger, setSelectedAccountForLedger] = useState("");

  // Default огноог сүүлийн 1 сар болгох
  const today = new Date();
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());

  const [dateFrom, setDateFrom] = useState(lastMonth.toISOString().split("T")[0]);
  const [dateTo, setDateTo] = useState(today.toISOString().split("T")[0]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 400);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (transactionDate && exchangeType === "АЛБАН ХАНШ") {
      fetchRateForDate(transactionDate);
    }
  }, [debitAccount, creditAccount, exchangeType]);

  const fetchRateForDate = async (dateStr) => {
    try {
      return withLoading(
        () => {},
        showMessage,
        async () => {
          await Excel.run(async (context) => {
            const sheet = context.workbook.worksheets.getItem("Rate");
            const usedRange = sheet.getUsedRange();
            usedRange.load("values");
            await context.sync();

            const rows = usedRange.values;
            const header = rows[0];
            const data = rows.slice(1);

            const dateCol = header.indexOf("Тайлант огноо");
            const debitCurCol = header.indexOf(debitCurrency);
            const creditCurCol = header.indexOf(creditCurrency);

            if (dateCol === -1) throw new Error("❌ 'Огноо' багана олдсонгүй.");

            const matchRow = data.find((row) => {
              const cellVal = row[dateCol];
              if (!cellVal || typeof cellVal !== "number") return false;
              const cellDate = new Date(Date.UTC(1899, 11, 30 + cellVal));
              const isoDate = cellDate.toISOString().split("T")[0];
              return isoDate === dateStr;
            });

            if (!matchRow) {
              showMessage("⚠️ Тухайн огнооны ханш олдсонгүй.");

              return;
            }

            const debitR = debitCurrency === "MNT" ? 1 : parseFloat(matchRow[debitCurCol] || 1);
            const creditR = creditCurrency === "MNT" ? 1 : parseFloat(matchRow[creditCurCol] || 1);

            setDebitRate(debitR);
            setCreditRate(creditR);
          });
        },
        "fetchRateForDate"
      );
    } catch (err) {
      // withLoading-аас гарсан алдааг logger-д бичих
      logger.error("Rate олж авахад алдаа гарлаа", {
        user: currentUser?.username || currentUser?.email || "unknown",
        userId: currentUser?.id,
        error: err.message,
        errorType: err.name || "Unknown",
        dateStr,
        debitCurrency,
        creditCurrency,
        stack: err.stack,
      });

      // Хэрэглэгчид мэдээлэл өгөх
      const errorMessage = `❌ Ханш татахад алдаа гарлаа: ${err.message}`;
      showMessage(errorMessage);

      // Алдааг дахин шидэх
      throw err;
    }
  };

  const convertAmounts = (value, direction) => {
    if (debitCurrency !== creditCurrency && debitRate && creditRate) {
      const result = direction === "debit" ? (value * debitRate) / creditRate : (value * creditRate) / debitRate;
      return parseFloat(result.toFixed(2));
    }
    return value;
  };

  const handleDebitAmountChange = (e) => {
    const val = parseFloat(e.target.value || 0);
    setDebitAmount(val);
    setCreditAmount(convertAmounts(val, "debit"));
  };

  const handleCreditAmountChange = (e) => {
    const val = parseFloat(e.target.value || 0);
    setCreditAmount(val);
    setDebitAmount(convertAmounts(val, "credit"));
  };

  const handleSelectAccount = (selectedValue) => {
    const accNumber = selectedValue.account_number || selectedValue["Дансны дугаар"] || "";
    const accName = selectedValue.account_name || selectedValue["Дансны нэр"] || "";
    const currency = selectedValue.currency || selectedValue["Валют"] || "MNT";

    if (focusedField === "debit") {
      setDebitAccount(`${accNumber} - ${accName}`);
      setDebitCurrency(currency);
    }
    if (focusedField === "credit") {
      setCreditAccount(`${accNumber} - ${accName}`);
      setCreditCurrency(currency);
    }
    if (focusedField === "cf") {
      setCfName(`${selectedValue.code} - ${selectedValue.name}`);
    }
    if (focusedField === "customer") {
      setCustomerName(selectedValue.name);
    }
    setShowSearchModal(false);
  };

  // Account code авах туслах функц
  const getAccountCode = (accountString) => {
    if (!accountString) return "";
    // "12345 - Account Name" маягаас зөвхөн "12345" авах
    return accountString.split(" - ")[0] || "";
  };

  // Account нэр авах
  const getAccountName = (accountString) => {
    if (!accountString) return "";
    // "12345 - Account Name" маягаас зөвхөн "Account Name" авах
    return accountString.split(" - ")[1] || "";
  };

  // Account дэлгэрэнгүй мэдээлэл харах функц
  const handleViewAccountDetails = async (accountString, accountType) => {
    if (!accountString) {
      showMessage(`⚠️ ${accountType} данс сонгогдоогүй байна.`);
      return;
    }

    // Logger-д бүртгэх
    logger.info("Account хуулга харж байна", {
      user: currentUser?.username || currentUser?.email || "unknown",
      userId: currentUser?.id,
      accountCode: getAccountCode(accountString),
      accountName: getAccountName(accountString),
      accountType,
    });

    // LedgerModal нээх
    setSelectedAccountForLedger(accountString);
    setIsLedgerModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      // Бүх талбарууд бөглөгдсөн эсэхийг шалгах
      const missingFields = [];
      if (!transactionDate) missingFields.push("Огноо");
      if (!debitAccount) missingFields.push("Дебет данс");
      if (!creditAccount) missingFields.push("Кредит данс");
      if (!debitAmount || debitAmount <= 0) missingFields.push("Дебет дүн");
      if (!creditAmount || creditAmount <= 0) missingFields.push("Кредит дүн");
      if (!debitCurrency) missingFields.push("Дебет валют");
      if (!creditCurrency) missingFields.push("Кредит валют");
      if (!transactionDescription) missingFields.push("Гүйлгээний утга");

      if (missingFields.length > 0) {
        const errorMessage = `❌ Дараах талбаруудыг бөглөнө үү: ${missingFields.join(", ")}`;
        showMessage(errorMessage);
        logger.warn("Гүйлгээ хийхэд талбарууд дутуу байна", {
          user: currentUser?.username || currentUser?.email || "unknown",
          userId: currentUser?.id,
          missingFields,
          currentData: {
            transactionDate,
            debitAccount,
            creditAccount,
            debitAmount,
            creditAmount,
            debitCurrency,
            creditCurrency,
            cfName,
            customerName,
            transactionDescription,
          },
        });
        return;
      }

      logger.info("Гүйлгээ хийх процесс эхэлж байна", {
        user: currentUser?.username || currentUser?.email || "unknown",
        userId: currentUser?.id,
        transactionDate,
        debitAccount,
        creditAccount,
      });

      // Excel объект байгаа эсэхийг шалгах
      if (typeof Excel === "undefined") {
        const errorMessage = "❌ Excel платформ дээр ажиллаж байгаа үед л гүйлгээ хийх боломжтой";
        showMessage(errorMessage);
        logger.error("Excel объект олдсонгүй", {
          user: currentUser?.username || currentUser?.email || "unknown",
          userId: currentUser?.id,
          platform: "Excel Add-in",
        });
        return;
      }

      await Excel.run(async (context) => {
        // Journal sheet байгаа эсэхийг эхлээд шалгах
        const sheets = context.workbook.worksheets;
        sheets.load("items/name");
        await context.sync();

        const sheetNames = sheets.items.map((s) => s.name);
        logger.info("Excel дээр байгаа sheet-үүд:", { sheetNames });

        // Journal sheet байгаа эсэхийг шалгах
        const journalSheet = sheets.getItemOrNullObject("Journal");
        await context.sync();

        if (journalSheet.isNullObject) {
          throw new Error("❌ 'Journal' нэртэй worksheet олдсонгүй. Байгаа sheets: " + sheetNames.join(", "));
        }

        const usedRange = journalSheet.getUsedRange();
        usedRange.load("rowCount");
        await context.sync();

        const nextRow = usedRange.rowCount;
        const rowValues = [
          nextRow, // A: Д/Д (Дугаар)
          transactionDate, // B: Огноо
          "'" + getAccountCode(debitAccount), // C: Дебет (зөвхөн код)
          "'" + getAccountCode(creditAccount), // D: Кредит (зөвхөн код)
          debitCurrency, // E: Валют
          debitAmount, // F: Дүн
          transactionDescription, // H: Гүйлгээний утга
          customerName, // K: НӨАТ харилцагч
          "", // J: Харьцсан банк
          "", // I: ЭБ ДАМЖУУЛСАН РЕК.СЭМ.
          creditCurrency === "MNT" ? "TRUE" : "FALSE", // L: Валют чек
          creditAmount, // M: Өмнө валютаар
          cfName, // G: Гартер (Тайлбар)
        ];

        journalSheet.getRangeByIndexes(nextRow, 0, 1, rowValues.length).values = [rowValues];
        await context.sync();

        showMessage("✅ Гүйлгээ амжилттай бичигдлээ.");
        logger.info("Гүйлгээ амжилттай хийгдлээ", {
          transactionDate,
          debitAccount,
          creditAccount,
          debitAccountCode: getAccountCode(debitAccount),
          creditAccountCode: getAccountCode(creditAccount),
          debitAmount,
          creditAmount,
          debitCurrency,
          creditCurrency,
          transactionDescription,
          cfName,
          customerName,
          rowNumber: nextRow,
        });
        onClose();
      });
    } catch (err) {
      const errorMessage = `❌ Алдаа гарлаа: ${err.message}`;
      showMessage(errorMessage);

      // Logger-д алдааг дэлгэрэнгүй бүртгэх
      logger.error("TransactionModal хийхэд алдаа гарлаа", {
        user: currentUser?.username || currentUser?.email || "unknown",
        userId: currentUser?.id,
        error: err.message,
        errorType: err.name || "Unknown",
        transactionData: {
          transactionDate,
          debitAccount,
          creditAccount,
          debitAccountCode: getAccountCode(debitAccount),
          creditAccountCode: getAccountCode(creditAccount),
          debitAmount,
          creditAmount,
          debitCurrency,
          creditCurrency,
          cfName,
          customerName,
          transactionDescription,
        },
        stack: err.stack,
      });
    }
  };

  if (!isOpen) return null;

  const groupedRow = (label1, field1, label2, field2, label3, field3) => (
    <div style={{ display: isMobile ? "block" : "flex", gap: 10 }}>
      <Field label={label1} style={{ flex: 1 }}>
        {field1}
      </Field>
      <Field label={label2} style={{ flex: 1 }}>
        {field2}
      </Field>
      <Field label={label3} style={{ flex: 1 }}>
        {field3}
      </Field>
    </div>
  );

  const exchangeOptions = ["АЛБАН ХАНШ", "ЗАХЫН ХАНШ"];

  return (
    <>
      <div
        style={{
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
        }}
      >
        <div
          style={{
            width: "720px",
            maxHeight: "90vh",
            overflowY: "auto",
            background: "#fff",
            padding: "24px",
            borderRadius: "6px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <h2 style={{ fontSize: "18px", marginBottom: "10px" }}>Гүйлгээ</h2>

          <Field label="Гүйлгээний огноо *">
            <Input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} />
          </Field>

          <Field label="Дебит данс *">
            <div style={{ display: "flex", gap: 4 }}>
              <Input
                value={debitAccount}
                readOnly
                style={{ flex: 1, cursor: "pointer" }}
                onClick={() => handleViewAccountDetails(debitAccount, "дебет")}
              />
              <Button
                icon={<Search16Regular />}
                onClick={() => {
                  setFocusedField("debit");
                  setShowSearchModal(true);
                }}
              />
            </div>
          </Field>

          {groupedRow(
            "Гүйлгээний дүн *",
            <Input type="number" value={debitAmount} onChange={handleDebitAmountChange} />,
            "Валют",
            <Input value={debitCurrency} readOnly />,
            "Ханш",
            <Input
              type="number"
              value={debitRate}
              onChange={(e) => setDebitRate(parseFloat(e.target.value))}
              disabled={exchangeType === "АЛБАН ХАНШ"}
            />
          )}

          <Field label="Кредит данс">
            <div style={{ display: "flex", gap: 4 }}>
              <Input
                value={creditAccount}
                readOnly
                style={{ flex: 1, cursor: "pointer" }}
                onClick={() => handleViewAccountDetails(creditAccount, "кредит")}
              />
              <Button
                icon={<Search16Regular />}
                onClick={() => {
                  setFocusedField("credit");
                  setShowSearchModal(true);
                }}
              />
            </div>
          </Field>

          {groupedRow(
            "Гүйлгээний дүн *",
            <Input type="number" value={creditAmount} onChange={handleCreditAmountChange} />,
            "Валют",
            <Input value={creditCurrency} readOnly />,
            "Ханш",
            <Input
              type="number"
              value={creditRate}
              onChange={(e) => setCreditRate(parseFloat(e.target.value))}
              disabled={exchangeType === "АЛБАН ХАНШ"}
            />
          )}

          <Field label="Ханшийн төрөл *">
            <Dropdown
              value={exchangeType}
              onOptionSelect={(e, data) => setExchangeType(data.optionValue)}
              placeholder="Сонгох"
              selectedOptions={[exchangeType]}
            >
              {exchangeOptions.map((opt) => (
                <Option key={opt} value={opt}>
                  {opt}
                </Option>
              ))}
            </Dropdown>
          </Field>

          <Field label="Гүйлгээний утга *">
            <Textarea
              value={transactionDescription}
              onChange={(e) => setTransactionDescription(e.target.value)}
              placeholder="Гүйлгээний дэлгэрэнгүй утгыг оруулна уу"
            />
          </Field>

          <Field label="Мөнгөн гүйлгээ">
            <div style={{ display: "flex", gap: 4 }}>
              <Input value={cfName} readOnly style={{ flex: 1 }} />
              <Button
                icon={<Search16Regular />}
                onClick={() => {
                  setFocusedField("cf");
                  setShowSearchModal(true);
                }}
              />
            </div>
          </Field>

          <Field label="Харилцагч">
            <div style={{ display: "flex", gap: 4 }}>
              <Input value={customerName} readOnly style={{ flex: 1 }} />
              <Button
                icon={<Search16Regular />}
                onClick={() => {
                  setFocusedField("customer");
                  setShowSearchModal(true);
                }}
              />
            </div>
          </Field>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <Button appearance="primary" onClick={handleSubmit}>
              Гүйлгээ хийх
            </Button>
            <Button onClick={onClose}>Болих</Button>
          </div>
        </div>
      </div>
      <SearchAccount
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelect={handleSelectAccount}
      />

      {/* <Notification message={message} onClose={() => setMessage("")} /> */}

      {/* LedgerModal */}
      <LedgerModal
        isOpen={isLedgerModalOpen}
        onClose={() => setIsLedgerModalOpen(false)}
        selectedAccount={selectedAccountForLedger}
        initialDateFrom={dateFrom}
        initialDateTo={dateTo}
      />
    </>
  );
};

export default TransactionModal;
