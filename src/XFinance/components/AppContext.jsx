import React, { createContext, useState, useContext, useEffect } from "react";

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [actionLog, setActionLog] = useState([]);

  // FIX: Initialize state from localStorage synchronously to prevent re-render loops.
  const [dataDir, setDataDir] = useState(() => {
    const saved = localStorage.getItem("dataDir");
    // This log will only run once on initial load.
    console.log(saved ? `🔁 LocalStorage-оос dataDir сэргээв: ${saved}` : "🤔 LocalStorage-д dataDir байхгүй, default-г ашиглая: dataNany");
    return saved || "dataNany";
  });

  // This effect now only *saves* the dataDir to localStorage when it changes.
  useEffect(() => {
    if (dataDir) {
      localStorage.setItem("dataDir", dataDir);
    } else {
      // If dataDir becomes null/undefined for some reason, remove it.
      localStorage.removeItem("dataDir");
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
