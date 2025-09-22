import React, { useState, useEffect } from "react";
import {
  Input,
  Dropdown,
  Button,
  Textarea,
  Field,
  Option,
} from "@fluentui/react-components";
import { Search16Regular } from "@fluentui/react-icons";
import SearchAccount from "./SearchAccount";
import { withLoading } from "../apiHelpers";
import { useAppContext } from "./AppContext";

const TransactionModal = ({ isOpen, onClose }) => {
  const { showMessage } = useAppContext();
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
    return withLoading(() => {}, showMessage, async () => {
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
    });
  };

  const convertAmounts = (value, direction) => {
    if (debitCurrency !== creditCurrency && debitRate && creditRate) {
      const result = direction === "debit"
        ? (value * debitRate) / creditRate
        : (value * creditRate) / debitRate;
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
    const accNumber = selectedValue["Дансны дугаар"] || "";
    const accName = selectedValue["Дансны нэр"] || "";
    const currency = selectedValue["Валют"] || "MNT";

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

  const handleSubmit = async () => {
    try {
      await Excel.run(async (context) => {
        const sheet = context.workbook.worksheets.getItem("Journal");
        const usedRange = sheet.getUsedRange();
        usedRange.load("rowCount");
        await context.sync();

        const nextRow = usedRange.rowCount;
        const rowValues = [
          nextRow,
          transactionDate,
          debitAccount,
          creditAccount,
          debitCurrency,
          debitAmount,
          "", // Гүйлгээний утга
          customerName,
          creditAccount,
          customerName,
          creditCurrency,
          (debitAmount * debitRate).toFixed(2),
          cfName,
        ];

        sheet.getRangeByIndexes(nextRow, 0, 1, rowValues.length).values = [rowValues];
        await context.sync();

        showMessage("✅ Гүйлгээ амжилттай бичигдлээ.");
        onClose();
      });
    } catch (err) {
      showMessage("❌ Алдаа гарлаа: " + err.message);
    }
  };

  if (!isOpen) return null;

  const groupedRow = (label1, field1, label2, field2, label3, field3) => (
    <div style={{ display: isMobile ? "block" : "flex", gap: 10 }}>
      <Field label={label1} style={{ flex: 1 }}>{field1}</Field>
      <Field label={label2} style={{ flex: 1 }}>{field2}</Field>
      <Field label={label3} style={{ flex: 1 }}>{field3}</Field>
    </div>
  );

  const exchangeOptions = ["АЛБАН ХАНШ", "ЗАХЫН ХАНШ"];

  return (
    <>
  
      <div style={{
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
      }}>
        <div style={{
          width: "720px",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#fff",
          padding: "24px",
          borderRadius: "6px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}>
          <h2 style={{ fontSize: "18px", marginBottom: "10px" }}>Гүйлгээ</h2>

          <Field label="Гүйлгээний огноо *">
            <Input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} />
          </Field>

          <Field label="Дебит данс *">
            <div style={{ display: "flex", gap: 4 }}>
              <Input value={debitAccount} readOnly style={{ flex: 1 }} />
              <Button icon={<Search16Regular />} onClick={() => { setFocusedField("debit"); setShowSearchModal(true); }} />
            </div>
          </Field>

          {groupedRow(
            "Гүйлгээний дүн *",
            <Input type="number" value={debitAmount} onChange={handleDebitAmountChange} />, 
            "Валют",
            <Input value={debitCurrency} readOnly />, 
            "Ханш",
            <Input type="number" value={debitRate} onChange={(e) => setDebitRate(parseFloat(e.target.value))} disabled={exchangeType === "АЛБАН ХАНШ"} />
          )}

          <Field label="Кредит данс">
            <div style={{ display: "flex", gap: 4 }}>
              <Input value={creditAccount} readOnly style={{ flex: 1 }} />
              <Button icon={<Search16Regular />} onClick={() => { setFocusedField("credit"); setShowSearchModal(true); }} />
            </div>
          </Field>

          {groupedRow(
            "Гүйлгээний дүн *",
            <Input type="number" value={creditAmount} onChange={handleCreditAmountChange} />, 
            "Валют",
            <Input value={creditCurrency} readOnly />, 
            "Ханш",
            <Input type="number" value={creditRate} onChange={(e) => setCreditRate(parseFloat(e.target.value))} disabled={exchangeType === "АЛБАН ХАНШ"} />
          )}

          <Field label="Ханшийн төрөл *">
            <Dropdown
              value={exchangeType}
              onOptionSelect={(e, data) => setExchangeType(data.optionValue)}
              placeholder="Сонгох"
              selectedOptions={[exchangeType]}
            >
              {exchangeOptions.map((opt) => (
                <Option key={opt} value={opt}>{opt}</Option>
              ))}
            </Dropdown>
          </Field>

          <Field label="Гүйлгээний утга *">
            <Textarea />
          </Field>

          <Field label="Мөнгөн гүйлгээ">
            <div style={{ display: "flex", gap: 4 }}>
              <Input value={cfName} readOnly style={{ flex: 1 }} />
              <Button icon={<Search16Regular />} onClick={() => { setFocusedField("cf"); setShowSearchModal(true); }} />
            </div>
          </Field>

          <Field label="Харилцагч">
            <div style={{ display: "flex", gap: 4 }}>
              <Input value={customerName} readOnly style={{ flex: 1 }} />
              <Button icon={<Search16Regular />} onClick={() => { setFocusedField("customer"); setShowSearchModal(true); }} />
            </div>
          </Field>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
            <Button appearance="primary" onClick={handleSubmit}>Гүйлгээ хийх</Button>
            <Button onClick={onClose}>Болих</Button>
          </div>
        </div>
      </div>
      <SearchAccount isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} onSelect={handleSelectAccount} />
      {/* <Notification message={message} onClose={() => setMessage("")} /> */}
    </>
  );
};

export default TransactionModal;
