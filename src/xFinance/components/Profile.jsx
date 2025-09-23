import React, { useEffect, useState } from "react";
import { BASE_URL } from "../../config";
import {
  Dropdown,
  Option,
  Button,
  Field,
  tokens,
} from "@fluentui/react-components";
import { useAppContext } from "./AppContext";
import Header from "./Header";

const Profile = ({ isSidebarOpen }) => {
  const {
    isLoggedIn,
    setIsLoggedIn,
    dataDir,
    setDataDir,
    showMessage,
  } = useAppContext();

  const [localDataDir, setLocalDataDir] = useState(dataDir || "dataNany");
  const [saving, setSaving] = useState(false);

  const options = ["dataNany", "dataSoyombo", "dataMall"];

  useEffect(() => {
    fetch("/env.json")
      .then((res) => res.json())
      .then((data) =>
        setLocalDataDir(data.DATA_DIR?.replace("./", "") || "dataNany")
      )
      .catch(() => {});
  }, []);

  const handleLogin = async () => {
    const updated = { DATA_DIR: `./${localDataDir}` };
    setSaving(true);

    try {
      const res =  await fetch(`${BASE_URL}/api/save-env`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });

      const result = await res.json();
      showMessage(result.message || "✅ Нэвтрэлт амжилттай");
      setDataDir(localDataDir);
      setIsLoggedIn(true);
    } catch (error) {
      showMessage("❌ Нэвтрэх үед алдаа гарлаа");
    }

    setSaving(false);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    showMessage("⚠️ Та системээс гарлаа");
  };

  return (
    <div
      style={{
        flexGrow: 1,
        // padding: "32px 24px", 
        backgroundColor: tokens.colorNeutralBackground1,
        minHeight: "100vh",
        marginLeft: isSidebarOpen ? 250 : 50,
        transition: "margin-left 0.3s ease-in-out",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header
        logo="assets/logo-filled.png"
        message={isLoggedIn ? "Welcome!" : "Login шаардлагатай"}
      />

      <div
        style={{
          background: "#fff",
          padding: "24px",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          marginTop: "20px",
        }}
      >
        <h2 style={{ marginBottom: "16px" }}>
          {isLoggedIn ? "👤 Профайл" : "🔐 Нэвтрэх"}
        </h2>

        {!isLoggedIn ? (
          <>
            <Field label="DATA_DIR фолдер сонгоно уу" style={{ padding: "20px" }}>
              <Dropdown
                value={localDataDir}
                onOptionSelect={(_, d) => setLocalDataDir(d.optionValue)}
              >
                {options.map((opt) => (
                  <Option key={opt} value={opt}>
                    {opt}
                  </Option>
                ))}
              </Dropdown>
            </Field>

            <Button appearance="primary" onClick={handleLogin} disabled={saving}>
              {saving ? "Түр хүлээнэ үү..." : "🔑 Нэвтрэх"}
            </Button>
          </>
        ) : (
          <>
            <p>🔧 Та <b>{dataDir}</b> орчинд ажиллаж байна.</p>
            <Button appearance="secondary" onClick={handleLogout}>
              🚪 Гарах
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default Profile;
