import React, { createContext, useState, useContext, useEffect } from "react";

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [dataDir, setDataDir] = useState("dataNany");
  const [actionLog, setActionLog] = useState([]);

  // ✅ LocalStorage-оос dataDir сэргээх
  useEffect(() => {
    const saved = localStorage.getItem("dataDir");
    if (saved) {
      console.log("🔁 LocalStorage-оос dataDir сэргээв:", saved);
      setDataDir(saved);
    }
  }, []);

  // ✅ dataDir өөрчлөгдөх бүрт localStorage-д хадгалах
  useEffect(() => {
    if (dataDir) {
      localStorage.setItem("dataDir", dataDir);
      console.log("💾 dataDir хадгалагдлаа:", dataDir);
    }
  }, [dataDir]);

  const logAction = (msg) => {
    const timestamp = new Date().toLocaleString();
    setActionLog((prevLog) => [...prevLog, { message: msg, time: timestamp }]);
  };

  const showMessage = (msg) => {
    setMessage(msg);
    logAction(msg); // ✨ Лог бүртгэх

    if (msg.startsWith("✅")) {
      setType("success");
      setTimeout(() => setMessage(""), 1000);
    } else if (msg.startsWith("❌")) {
      setType("error");
    } else if (msg.startsWith("⚠️")) {
      setType("warning");
    } else {
      setType("info");
    }
  };

  return (
    <AppContext.Provider
      value={{
        loading,
        setLoading,
        message,
        setMessage,
        showMessage,
        type,
        isLoggedIn,
        setIsLoggedIn,
        dataDir,
        setDataDir,
        actionLog,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
