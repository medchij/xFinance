import React, { createContext, useState, useContext, useEffect, useCallback } from "react";

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [actionLog, setActionLog] = useState([]);

  // REFACTOR: Rename `dataDir` to `selectedCompany` for clarity.
  // Initialize from localStorage or null. No default company.
  const [selectedCompany, setSelectedCompany] = useState(() => localStorage.getItem("selectedCompany") || null);

  // This effect saves the selected company to localStorage whenever it changes.
  useEffect(() => {
    if (selectedCompany) {
      localStorage.setItem("selectedCompany", selectedCompany);
      console.log(`🏢 Сонгогдсон компани хадгалагдлаа: ${selectedCompany}`);
    } else {
      localStorage.removeItem("selectedCompany");
    }
  }, [selectedCompany]);

  // FIX: Use useCallback to memoize functions and prevent re-renders.
  const logAction = useCallback((msg) => {
    const timestamp = new Date().toLocaleString();
    setActionLog((prevLog) => [...prevLog, { message: msg, time: timestamp }]);
  }, []);

  const showMessage = useCallback((msg) => {
    setMessage(msg);
    logAction(msg);
    
    const duration = msg.startsWith("✅") ? 1500 : 5000; // Shorter for success, longer for errors

    if (msg.startsWith("✅")) setType("success");
    else if (msg.startsWith("❌")) setType("error");
    else if (msg.startsWith("⚠️")) setType("warning");
    else setType("info");

    // Clear message after a delay, but not for indefinite messages (duration 0)
    if (duration > 0) {
        setTimeout(() => setMessage(""), duration);
    }

  }, [logAction]);

  return (
    <AppContext.Provider
      value={{
        loading,
        setLoading,
        message,
        showMessage,
        type,
        isLoggedIn,
        setIsLoggedIn,
        selectedCompany, // EXPORT: Export the new state
        setSelectedCompany, // EXPORT: Export the new setter
        actionLog,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
