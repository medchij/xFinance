import React, { useState } from "react";
import { useAppContext } from "./AppContext";
import { BASE_URL } from "../../config";
import { ACTION_CODES } from "../utils/actionCodes";

const CreateCustomer = ({ isOpen, onClose }) => {
  const { showMessage, setLoading, selectedCompany, fetchSearchData, hasAction } = useAppContext();
  const canCreateCustomer = hasAction && hasAction(ACTION_CODES.CREATE_CUSTOMER);
  
  const [name, setName] = useState("");
  const [status, setStatus] = useState("Идэвхитэй");

  const handleCreate = async () => {
    if (!canCreateCustomer) {
      showMessage("Та энэ үйлдлийг хийх эрхгүй байна", "warning");
      return;
    }
    if (!selectedCompany) {
      showMessage("⚠️ Эхлээд компани сонгоно уу.");
      return;
    }
    if (!name.trim()) {
      showMessage("⚠️ Нэрийг оруулна уу");
      return;
    }

    try {
      setLoading(true);
      const companyQuery = `?company_id=${selectedCompany.id}`;

      const res = await fetch(`${BASE_URL}/api/customer${companyQuery}`);
      const allCustomers = await res.json();

      const duplicate = allCustomers.find((cus) => cus.name.toLowerCase() === name.trim().toLowerCase());

      if (duplicate) {
        showMessage("⚠️ Ижил нэртэй харилцагч аль хэдийн үүссэн байна");
        return;
      }

      const saveRes = await fetch(`${BASE_URL}/api/customer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          status,
          company_id: selectedCompany.id, // ✅ company_id-г нэмэх
        }),
      });

      const result = await saveRes.json();

      if (!saveRes.ok) {
        throw new Error(result.message || "Хадгалах үед алдаа гарлаа");
      }

      showMessage("✅ Харилцагч амжилттай нэмэгдлээ");
      fetchSearchData(true); // ✅ Жагсаалтыг шинэчлэх
      handleClose(); // ✅ Цонхыг хаах
    } catch (err) {
      console.error("Харилцагч нэмэхэд алдаа:", err);
      showMessage("❌ " + (err.message || "Сервертэй холбогдоход алдаа гарлаа"));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    setStatus("Идэвхитэй");
    onClose();
  };

  if (!isOpen) return null;

  // ✅ Компани сонгоогүй бол харуулах UI
  if (!selectedCompany) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <p>⚠️ Харилцагч үүсгэхийн тулд эхлээд Профайл хуудаснаас компани сонгоно уу.</p>
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
        <h2 style={styles.title}>Харилцагч нэмэх</h2>

        <div style={styles.row}>
          <label>Нэр</label>
          <input
            type="text"
            value={name}
            placeholder="Харилцагчийн нэр оруулна уу"
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.row}>
          <label>Төлөв</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={styles.input}>
            <option value="Идэвхитэй">Идэвхитэй</option>
            <option value="Идэвхгүй">Идэвхгүй</option>
          </select>
        </div>

        <div style={styles.buttonRow}>
          <button
            style={{
              ...styles.submitButton,
              opacity: canCreateCustomer ? 1 : 0.5,
              cursor: canCreateCustomer ? "pointer" : "not-allowed",
            }}
            onClick={handleCreate}
            disabled={!canCreateCustomer}
            title={!canCreateCustomer ? "Та энэ үйлдлийг хийх эрхгүй байна" : ""}
          >
            Хадгалах
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
    width: "400px",
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

export default CreateCustomer;
