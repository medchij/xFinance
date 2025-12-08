import React, { useEffect, useState } from "react";
import { BASE_URL } from "../../config";
import { 
  Dropdown, 
  Option, 
  Field, 
  tokens, 
  Button, 
  Input, 
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Tooltip,
} from "@fluentui/react-components";
import { 
  ArrowClockwise16Regular, 
  SignOut24Regular, 
  Settings24Regular,
  AddRegular,
  EditRegular,
  DeleteRegular,
  CheckmarkCircle24Regular,
  DismissCircle24Regular,
} from "@fluentui/react-icons";
import { useAppContext } from "./AppContext";

const Profile = ({ isSidebarOpen }) => {
  const {
    currentUser,
    selectedCompany,
    setSelectedCompany,
    showMessage,
    companies,
    fetchCompanies,
    loading,
    logout,
  } = useAppContext();

  const [settings, setSettings] = useState({
    language: "mn",
    currency: "MNT",
    dateFormat: "YYYY-MM-DD",
    theme: "light",
    emailNotifications: true,
    autoSync: true,
    sessionTimeout: 30,
  });

  const [originalSettings, setOriginalSettings] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showNewInput, setShowNewInput] = useState(false);
  const [newSetting, setNewSetting] = useState({ key: "", value: "" });
  const [editKey, setEditKey] = useState(null);

  useEffect(() => {
    if (currentUser) {
      fetchCompanies(false);
      loadUserSettings();
    }
  }, [fetchCompanies, currentUser]);

  useEffect(() => {
    // Тохиргоо өөрчлөгдсөн эсэхийг шалгах
    const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(changed);
  }, [settings, originalSettings]);

  const loadUserSettings = async () => {
    try {
      // localStorage-с уншиж авах (хурдан)
      const localSettings = localStorage.getItem('userSettings');
      if (localSettings) {
        setSettings(JSON.parse(localSettings));
      }

      // Backend-аас хэрэглэгчийн тохиргоо татах (компаниас хамаарахгүй)
      const token = localStorage.getItem('authToken');
      if (token) {
        const response = await fetch(`${BASE_URL}/api/user-settings`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const serverSettings = await response.json();
          
          // Boolean утгуудыг хөрвүүлэх
          const processedSettings = {};
          Object.entries(serverSettings).forEach(([key, value]) => {
            if (key === 'emailNotifications' || key === 'autoSync') {
              processedSettings[key] = value === 'true';
            } else if (key === 'sessionTimeout') {
              processedSettings[key] = parseInt(value);
            } else {
              processedSettings[key] = value;
            }
          });

          if (Object.keys(processedSettings).length > 0) {
            const newSettings = { ...settings, ...processedSettings };
            setSettings(newSettings);
            setOriginalSettings(newSettings);
            localStorage.setItem('userSettings', JSON.stringify(newSettings));
          } else {
            setOriginalSettings(settings);
          }
        } else {
          setOriginalSettings(settings);
        }
      }
    } catch (error) {
      console.error('Тохиргоо татахад алдаа:', error);
      setOriginalSettings(settings);
    }
  };

  const handleCompanyChange = (_, data) => {
    if (data.optionValue) {
      setSelectedCompany(data.optionValue);
      showMessage(`🏢 ${data.optionValue} компанид шилжлээ.`);
    }
  };

  const handleRefresh = () => {
    fetchCompanies(true);
  };

  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('userSettings', JSON.stringify(newSettings));
  };

  const handleSaveSettings = async () => {
    console.log('🔵 Хадгалах товч дарагдлаа', settings);
    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      console.log('🔵 Token:', token ? 'байна' : 'алга');
      
      if (token) {
        console.log('🔵 API дуудаж байна:', `${BASE_URL}/api/user-settings/batch`);
        const response = await fetch(`${BASE_URL}/api/user-settings/batch`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(settings),
        });

        console.log('🔵 Response status:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Амжилттай хадгалагдлаа:', result);
          setOriginalSettings(settings);
          setHasChanges(false);
          showMessage('✅ Тохиргоонууд амжилттай хадгалагдлаа!');
        } else {
          const errorText = await response.text();
          console.error('❌ Server алдаа:', response.status, errorText);
          showMessage('⚠️ Тохиргоо хадгалахад алдаа гарлаа.');
        }
      } else {
        console.warn('⚠️ Token олдсонгүй');
        showMessage('⚠️ Нэвтрэх шаардлагатай.');
      }
    } catch (error) {
      console.error('❌ Тохиргоо хадгалахад алдаа:', error);
      showMessage('❌ Сервертэй холбогдож чадсангүй.');
    } finally {
      setSaving(false);
      console.log('🔵 Saving дууслаа');
    }
  };

  const handleCancelChanges = () => {
    setSettings(originalSettings);
    localStorage.setItem('userSettings', JSON.stringify(originalSettings));
    setHasChanges(false);
    showMessage('🔄 Өөрчлөлтүүд цуцлагдлаа.');
  };

  const handleAddNewSetting = () => {
    if (!newSetting.key.trim() || !newSetting.value.trim()) {
      showMessage('⚠️ Түлхүүр болон утга шаардлагатай.', 'warning');
      return;
    }

    if (settings[newSetting.key]) {
      showMessage('⚠️ Энэ түлхүүр аль хэдийн байна.', 'warning');
      return;
    }

    const newSettings = { ...settings, [newSetting.key]: newSetting.value };
    setSettings(newSettings);
    localStorage.setItem('userSettings', JSON.stringify(newSettings));
    setNewSetting({ key: "", value: "" });
    setShowNewInput(false);
    showMessage('✅ Шинэ тохиргоо нэмэгдлээ.');
  };

  const handleDeleteSetting = (key) => {
    const predefinedKeys = ['language', 'currency', 'dateFormat', 'theme', 'emailNotifications', 'autoSync', 'sessionTimeout'];
    if (predefinedKeys.includes(key)) {
      showMessage('⚠️ Үндсэн тохиргоог устгах боломжгүй.', 'warning');
      return;
    }

    const newSettings = { ...settings };
    delete newSettings[key];
    setSettings(newSettings);
    localStorage.setItem('userSettings', JSON.stringify(newSettings));
    showMessage('🗑️ Тохиргоо устгагдлаа.');
  };

  const handleEditSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('userSettings', JSON.stringify(newSettings));
    setEditKey(null);
  };

  const getSettingDisplayValue = (key, value) => {
    if (typeof value === 'boolean') {
      return value ? '✅ Тийм' : '❌ Үгүй';
    }
    if (key === 'language') {
      return value === 'mn' ? '🇲🇳 Монгол' : '🇬🇧 English';
    }
    if (key === 'currency') {
      return value === 'MNT' ? '₮ MNT' : value === 'USD' ? '$ USD' : '€ EUR';
    }
    if (key === 'theme') {
      return value === 'light' ? '☀️ Гэрэл' : '🌙 Харанхуй';
    }
    return value;
  };

  const getSettingLabel = (key) => {
    const labels = {
      language: '🌐 Хэл',
      currency: '💰 Валют',
      dateFormat: '📅 Огноо формат',
      theme: '🎨 Theme',
      emailNotifications: '📧 Email мэдэгдэл',
      autoSync: '🔄 Автомат sync',
      sessionTimeout: '⏱️ Session timeout (мин)',
    };
    return labels[key] || key;
  };

  return (
    <div
      style={{
        flexGrow: 1,
        backgroundColor: tokens.colorNeutralBackground1,
        minHeight: "100vh",
        marginLeft: isSidebarOpen ? 180 : 50,
        transition: "margin-left 0.3s ease-in-out",
        display: "flex",
        flexDirection: "column",
        padding: "12px",
        maxWidth: "100%",
        overflowX: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* Компани сонгох хэсэг */}
      <div
        style={{
          background: "#fff",
          padding: "16px",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          marginBottom: "12px",
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
          <h2 style={{ fontSize: "18px", margin: 0 }}>Компани Сонголт</h2>
          <Button
            icon={<ArrowClockwise16Regular />}
            appearance="subtle"
            onClick={handleRefresh}
            aria-label="Сэргээх"
            disabled={loading}
          />
        </div>

        {loading && companies.length === 0 ? null : (
          <Field label="Таны ажиллах боломжтой компаниуд" style={{ maxWidth: "100%", width: "100%" }}>
            <Dropdown
              value={selectedCompany || ""}
              onOptionSelect={handleCompanyChange}
              placeholder="Компани сонгоно уу..."
              disabled={companies.length === 0}
              style={{ width: "100%", maxWidth: "400px" }}
            >
              {companies.map((company) => (
                <Option key={company.id} value={company.id}>
                  {company.name}
                </Option>
              ))}
            </Dropdown>
          </Field>
        )}

        {companies.length === 0 && !loading && (
          <p style={{ color: tokens.colorPaletteRedBackground3 }}>⚠️ Мэдээллийн санд компани бүртгэгдээгүй байна.</p>
        )}
      </div>

      {/* Системийн ерөнхий тохиргоо */}
      <div
        style={{
          background: "#fff",
          padding: "16px",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          maxWidth: "100%",
          boxSizing: "border-box",
          overflowX: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <Settings24Regular style={{ marginRight: "8px" }} />
            <h2 style={{ fontSize: "18px", margin: 0 }}>Системийн Ерөнхий Тохиргоо</h2>
          </div>
          <Button 
            appearance="primary" 
            icon={<AddRegular />} 
            onClick={() => setShowNewInput(!showNewInput)}
          >
            {showNewInput ? "Болих" : "Шинэ тохиргоо"}
          </Button>
        </div>

        {/* Шинэ тохиргоо нэмэх хэсэг */}
        {showNewInput && (
          <div style={{ 
            marginBottom: "16px", 
            padding: "12px", 
            backgroundColor: tokens.colorNeutralBackground2,
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}>
            <Field label="Түлхүүр нэр" style={{ width: "100%" }}>
              <Input
                placeholder="Жишээ: polaris_nessession"
                value={newSetting.key}
                onChange={(_, data) => setNewSetting({ ...newSetting, key: data.value })}
              />
            </Field>
            <Field label="Утга" style={{ width: "100%" }}>
              <Input
                placeholder="Утга оруулна уу"
                value={newSetting.value}
                onChange={(_, data) => setNewSetting({ ...newSetting, value: data.value })}
              />
            </Field>
            <Button 
              appearance="primary" 
              onClick={handleAddNewSetting}
              style={{ alignSelf: "flex-start" }}
            >
              Нэмэх
            </Button>
          </div>
        )}

        {/* Тохиргоо хүснэгт */}
        <div style={{ marginBottom: "16px", overflowX: "auto", overflowY: "visible", maxWidth: "100%" }}>
          <h3 style={{ marginBottom: "12px", fontSize: "16px" }}>📋 Бүх тохиргоо</h3>
          <Table style={{ width: "100%", tableLayout: "fixed" }}>
            <TableHeader>
              <TableRow>
                <TableHeaderCell style={{ width: "35%" }}>Тохиргооны нэр</TableHeaderCell>
                <TableHeaderCell style={{ width: "40%" }}>Утга</TableHeaderCell>
                <TableHeaderCell style={{ width: "25%", textAlign: "center" }}>Үйлдэл</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(settings).map(([key, value]) => (
                <TableRow key={key}>
                  <TableCell style={{ verticalAlign: "middle" }}>
                    <strong style={{ 
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}>
                      {getSettingLabel(key)}
                    </strong>
                  </TableCell>
                  <TableCell style={{ verticalAlign: "middle" }}>
                    {editKey === key ? (
                      <Input
                        value={typeof value === 'boolean' ? String(value) : String(value)}
                        onChange={(_, data) => {
                          const newValue = key === 'emailNotifications' || key === 'autoSync' 
                            ? data.value === 'true' 
                            : key === 'sessionTimeout' 
                            ? parseInt(data.value) || 30
                            : data.value;
                          setSettings({ ...settings, [key]: newValue });
                        }}
                        style={{ width: "100%" }}
                      />
                    ) : (
                      <span style={{ 
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        paddingRight: "8px"
                      }}>
                        {getSettingDisplayValue(key, value)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell style={{ textAlign: "center", verticalAlign: "middle" }}>
                    <div style={{ display: "flex", gap: "4px", justifyContent: "center", flexWrap: "nowrap" }}>
                      {editKey === key ? (
                        <>
                          <Tooltip content="Хадгалах" relationship="label">
                            <Button 
                              icon={<CheckmarkCircle24Regular />} 
                              appearance="subtle"
                              size="small"
                              onClick={() => handleEditSetting(key, settings[key])} 
                            />
                          </Tooltip>
                          <Tooltip content="Болих" relationship="label">
                            <Button 
                              icon={<DismissCircle24Regular />} 
                              appearance="subtle"
                              size="small"
                              onClick={() => {
                                setSettings({ ...settings, [key]: originalSettings[key] || value });
                                setEditKey(null);
                              }} 
                            />
                          </Tooltip>
                        </>
                      ) : (
                        <>
                          <Tooltip content="Засах" relationship="label">
                            <Button 
                              icon={<EditRegular />} 
                              appearance="subtle"
                              size="small"
                              onClick={() => setEditKey(key)} 
                            />
                          </Tooltip>
                          <Tooltip content="Устгах" relationship="label">
                            <Button 
                              icon={<DeleteRegular />} 
                              appearance="subtle"
                              size="small"
                              onClick={() => handleDeleteSetting(key)}
                            />
                          </Tooltip>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Хадгалах товчнууд */}
        {hasChanges && (
          <div style={{ 
            marginBottom: "16px", 
            padding: "12px", 
            backgroundColor: tokens.colorNeutralBackground2,
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}>
            <div>
              <strong>⚠️ Өөрчлөлтүүд хадгалагдаагүй байна</strong>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <Button 
                appearance="secondary" 
                onClick={handleCancelChanges}
                disabled={saving}
              >
                Цуцлах
              </Button>
              <Button 
                appearance="primary" 
                onClick={handleSaveSettings}
                disabled={saving}
              >
                {saving ? "Хадгалаж байна..." : "Хадгалах"}
              </Button>
            </div>
          </div>
        )}

        {/* Системээс гарах */}
        <div style={{ borderTop: `1px solid ${tokens.colorNeutralStroke1}`, paddingTop: "16px" }}>
          <h3 style={{ marginBottom: "8px", fontSize: "16px" }}>🚪 Системээс гарах</h3>
          <p style={{ marginBottom: "12px", color: tokens.colorNeutralForeground3, fontSize: "14px" }}>
            Та системээс гарч, нэвтрэх хуудас руу шилжих болно.
          </p>
          <Button icon={<SignOut24Regular />} appearance="primary" onClick={logout}>
            Системээс гарах
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
