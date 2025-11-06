import React, { useState, useEffect } from "react";
import { useAppContext } from "./AppContext";
import { BASE_URL } from "../../config";
import { useActivityTracking } from "../hooks/useActivityTracking";
import { withModalTracking, withFormTracking } from "./ActivityTrackingHOC";

const CreateAccount = ({ isOpen, onClose }) => {
  const { showMessage, setLoading, selectedCompany, fetchSearchData } = useAppContext();
  const { trackFormStart, trackFieldChange, trackSubmit, trackApiCall, trackError } = useActivityTracking('CreateAccount');
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
      if (!selectedCompany) {
        console.log("No selectedCompany:", selectedCompany);
        return;
      }
      try {
        console.log("Fetching data for company:", selectedCompany);
        const companyQuery = `?company_id=${selectedCompany}`;
        const [currencyRes, branchRes, glRes] = await Promise.all([
          fetch(`${BASE_URL}/api/currency${companyQuery}`),
          fetch(`${BASE_URL}/api/branch${companyQuery}`),
          fetch(`${BASE_URL}/api/glaccount${companyQuery}`),
        ]);

        if (!currencyRes.ok || !branchRes.ok || !glRes.ok) {
          throw new Error(`API error: currency ${currencyRes.status}, branch ${branchRes.status}, glaccount ${glRes.status}`);
        }

        setCurrencies(await currencyRes.json());
        setBranches(await branchRes.json());
        setGlAccounts(await glRes.json());
        console.log("Data fetched successfully");
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
    trackFormStart();
    
    if (!selectedCompany) {
      trackError(new Error("Компани сонгогдоогүй"), { action: 'create_account' });
      showMessage("⚠️ Эхлээд компани сонгоно уу.");
      return;
    }
    if (!dansniiDugaar || !dansniiNer || !currency || !salbar || !edd) {
      const missingFields = [];
      if (!dansniiDugaar) missingFields.push('account_number');
      if (!dansniiNer) missingFields.push('account_name'); 
      if (!currency) missingFields.push('currency');
      if (!salbar) missingFields.push('branch');
      if (!edd) missingFields.push('gl_account');
      
      trackError(new Error("Дутуу мэдээлэл"), { missingFields });
      showMessage("⚠️ Бүх талбарыг бөглөнө үү");
      return;
    }

    try {
      setLoading(true);
      
      const companyQuery = `?company_id=${selectedCompany}`;
      const companyBody = { company_id: selectedCompany };

      // Check for duplicates
      const allAccounts = await trackApiCall(
        () => fetch(`${BASE_URL}/api/account${companyQuery}`).then(res => res.json()),
        `/api/account${companyQuery}`,
        'GET'
      );
      
      const duplicate = allAccounts.find((acc) => acc.account_number === dansniiDugaar);

      if (duplicate) {
        trackError(new Error("Давхардсан дансны дугаар"), { accountNumber: dansniiDugaar });
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

      // Save account
      await trackApiCall(
        async () => {
          const saveRes = await fetch(`${BASE_URL}/api/account`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newAccount),
          });
          const saveResult = await saveRes.json();
          if (!saveRes.ok) {
            throw new Error(saveResult.message || "Хадгалах үед алдаа гарлаа");
          }
          return saveResult;
        },
        '/api/account',
        'POST'
      );

      // Update counter
      await trackApiCall(
        async () => {
          const counterRes = await fetch(`${BASE_URL}/api/gl-tooluurchange`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ edd, ...companyBody }),
          });
          const counterResult = await counterRes.json();
          if (!counterRes.ok) {
            throw new Error(counterResult.message || "Тоолуур шинэчлэхэд алдаа гарлаа");
          }
          return counterResult;
        },
        '/api/gl-tooluurchange',
        'PUT'
      );

      trackSubmit(true);
      showMessage("✅ Данс амжилттай үүслээ");
      fetchSearchData(true);
      handleClose();
    } catch (err) {
      trackSubmit(false, [err.message]);
      trackError(err, { action: 'create_account' });
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
            onChange={(e) => {
              console.log("EDD onChange:", e.target.value);
              setEdd(e.target.value);
              trackFieldChange('edd', e.target.value);
            }}
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
            onChange={(e) => {
              setSalbar(e.target.value);
              trackFieldChange('salbar', e.target.value);
            }}
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
