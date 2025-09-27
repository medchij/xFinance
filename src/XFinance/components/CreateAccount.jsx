import React, { useState, useEffect } from "react";
import { useAppContext } from "./AppContext";
import { BASE_URL } from "../../config";

const CreateAccount = ({ isOpen, onClose }) => {
  const { showMessage, setLoading, selectedCompany, fetchSearchData } = useAppContext();
  const [edd, setEdd] = useState("");
  const [dansniiNer, setDansniiNer] = useState("");
  const [currency, setCurrency] = useState("");
  const [salbar, setSalbar] = useState("");
  const [dansniiDugaar, setDansniiDugaar] = useState("");

  const [currencies, setCurrencies] = useState([]);
  const [branches, setBranches] = useState([]);
  const [glAccounts, setGlAccounts] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedCompany) return;
      try {
        const companyQuery = `?company_id=${selectedCompany.id}`;
        const [currencyRes, branchRes, glRes] = await Promise.all([
          fetch(`${BASE_URL}/api/currency${companyQuery}`),
          fetch(`${BASE_URL}/api/branch${companyQuery}`),
          fetch(`${BASE_URL}/api/glaccount${companyQuery}`),
        ]);

        setCurrencies(await currencyRes.json());
        setBranches(await branchRes.json());
        setGlAccounts(await glRes.json());
      } catch (error) {
        console.error("Өгөгдөл татахад алдаа гарлаа:", error);
        showMessage("❌ Өгөгдөл татахад алдаа гарлаа");
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen, selectedCompany]);

  // ЗАСВАР: Англи түлхүүр үгс ашиглах
  useEffect(() => {
    if (edd && salbar) {
      generateAccountNumber();
    }

    if (edd) {
      const selectedAccount = glAccounts.find(
        (account) => account.account_number === edd
      );

      if (selectedAccount) {
        setDansniiNer(selectedAccount.account_name);
        setCurrency(selectedAccount.currency);
      }
    } else {
      setDansniiNer("");
      setCurrency("");
    }
  }, [edd, salbar, glAccounts]);

  const padNumber = (number, length) => {
    return number.toString().padStart(length, "0");
  };

  // ЗАСВАР: Англи түлхүүр үгс ашиглах
  const generateAccountNumber = () => {
    const selectedAccount = glAccounts.find(
      (account) => account.account_number === edd
    );

    if (selectedAccount && salbar) {
      const eddDugaar = selectedAccount.account_number;
      const salbarCode = salbar;
      const tooluur = parseInt(selectedAccount.counter) + 1;

      const newAccountNumber = `${eddDugaar}${salbarCode}${padNumber(tooluur, 4)}`;

      setDansniiDugaar(newAccountNumber);
    }
  };

  const handleCreate = async () => {
    if (!selectedCompany) {
      showMessage("⚠️ Эхлээд компани сонгоно уу.");
      return;
    }
    if (!dansniiDugaar || !dansniiNer || !currency || !salbar || !edd) {
      showMessage("⚠️ Бүх талбарыг бөглөнө үү");
      return;
    }

    try {
      setLoading(true);
      const companyQuery = `?company_id=${selectedCompany.id}`;
      const companyBody = { company_id: selectedCompany.id };

      const res = await fetch(`${BASE_URL}/api/account${companyQuery}`);
      const allAccounts = await res.json();
      // ЗАСВАР: Англи түлхүүр үг ашиглах
      const duplicate = allAccounts.find((acc) => acc.account_number === dansniiDugaar);

      if (duplicate) {
        showMessage("⚠️ Ижил дансны дугаар аль хэдийн үүссэн байна");
        return;
      }

      const newAccount = {
        ...companyBody,
        account_number: dansniiDugaar,
        account_name: dansniiNer,
        currency: currency,
        branch: branches.find((b) => b.code === salbar)?.name || salbar,
      };

      const saveRes = await fetch(`${BASE_URL}/api/account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAccount),
      });

      const saveResult = await saveRes.json();

      if (!saveRes.ok) {
        throw new Error(saveResult.message || "Хадгалах үед алдаа гарлаа");
      }

      const counterRes = await fetch(`${BASE_URL}/api/gl-tooluurchange`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edd, ...companyBody }),
      });

      const counterResult = await counterRes.json();

      if (!counterRes.ok) {
        throw new Error(counterResult.message || "Тоолуур шинэчлэхэд алдаа гарлаа");
      }

      showMessage("✅ Данс амжилттай үүслээ");
      fetchSearchData(true);
      handleClose();
    } catch (err) {
      console.error("Данс үүсгэхэд алдаа гарлаа:", err);
      showMessage("❌ " + (err.message || "Сервертэй холбогдоход алдаа гарлаа"));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEdd("");
    setDansniiNer("");
    setCurrency("");
    setSalbar("");
    setDansniiDugaar("");
    onClose();
  };

  if (!isOpen) return null;

  if (!selectedCompany) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <p>⚠️ Данс үүсгэхийн тулд эхлээд Профайл хуудаснаас компани сонгоно уу.</p>
          <div style={styles.buttonRow}>
            <button style={styles.cancelButton} onClick={onClose}>Хаах</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>Данс үүсгэх</h2>
        <div style={styles.row}>
          <label>ЕДД</label>
          <select
            value={edd}
            onChange={(e) => setEdd(e.target.value)}
            style={styles.input}
          >
            <option value="">ЕДД сонгох</option>
            {/* ЗАСВАР: Англи түлхүүр үгс ашиглах */}
            {glAccounts.map((account, index) => (
              <option key={index} value={account.account_number}>
                {account.account_number} - {account.account_name}
              </option>
            ))}
          </select>
        </div>
        <div style={styles.row}>
          <label>Салбар</label>
          <select
            value={salbar}
            onChange={(e) => setSalbar(e.target.value)}
            style={styles.input}
          >
            <option value="">Салбар сонгох</option>
            {branches.map((branch, index) => (
              <option key={index} value={branch.code}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
        <div style={styles.row}>
          <label>Дансны нэр</label>
          <input
            type="text"
            value={dansniiNer}
            placeholder="Дансны нэрээ оруулна уу"
            onChange={(e) => setDansniiNer(e.target.value)}
            style={styles.input}
          />
        </div>
        <div style={styles.row}>
          <label>Дансны дугаар</label>
          <input
            type="text"
            value={dansniiDugaar}
            readOnly
            style={{ ...styles.input, background: "#f9f9f9" }}
          />
        </div>
        <div style={styles.row}>
          <label>Валют</label>
          <input
            type="text"
            value={currency}
            readOnly
            style={{ ...styles.input, background: "#f9f9f9" }}
          />
        </div>
        <div style={styles.buttonRow}>
          <button style={styles.submitButton} onClick={handleCreate}>
            Данс үүсгэх
          </button>
          <button style={styles.cancelButton} onClick={handleClose}>
            Болих
          </button>
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
    background: "rgba(0, 0, 0, 0.3)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modal: {
    width: "600px",
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
    fontSize: "18px",
    marginBottom: "15px",
    borderBottom: "1px solid #ddd",
    paddingBottom: "10px",
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
  buttonRow: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "15px",
  },
  submitButton: {
    background: "#7367f0",
    color: "#fff",
    border: "none",
    padding: "10px 15px",
    cursor: "pointer",
    borderRadius: "4px",
  },
  cancelButton: {
    background: "#ccc",
    border: "none",
    padding: "10px 15px",
    cursor: "pointer",
    borderRadius: "4px",
  },
};

export default CreateAccount;
