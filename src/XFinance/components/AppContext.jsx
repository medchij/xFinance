import React, { createContext, useState, useContext, useEffect, useCallback } from "react";
import { BASE_URL } from "../../config";
import { ActivityTracker } from "../utils/activityTracker";
import defaultLogger from "../utils/logger";

const AppContext = createContext();

// Initialize activity tracker for AppContext
const activityTracker = ActivityTracker.getInstance();

export const AppProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [permissions, setPermissions] = useState(new Set()); // Use a Set for efficient lookups
  const [actionLog, setActionLog] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(() => localStorage.getItem("selectedCompany") || "data");

  // --- CACHED DATA STATES ---
  const [companies, setCompanies] = useState([]);
  const [settings, setSettings] = useState([]);
  const [searchData, setSearchData] = useState({ account: [], cf: [], customer: [] });

  const hasPermission = useCallback(
    (permission) => {
      return permissions.has(permission);
    },
    [permissions]
  );

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setIsLoggedIn(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
        setPermissions(new Set(data.permissions || []));
        setIsLoggedIn(true);
      } else {
        // Token is invalid or expired
        logout(false); // Logout without showing a message
      }
    } catch (error) {
      showMessage("❌ Хэрэглэгчийн мэдээлэл татахад алдаа гарлаа.");
      logout(false);
    } finally {
      setLoading(false);
    }
  };

  // --- AUTH FUNCTIONS ---
  const login = useCallback(async (username, password) => {
    setLoading(true);
    activityTracker.trackApiCall("AuthLogin", "login", "POST", "/api/auth/login", {
      username: username.substring(0, 3) + "***",
    });

    try {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        activityTracker.trackError("AuthLogin", "Login failed", { status: response.status, message: data.message });
        throw new Error(data.message || "Нэвтрэхэд алдаа гарлаа.");
      }

      localStorage.setItem("authToken", data.token);
      activityTracker.trackSuccess("AuthLogin", "Login successful, token saved");

      await fetchCurrentUser(); // Fetch user data right after login
      showMessage(`✅ ${data.message}`, 3000);
      activityTracker.trackAction("AuthLogin", "Login process completed");
      return true;
    } catch (error) {
      activityTracker.trackError("AuthLogin", "Login error", { error: error.message });
      showMessage(`❌ ${error.message}`, "error");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback((showLogoutMessage = true) => {
    activityTracker.trackAction("AuthLogout", "Logout process started", { showMessage: showLogoutMessage });

    localStorage.removeItem("authToken");
    localStorage.removeItem("selectedCompany");
    setIsLoggedIn(false);
    setCurrentUser(null);
    setPermissions(new Set());
    setSelectedCompany(null);
    setCompanies([]);
    setSettings([]);
    setSearchData({ account: [], cf: [], customer: [] });

    activityTracker.trackSuccess("AuthLogout", "Logout completed - all data cleared");

    if (showLogoutMessage) {
      showMessage("Системээс гарлаа.", 3000);
    }
  }, []);

  // --- DATA FETCHING FUNCTIONS ---

  const showMessage = useCallback((msg, duration) => {
    setMessage(msg);
    const effectiveDuration = duration === 0 ? 0 : msg.startsWith("✅") ? 1500 : 5000;
    if (msg.startsWith("✅")) setType("success");
    else if (msg.startsWith("❌")) setType("error");
    else if (msg.startsWith("⚠️")) setType("warning");
    else setType("info");
    if (effectiveDuration > 0) {
      setTimeout(() => setMessage(""), effectiveDuration);
    }
  }, []);

  const fetchCompanies = useCallback(
    async (force = false) => {
      if (companies.length > 0 && !force) return;
      activityTracker.trackApiCall("DataFetch", "fetchCompanies", "GET", "/api/companies", { force });
      setLoading(true);
      try {
        const res = await fetch(`${BASE_URL}/api/companies`);
        if (!res.ok) throw new Error("Серверээс компаниудын жагсаалтыг татахад алдаа гарлаа.");
        const fetchedCompanies = await res.json();
        setCompanies(fetchedCompanies);
        activityTracker.trackSuccess("DataFetch", "Companies list fetched successfully", {
          count: fetchedCompanies.length,
        });
      } catch (error) {
        activityTracker.trackError("DataFetch", "Error fetching companies", { error: error.message });
        showMessage(`❌ Компани татахад алдаа гарлаа: ${error.message}`);
      } finally {
        setLoading(false);
      }
    },
    [companies.length, showMessage]
  );

  const fetchSettings = useCallback(
    async (force = false) => {
      if (!selectedCompany) {
        setSettings([]);
        return;
      }
      if (settings.length > 0 && !force) return;
      activityTracker.trackApiCall("DataFetch", "fetchSettings", "GET", `/api/settings?company_id=${selectedCompany}`, {
        company: selectedCompany,
        force,
      });
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
    },
    [selectedCompany, settings.length, showMessage]
  );

  const fetchSearchData = useCallback(
    async (force = false) => {
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
        const responses = await Promise.all(
          endpoints.map((ep) => fetch(`${BASE_URL}/api/${ep}?company_id=${selectedCompany}`))
        );
        for (const res of responses) {
          if (!res.ok) throw new Error((await res.json()).message || "Хайлтын дата татахад алдаа гарлаа");
        }
        const [account, cf, customer] = await Promise.all(responses.map((res) => res.json()));
        setSearchData({ account, cf, customer });
        showMessage("✅ Хайлтын мэдээлэл амжилттай татлаа.");
      } catch (error) {
        showMessage(`❌ Алдаа: ${error.message}`);
        setSearchData({ account: [], cf: [], customer: [] });
      } finally {
        setLoading(false);
      }
    },
    [selectedCompany, showMessage, searchData]
  );

  // --- EFFECTS ---

  useEffect(() => {
    // Check for token and fetch user data on initial load
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (isLoggedIn && selectedCompany) {
      localStorage.setItem("selectedCompany", selectedCompany);
      console.log(`🏢 Сонгогдсон компани хадгалагдлаа: ${selectedCompany}`);
      setSettings([]);
      setSearchData({ account: [], cf: [], customer: [] });
    } else if (!isLoggedIn) {
      localStorage.removeItem("selectedCompany");
    }
  }, [selectedCompany, isLoggedIn]);

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
        login,
        logout,
        currentUser,
        permissions,
        hasPermission, // Expose the permission checker
        selectedCompany,
        setSelectedCompany,
        actionLog,
        companies,
        settings,
        searchData,
        fetchCompanies,
        fetchSettings,
        fetchSearchData,
        logger: defaultLogger, // Add logger to context
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
