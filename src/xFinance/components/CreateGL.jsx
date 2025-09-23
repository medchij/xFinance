import React, { useState, useEffect } from "react";
import { BASE_URL} from "../../config";
const CreateGL = ({ isOpen, onClose }) => {
  const [dansniiNer, setDansniiNer] = useState("");
  const [edDugaar, setEdDugaar] = useState("");
  const [dansniiAngilal, setDansniiAngilal] = useState("");
  const [currency, setCurrency] = useState("MNT");
  const [categories, setCategories] = useState([]);
  const [filteredAccounts, setFilteredAccounts] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [message, setMessage] = useState("");

 useEffect(() => {
  (async () => {
    try {
      const [catRes, curRes] = await Promise.all([
        fetch(`${BASE_URL}/api/glcategory`),
        fetch(`${BASE_URL}/api/currency`),
      ]);

      if (!catRes.ok || !curRes.ok) {
        throw new Error("Серверээс амжилтгүй хариу ирлээ.");
      }

      const [catData, curData] = await Promise.all([
        catRes.json(),
        curRes.json(),
      ]);

      setCategories(Array.isArray(catData) ? catData : []);
      setCurrencies(Array.isArray(curData) ? curData : []);
    } catch (err) {
      console.error("Reference fetch error:", err);
      // showMessage?.("❌ Өгөгдөл татахад алдаа гарлаа"); // Хэрвээ AppContext ашигладаг бол
    }
  })();
}, []);

// Ангилал өөрчлөгдөхөд ЕДД жагсаалтыг шүүх
useEffect(() => {
  if (!dansniiAngilal) {
    setFilteredAccounts([]);
    setEdDugaar("");
    setDansniiNer("");
    return;
  }

  (async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/glaccount`);
      if (!res.ok) throw new Error("GLAccount татахад алдаа гарлаа.");
      const data = await res.json();

      const filtered = (Array.isArray(data) ? data : []).filter(
        (a) => a["Дансны ангилал"] === dansniiAngilal
      );

      setFilteredAccounts(filtered);
      setEdDugaar("");
      setDansniiNer("");
    } catch (err) {
      console.error("GLAccount fetch error:", err);
      // showMessage?.("❌ ЕДД жагсаалт татахад алдаа гарлаа");
    }
  })();
}, [dansniiAngilal]);

const handleAccountChange = (e) => {
  const selected = filteredAccounts.find(
    (a) => a["Дансны дугаар"] === e.target.value
  );
  if (selected) {
    setEdDugaar(selected["Дансны дугаар"]);
    setDansniiNer(selected["Дансны нэр"]);
  } else {
    setEdDugaar("");
    setDansniiNer("");
  }
};

const handleCreate = () => {
  setMessage("Данс амжилттай үүслээ!");
  setTimeout(() => setMessage(""), 3000);
  setDansniiAngilal("");
  setEdDugaar("");
  setDansniiNer("");
  setCurrency("MNT");
};

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>Ерөнхий дэвтэр үүсгэх</h2>

        {message && <div style={styles.successMessage}>{message}</div>}

        <div style={styles.row}>
          <label>Дансны ангилал</label>
          <select
            value={dansniiAngilal}
            onChange={(e) => setDansniiAngilal(e.target.value)}
            style={styles.input}
          >
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
          <select
            value={edDugaar}
            onChange={handleAccountChange}
            style={styles.input}
            disabled={!dansniiAngilal}
          >
            <option value="">Дансны дугаар сонгох</option>
            {filteredAccounts.map((account, index) => (
              <option key={index} value={account["Дансны дугаар"]}>
                {account["Дансны дугаар"]}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.row}>
          <label>Дансны нэр</label>
          <input
            type="text"
            value={dansniiNer}
            onChange={(e) => setDansniiNer(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.row}>
          <label>Валют</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            style={styles.input}
          >
            {currencies.map((currency, index) => (
              <option key={index} value={currency.code}>
                {currency.code}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.buttonRow}>
          <button style={styles.submitButton} onClick={handleCreate}>
            Данс үүсгэх
          </button>
          <button style={styles.cancelButton} onClick={onClose}>
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