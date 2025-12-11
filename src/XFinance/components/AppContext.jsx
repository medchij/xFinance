import React, { createContext, useState, useContext, useEffect, useCallback } from "react";
import { BASE_URL } from "../../config";
import { getAuthToken, getSelectedCompany } from "../../config/token";
import { ActivityTracker } from "../utils/activityTracker";
import defaultLogger from "../utils/logger";
import userJourneyTracker from "../utils/userJourneyTracker";

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
  const [dataDir, setDataDir] = useState(() => localStorage.getItem('dataDir') || null);
  const [selectedRoleId, setSelectedRoleId] = useState(() => {
    // Load selected role from localStorage
    const saved = localStorage.getItem('selectedRoleId');
    return saved ? parseInt(saved) : null;
  });
  const [selectedCompany, setSelectedCompany] = useState(() => {
    // Эхлээд dataDir ашиглах, байхгүй бол selectedCompany, тэр ч байхгүй бол dataNany
    const saved = localStorage.getItem('dataDir') || getSelectedCompany() || "dataNany";
    console.log(`🔄 Initial selectedCompany: ${saved}`);
    return saved;
  });

  // --- CACHED DATA STATES ---
  const [companies, setCompanies] = useState([]);
  const [settings, setSettings] = useState([]);
  const [searchData, setSearchData] = useState({ account: [], cf: [], customer: [] });
  const [actions, setActions] = useState(new Map()); // action_code -> {code, name, description}
  const [selectedRoleActions, setSelectedRoleActions] = useState(new Set()); // Set of action codes for selected role

  // Fetch actions for selected role
  useEffect(() => {
    const fetchRoleActions = async () => {
      if (!selectedRoleId) {
        setSelectedRoleActions(new Set());
        return;
      }

      try {
        const token = getAuthToken();
        if (!token) return;

        const response = await fetch(`${BASE_URL}/api/roles/${selectedRoleId}/actions`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const roleActions = await response.json();
          const actionCodes = new Set(roleActions.map(action => action.code));
          setSelectedRoleActions(actionCodes);
          console.log(`✅ Loaded ${actionCodes.size} actions for role ${selectedRoleId}:`, Array.from(actionCodes));
        } else {
          setSelectedRoleActions(new Set());
        }
      } catch (error) {
        console.error('Error fetching role actions:', error);
        setSelectedRoleActions(new Set());
      }
    };

    fetchRoleActions();
  }, [selectedRoleId]);

  const hasPermission = useCallback(
    (permission) => {
      return permissions.has(permission);
    },
    [permissions]
  );

  // Check if user has action by code (numeric)
  const hasAction = useCallback(
    (actionCode) => {
      if (!currentUser) return false;
      // If no role selected, deny access
      if (!selectedRoleId) return false;
      
      // actionCode can be a number or string
      const code = typeof actionCode === 'string' ? parseInt(actionCode) : actionCode;
      
      // Check if the selected role has this action
      return selectedRoleActions.has(code);
    },
    [currentUser, selectedRoleId, selectedRoleActions]
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
        console.log("✅ Setting isLoggedIn to true in fetchCurrentUser");
        setIsLoggedIn(true);
        activityTracker.log("fetchCurrentUser: Амжилттай", "auth", { user: data.user, permissions: data.permissions }, "info");
        
        // Хэрэглэгчийн allowed_companies шалгаад сонгогдсон компанийг validate хийх
        const allowedCompanies = data.user.allowed_companies;
        const savedDataDir = localStorage.getItem('dataDir');
        
        console.log(`🔍 Checking company selection:`, {
          allowedCompanies,
          savedDataDir,
          currentState: selectedCompany
        });
        
        // Хэрэв allowed_companies NULL эсвэл хоосон бол selectedCompany-г устгах
        if (!allowedCompanies || allowedCompanies.length === 0) {
          console.log('🚫 User has no allowed_companies - clearing selectedCompany and dataDir');
          setSelectedCompany(null);
          setDataDir(null);
          localStorage.removeItem('selectedCompany');
          localStorage.removeItem('dataDir');
        } 
        // 🎯 ЭХНИЙ PRIORITY: dataDir localStorage-д байвал түүнийгээ ашиглах
        else if (savedDataDir && allowedCompanies.includes(savedDataDir)) {
          console.log(`✅ Using saved dataDir: ${savedDataDir}`);
          setDataDir(savedDataDir);
          setSelectedCompany(savedDataDir);
          localStorage.setItem('selectedCompany', savedDataDir);
        }
        // dataDir allowed list-д байхгүй бол устгаад эхний компани сонгох
        else if (savedDataDir && !allowedCompanies.includes(savedDataDir)) {
          console.log(`⚠️ Saved dataDir "${savedDataDir}" not in allowed_companies - selecting first company`);
          setSelectedCompany(allowedCompanies[0]);
          setDataDir(allowedCompanies[0]);
          localStorage.setItem('selectedCompany', allowedCompanies[0]);
          localStorage.setItem('dataDir', allowedCompanies[0]);
        }
        // dataDir байхгүй бол эхний зөвшөөрөгдсөн компанийг сонгох
        else if (!savedDataDir && allowedCompanies.length > 0) {
          console.log(`✅ No saved dataDir - auto-selecting first allowed company: ${allowedCompanies[0]}`);
          setSelectedCompany(allowedCompanies[0]);
          setDataDir(allowedCompanies[0]);
          localStorage.setItem('selectedCompany', allowedCompanies[0]);
          localStorage.setItem('dataDir', allowedCompanies[0]);
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

      console.log("🔐 Login response data:", { token: data.token, hasToken: !!data.token, dataKeys: Object.keys(data) });
      
      if (!data.token) {
        console.error("❌ Token is missing from login response!", { data });
        throw new Error("Серверээс token ирээгүй байна");
      }
      
      localStorage.setItem("authToken", data.token); // хадгалах хэсэг хэвээр
      console.log("💾 Token saved to localStorage:", { saved: localStorage.getItem("authToken"), hasSaved: !!localStorage.getItem("authToken") });
      activityTracker.trackSuccess("AuthLogin", "Login successful, token saved");

      // Track login in user journey
      userJourneyTracker.trackFeatureUse('Authentication', 'login_success', { username });

      await fetchCurrentUser(); // Fetch user data right after login
      showMessage(`✅ ${data.message}`, 3000);
      activityTracker.trackAction("AuthLogin", "Login process completed");
      return true;
    } catch (error) {
      activityTracker.trackError("AuthLogin", "Login error", { error: error.message });
      userJourneyTracker.trackError('login_failed', error.message);
      showMessage(`❌ ${error.message}`, "error");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback((showLogoutMessage = true) => {
    activityTracker.trackAction("AuthLogout", "Logout process started", { showMessage: showLogoutMessage });

    // Track logout in user journey
    userJourneyTracker.trackFeatureUse('Authentication', 'logout', {
      sessionDuration: Date.now() - userJourneyTracker.currentSession.startTime
    });

    localStorage.removeItem("authToken");
    localStorage.removeItem("selectedCompany");
    localStorage.removeItem("dataDir");
    console.log("🗑️ Logout: authToken, selectedCompany, dataDir устгагдлаа");
    
    setIsLoggedIn(false);
    setCurrentUser(null);
    setPermissions(new Set());
    setSelectedCompany(null);
    setDataDir(null);
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
        
        // Fetch each endpoint separately to handle individual failures gracefully
        const results = await Promise.all(
          endpoints.map(async (ep) => {
            try {
              const response = await fetch(`${BASE_URL}/api/${ep}?company_id=${selectedCompany}`);
              if (!response.ok) {
                console.warn(`⚠️ ${ep} endpoint failed for ${selectedCompany}:`, response.status);
                return []; // Return empty array if endpoint fails
              }
              return await response.json();
            } catch (err) {
              console.warn(`⚠️ ${ep} fetch error for ${selectedCompany}:`, err.message);
              return []; // Return empty array on network error
            }
          })
        );
        
        const [account, cf, customer] = results;
        setSearchData({ account: account || [], cf: cf || [], customer: customer || [] });
        
        // Success message only if at least one endpoint returned data
        const totalRecords = (account?.length || 0) + (cf?.length || 0) + (customer?.length || 0);
        if (totalRecords > 0) {
          showMessage("✅ Хайлтын мэдээлэл амжилттай татлаа.");
        } else {
          showMessage("⚠️ Энэ компанид хайлтын өгөгдөл байхгүй байна.");
        }
      } catch (error) {
        console.error('❌ fetchSearchData error:', error);
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
    // Fetch companies when user is logged in and currentUser is available
    if (isLoggedIn && currentUser) {
      fetchCompanies();
    }
  }, [isLoggedIn, currentUser, fetchCompanies]);

  useEffect(() => {
    if (isLoggedIn && selectedCompany) {
      // selectedCompany болон dataDir-ийг localStorage-д хадгалах
      localStorage.setItem("selectedCompany", selectedCompany);
      localStorage.setItem("dataDir", selectedCompany);
      console.log(`🏢 Сонгогдсон компани хадгалагдлаа: ${selectedCompany}`);
      console.log(`📂 dataDir localStorage-д хадгалагдлаа: ${localStorage.getItem('dataDir')}`);
      
      // Track company selection in user journey
      userJourneyTracker.trackFeatureUse('Company Selection', 'changed', {
        company: selectedCompany
      });
      
      // dataDir state шинэчлэх
      setDataDir(selectedCompany);
      
      setSettings([]);
      setSearchData({ account: [], cf: [], customer: [] });
      // Автоматаар дансны мэдээлэл татах
      fetchSearchData();
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
        hasAction, // Expose the action checker
        actions,
        selectedCompany,
        setSelectedCompany,
        dataDir,
        setDataDir,
        selectedRoleId,
        setSelectedRoleId,
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
