import React, { useState } from "react";
import { useAppContext } from "./AppContext";
import { BASE_URL } from "../../config";
const CustomerModal = ({ isOpen, onClose }) => {
  const { showMessage, setLoading } = useAppContext(); // ✅ AppContext-оос авна
  const [name, setName] = useState("");
  const [status, setStatus] = useState("Идэвхитэй");

  const handleCreate = async () => {
    if (!name.trim()) {
      showMessage("⚠️ Нэрийг оруулна уу");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${BASE_URL}/api/customer`);
      const allCustomers = await res.json();

      const duplicate = allCustomers.find(
        (cus) => cus["name"].toLowerCase() === name.toLowerCase()
      );

      if (duplicate) {
        showMessage("⚠️ Ижил нэртэй харилцагч аль хэдийн үүссэн байна");
        return;
      }

      const saveRes = await fetch(`${BASE_URL}/api/customer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          status,
        }),
      });

      const result = await saveRes.json();

      if (!saveRes.ok) {
        throw new Error(result.message || "Хадгалах үед алдаа гарлаа");
      }

      showMessage("✅ Хэрэглэгч амжилттай нэмэгдлээ");
      setName("");
      setStatus("Идэвхитэй");
    } catch (err) {
      console.error("Хэрэглэгч нэмэхэд алдаа:", err);
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

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>Хэрэглэгч нэмэх</h2>

        <div style={styles.row}>
          <label>Нэр</label>
          <input
            type="text"
            value={name}
            placeholder="Хэрэглэгчийн нэр оруулна уу"
            onChange={(e) => setName(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.row}>
          <label>Төлөв</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={styles.input}
          >
            <option value="Идэвхитэй">Идэвхитэй</option>
            <option value="Идэвхгүй">Идэвхгүй</option>
          </select>
        </div>

        <div style={styles.buttonRow}>
          <button style={styles.submitButton} onClick={handleCreate}>
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

export default CustomerModal;
