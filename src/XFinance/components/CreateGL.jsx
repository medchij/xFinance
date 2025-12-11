import React, { useState, useEffect } from "react";
import { useAppContext } from "./AppContext";
import { ACTION_CODES } from "../utils/actionCodes";
import { BASE_URL } from "../../config";

const CreateGL = ({ isOpen, onClose }) => {
  const { showMessage, setLoading, selectedCompany, fetchSearchData, hasAction } = useAppContext();
  
  const canCreateAccount = hasAction && hasAction(ACTION_CODES.CREATE_ACCOUNT);

  const [dansniiNer, setDansniiNer] = useState("");
  const [edDugaar, setEdDugaar] = useState("");
  const [dansniiAngilal, setDansniiAngilal] = useState("");
  const [currency, setCurrency] = useState("MNT");

  const [categories, setCategories] = useState([]);
  const [glAccounts, setGlAccounts] = useState([]);
  const [currencies, setCurrencies] = useState([]);

  useEffect(() => {
    const fetchDropdownData = async () => {
      if (!selectedCompany) return;
      setLoading(true);
      try {
        const companyQuery = `?company_id=${selectedCompany.id}`;
        const [catRes, curRes] = await Promise.all([
          fetch(`${BASE_URL}/api/glcategory${companyQuery}`),
          fetch(`${BASE_URL}/api/currency${companyQuery}`),
        ]);

        if (!catRes.ok || !curRes.ok) {
          throw new Error("Серверээс ангилал эсвэл валютын мэдээлэл татахад алдаа гарлаа.");
        }

        const [catData, curData] = await Promise.all([catRes.json(), curRes.json()]);

        setCategories(Array.isArray(catData) ? catData : []);
        setCurrencies(Array.isArray(curData) ? curData : []);
      } catch (err) {
        console.error("Dropdown data fetch error:", err);
        showMessage("❌ " + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchDropdownData();
    }
  }, [isOpen, selectedCompany]);

  useEffect(() => {
    const fetchGLAccounts = async () => {
      if (!dansniiAngilal || !selectedCompany) {
        setGlAccounts([]);
        setEdDugaar("");
        setDansniiNer("");
        return;
      }

      setLoading(true);
      try {
        const companyQuery = `?company_id=${selectedCompany.id}`;
        const res = await fetch(`${BASE_URL}/api/glaccount${companyQuery}`);
        if (!res.ok) throw new Error("ЕДД жагсаалт татахад алдаа гарлаа.");
        const data = await res.json();

        const filtered = (Array.isArray(data) ? data : []).filter((a) => a.category === dansniiAngilal);
        setGlAccounts(filtered);
      } catch (err) {
        console.error("GLAccount fetch error:", err);
        showMessage("❌ " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGLAccounts();
  }, [dansniiAngilal, selectedCompany]);

  const handleAccountChange = (e) => {
    const selectedAccountNumber = e.target.value;
    setEdDugaar(selectedAccountNumber);

    const selected = glAccounts.find((a) => a.account_number === selectedAccountNumber);

    if (selected) {
      setDansniiNer(selected.account_name);
    } else {
      setDansniiNer("");
    }
  };

  const handleCreate = async () => {
    if (!selectedCompany) {
      showMessage("⚠️ Компани сонгоно уу.");
      return;
    }
    if (!dansniiAngilal || !edDugaar || !dansniiNer || !currency) {
      showMessage("⚠️ Бүх талбарыг гүйцэд бөглөнө үү.");
      return;
    }

    setLoading(true);
    try {
      const newGLAccount = {
        company_id: selectedCompany.id,
        account_name: dansniiNer,
        account_number: edDugaar,
        category: dansniiAngilal,
        currency: currency,
      };

      const res = await fetch(`${BASE_URL}/api/glaccount`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newGLAccount),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "ЕДД үүсгэхэд алдаа гарлаа.");
      }

      showMessage("✅ Ерөнхий дэвтрийн данс амжилттай үүслээ!");
      fetchSearchData(true); // Дансны жагсаалтыг шинэчлэх
      handleClose();
    } catch (err) {
      console.error("Create GL error:", err);
      showMessage("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDansniiAngilal("");
    setEdDugaar("");
    setDansniiNer("");
    setCurrency("MNT");
    onClose();
  };

  if (!isOpen) return null;

  if (!selectedCompany) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <p>⚠️ ЕДД үүсгэхийн тулд эхлээд Профайл хуудаснаас компани сонгоно уу.</p>
          <div style={styles.buttonRow}>
            <button style={styles.cancelButton} onClick={onClose}>
              Хаах
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>Ерөнхий дэвтэр үүсгэх</h2>

        <div style={styles.row}>
          <label>Дансны ангилал</label>
          <select value={dansniiAngilal} onChange={(e) => setDansniiAngilal(e.target.value)} style={styles.input}>
            <option value="">Ангилал сонгох</option>
            {categories.map((category, index) => (
              <option key={index} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.row}>
          <label>ЕД дугаар</label>
          <select value={edDugaar} onChange={handleAccountChange} style={styles.input} disabled={!dansniiAngilal}>
            <option value="">Дансны дугаар сонгох</option>
            {glAccounts.map((account, index) => (
              <option key={index} value={account.account_number}>
                {account.account_number}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.row}>
          <label>Дансны нэр</label>
          <input type="text" value={dansniiNer} onChange={(e) => setDansniiNer(e.target.value)} style={styles.input} />
        </div>

        <div style={styles.row}>
          <label>Валют</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={styles.input}>
            {currencies.map((currency, index) => (
              <option key={index} value={currency.code}>
                {currency.code}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.buttonRow}>
          <button 
            style={{...styles.submitButton, opacity: canCreateAccount ? 1 : 0.5, cursor: canCreateAccount ? 'pointer' : 'not-allowed'}} 
            onClick={handleCreate}
            disabled={!canCreateAccount}
            title={!canCreateAccount ? "Та энэ үйлдлийг хийх эрхгүй байна" : ""}
          >
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
  successMessage: {
    backgroundColor: "#e0ffe0",
    color: "#2d862d",
    padding: "8px",
    borderRadius: "4px",
    marginBottom: "10px",
    textAlign: "center",
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

export default CreateGL;
