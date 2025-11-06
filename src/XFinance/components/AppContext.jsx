import React, { createContext, useState, useContext, useEffect, useCallback } from "react";
import { BASE_URL } from "../../config";
import { getAuthToken, getSelectedCompany } from "../../config/token";
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
  const [selectedCompany, setSelectedCompany] = useState(() => getSelectedCompany() || "dataNany");

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
    const token = getAuthToken();
    if (!token) {
      setIsLoggedIn(false);
      activityTracker.log("Token байхгүй тул fetchCurrentUser дууслаа", "auth", {}, "warn");
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
        activityTracker.log("fetchCurrentUser: Амжилттай", "auth", { user: data.user, permissions: data.permissions }, "info");
        
        // Хэрэглэгчийн allowed_companies шалгаад сонгогдсон компанийг validate хийх
        const allowedCompanies = data.user.allowed_companies;
        const currentSelectedCompany = getSelectedCompany();
        
        // Хэрэв allowed_companies NULL эсвэл хоосон бол selectedCompany-г устгах
        if (!allowedCompanies || allowedCompanies.length === 0) {
          console.log('🚫 User has no allowed_companies - clearing selectedCompany');
          setSelectedCompany(null);
          localStorage.removeItem('selectedCompany');
        } 
        // Хэрэв одоо сонгогдсон компани allowed_companies дотор байхгүй бол устгах
        else if (currentSelectedCompany && !allowedCompanies.includes(currentSelectedCompany)) {
          console.log(`⚠️ Selected company "${currentSelectedCompany}" not in allowed_companies - clearing selection`);
          setSelectedCompany(null);
          localStorage.removeItem('selectedCompany');
        }
        // Хэрэв сонгогдсон компани байхгүй бол эхний зөвшөөрөгдсөн компанийг сонгох
        else if (!currentSelectedCompany && allowedCompanies.length > 0) {
          console.log(`✅ Auto-selecting first allowed company: ${allowedCompanies[0]}`);
          setSelectedCompany(allowedCompanies[0]);
          localStorage.setItem('selectedCompany', allowedCompanies[0]);
        }
        
        return data.user;
      } else {
        // Token is invalid or expired
        activityTracker.log("fetchCurrentUser: Token хүчингүй эсвэл серверээс алдаа ирлээ", "auth", { status: response.status }, "warn");
        logout(false); // Logout without showing a message
      }
    } catch (error) {
      activityTracker.log("fetchCurrentUser: Алдаа гарлаа", "auth", { error: error.message }, "error");
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

  localStorage.setItem("authToken", data.token); // хадгалах хэсэг хэвээр
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
  localStorage.removeItem("selectedCompany"); // устгах хэсэг хэвээр
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
    let effectiveDuration = duration === 0 ? 0 : 1500;
    if (msg.startsWith("✅")) {
      setType("success");
      if (effectiveDuration > 0) setTimeout(() => setMessage(""), effectiveDuration);
    } else if (msg.startsWith("❌")) {
      setType("error");
      // Error мэссэж автоматаар хаагдахгүй
    } else if (msg.startsWith("⚠️")) {
      setType("warning");
      // Warning автоматаар хаагдахгүй
    } else {
      setType("info");
      // Info автоматаар хаагдахгүй
    }
  }, []);

  const fetchCompanies = useCallback(
    async (force = false) => {
      if (companies.length > 0 && !force) return;
      activityTracker.trackApiCall("DataFetch", "fetchCompanies", "GET", "/api/companies", { force });
      setLoading(true);
      try {
        const token = getAuthToken();
        const res = await fetch(`${BASE_URL}/api/companies`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!res.ok) throw new Error("Серверээс компаниудын жагсаалтыг татахад алдаа гарлаа.");
        let fetchedCompanies = await res.json();
        
        console.log('📊 Fetched companies:', fetchedCompanies);
        console.log('👤 Current user:', currentUser);
        
        // Хэрэв allowed_companies NULL буюу хоосон массив бол хоосон жагсаалт харуулах
        if (!currentUser?.allowed_companies || currentUser.allowed_companies.length === 0) {
          console.log('🚫 No allowed_companies - user has no access to any company');
          setCompanies([]);
          return;
        }
        
        // Зөвхөн зөвшөөрөгдсөн компаниудыг шүүж авах
        console.log('🔒 Filtering by allowed_companies:', currentUser.allowed_companies);
        fetchedCompanies = fetchedCompanies.filter(company => 
          currentUser.allowed_companies.includes(company.id)
        );
        console.log('✅ Filtered companies:', fetchedCompanies);
        
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
    [companies.length, showMessage, currentUser]
  );

  const fetchSettings = useCallback(
    async (force = false) => {
      if (!selectedCompany) {
        setSettings([]);
        return;
      }
      
      // Хэрэглэгчийн allowed_companies шалгах
      if (currentUser?.allowed_companies && !currentUser.allowed_companies.includes(selectedCompany)) {
        console.log(`🚫 Access denied: "${selectedCompany}" not in allowed_companies`);
        showMessage(`⚠️ Та "${selectedCompany}" компанийн датад хандах эрхгүй байна.`);
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
    [selectedCompany, settings.length, showMessage, currentUser]
  );

  const fetchSearchData = useCallback(
    async (force = false) => {
      if (!selectedCompany) {
        setSearchData({ account: [], cf: [], customer: [] });
        return;
      }
      
      // Хэрэглэгчийн allowed_companies шалгах
      if (currentUser?.allowed_companies && !currentUser.allowed_companies.includes(selectedCompany)) {
        console.log(`🚫 Access denied: "${selectedCompany}" not in allowed_companies`);
        showMessage(`⚠️ Та "${selectedCompany}" компанийн датад хандах эрхгүй байна.`);
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
    [selectedCompany, showMessage, searchData, currentUser]
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
      // Автоматаар дансны мэдээлэл татах
      fetchSearchData();
    } else if (!isLoggedIn) {
      localStorage.removeItem("selectedCompany");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
