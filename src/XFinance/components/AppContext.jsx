import React, { createContext, useState, useContext, useEffect, useCallback } from "react";
import { BASE_URL } from "../../config";

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [actionLog, setActionLog] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(() => localStorage.getItem("selectedCompany") || null);

  // --- CACHED DATA STATES ---
  const [companies, setCompanies] = useState([]);
  const [settings, setSettings] = useState([]);
  const [searchData, setSearchData] = useState({ account: [], cf: [], customer: [] });

  // --- DATA FETCHING FUNCTIONS ---

  const showMessage = useCallback((msg, duration) => {
    setMessage(msg);
    // Log action can be added here if desired
    const effectiveDuration = duration === 0 ? 0 : (msg.startsWith("✅") ? 1500 : 5000);
    if (msg.startsWith("✅")) setType("success");
    else if (msg.startsWith("❌")) setType("error");
    else if (msg.startsWith("⚠️")) setType("warning");
    else setType("info");
    if (effectiveDuration > 0) {
        setTimeout(() => setMessage(""), effectiveDuration);
    }
  }, []);

  const fetchCompanies = useCallback(async (force = false) => {
    if (companies.length > 0 && !force) return;
    console.log("🏢 Fetching companies...");
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/companies`);
      if (!res.ok) throw new Error("Серверээс компаниудын жагсаалтыг татахад алдаа гарлаа.");
      const fetchedCompanies = await res.json();
      setCompanies(fetchedCompanies);
      if (!selectedCompany && fetchedCompanies.length > 0) {
        showMessage("⚠️ Ажиллах компаниа сонгоно уу.", 0);
      }
    } catch (error) {
      showMessage(`❌ Компани татахад алдаа гарлаа: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [companies.length, selectedCompany, showMessage]);

  const fetchSettings = useCallback(async (force = false) => {
    if (!selectedCompany) {
        setSettings([]);
        return;
    }
    if (settings.length > 0 && !force) return;
    console.log(`📋 Fetching settings for ${selectedCompany}...`);
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/settings?company_id=${selectedCompany}`);
      if (!response.ok) throw new Error((await response.json()).message || "Тохиргоог татахад алдаа гарлаа.");
      setSettings(await response.json());
      showMessage("✅ Тохиргоо амжилттай татлаа.");
    } catch (error) {
      showMessage(`❌ Тохиргоо татах үед алдаа: ${error.message}`);
      setSettings([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, settings.length, showMessage]);

  const fetchSearchData = useCallback(async (force = false) => {
    if (!selectedCompany) {
        setSearchData({ account: [], cf: [], customer: [] });
        return;
    }
    const hasData = searchData.account.length > 0 || searchData.cf.length > 0 || searchData.customer.length > 0;
    if (hasData && !force) {
        return;
    }

    console.log(`🔍 Fetching search data for ${selectedCompany}...`);
    setLoading(true);
    showMessage("⏳ Хайлтын мэдээлэл татаж байна...", 0);
    try {
        const endpoints = ["account", "cf", "customer"];
        const responses = await Promise.all(endpoints.map(ep => fetch(`${BASE_URL}/api/${ep}?company_id=${selectedCompany}`)));
        for (const res of responses) {
            if (!res.ok) throw new Error((await res.json()).message || "Хайлтын дата татахад алдаа гарлаа");
        }
        const [account, cf, customer] = await Promise.all(responses.map(res => res.json()));
        setSearchData({ account, cf, customer });
        showMessage("✅ Хайлтын мэдээлэл амжилттай татлаа.");
    } catch (error) {
        showMessage(`❌ Алдаа: ${error.message}`);
        setSearchData({ account: [], cf: [], customer: [] });
    } finally {
        setLoading(false);
    }
  }, [selectedCompany, showMessage, searchData]);

  // --- EFFECTS ---

  useEffect(() => {
    if (selectedCompany) {
      localStorage.setItem("selectedCompany", selectedCompany);
      console.log(`🏢 Сонгогдсон компани хадгалагдлаа: ${selectedCompany}`);
      // When company changes, clear related data to force re-fetch
      setSettings([]);
      setSearchData({ account: [], cf: [], customer: [] });
    } else {
      localStorage.removeItem("selectedCompany");
      // Clear all company-specific data
      setCompanies([]);
      setSettings([]);
      setSearchData({ account: [], cf: [], customer: [] });
    }
  }, [selectedCompany]);

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
        selectedCompany,
        setSelectedCompany,
        actionLog,
        // Export cached data
        companies,
        settings,
        searchData,
        // Export fetch functions
        fetchCompanies,
        fetchSettings,
        fetchSearchData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
