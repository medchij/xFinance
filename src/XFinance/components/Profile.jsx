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
  makeStyles,
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
import ConfirmationDialog from "./ConfirmationDialog";

const useStyles = makeStyles({
  container: {
    padding: "12px",
    minHeight: "100vh",
    boxSizing: "border-box",
    backgroundColor: tokens.colorNeutralBackground1,
  },
  card: {
    background: "#fff",
    padding: "16px",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    marginBottom: "12px",
    maxWidth: "100%",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
    flexWrap: "wrap",
    gap: "8px",
  },
  title: {
    fontSize: "18px",
    margin: 0,
  },
  tableContainer: {
    overflowX: "auto",
    width: "100%",
    marginBottom: "16px",
  },
  newSettingRow: {
    display: "flex",
    gap: "10px",
    marginTop: "16px",
    alignItems: "flex-end",
  },
});

const Profile = ({ isSidebarOpen }) => {
  const styles = useStyles();
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
  const [deleteKey, setDeleteKey] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
        // Зөвхөн өөрчлөгдсөн key-үүдийг олох
        const changedKeys = Object.keys(settings).filter(
          key => settings[key] !== originalSettings[key]
        );
        
        console.log('🔵 Өөрчлөгдсөн key-үүд:', changedKeys);
        
        let savedCount = 0;
        let errorCount = 0;
        
        // Өөрчлөгдсөн бүрийг нэг бүрчлэн хадгалах
        for (const key of changedKeys) {
          try {
            const response = await fetch(`${BASE_URL}/api/user-settings`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({ 
                setting_key: key, 
                setting_value: String(settings[key]) 
              }),
            });

            if (response.ok) {
              savedCount++;
            } else {
              errorCount++;
              console.error(`❌ ${key} хадгалахад алдаа:`, response.status);
            }
          } catch (err) {
            errorCount++;
            console.error(`❌ ${key} хадгалахад алдаа:`, err);
          }
        }
        
        if (errorCount === 0) {
          console.log(`✅ ${savedCount} тохиргоо амжилттай хадгалагдлаа`);
          // originalSettings-г шинэчлэх - энэ нь hasChanges-г false болгоно
          const updatedSettings = { ...settings };
          setOriginalSettings(updatedSettings);
          setHasChanges(false);
          showMessage(`✅ ${savedCount} тохиргоо амжилттай хадгалагдлаа!`);
        } else {
          showMessage(`⚠️ ${savedCount} амжилттай, ${errorCount} алдаатай.`, 'warning');
          // Амжилттай хадгалагдсан key-үүдийг originalSettings-д нэмэх
          const updatedOriginal = { ...originalSettings };
          changedKeys.forEach(key => {
            if (settings[key] !== originalSettings[key]) {
              updatedOriginal[key] = settings[key];
            }
          });
          setOriginalSettings(updatedOriginal);
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

  const handleAddNewSetting = async () => {
    if (!newSetting.key.trim() || !newSetting.value.trim()) {
      showMessage('⚠️ Түлхүүр болон утга шаардлагатай.', 'warning');
      return;
    }

    if (settings[newSetting.key]) {
      showMessage('⚠️ Энэ түлхүүр аль хэдийн байна.', 'warning');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        // Шууд POST API дуудах
        const response = await fetch(`${BASE_URL}/api/user-settings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ setting_key: newSetting.key, setting_value: newSetting.value }),
        });

        if (response.ok) {
          // Амжилттай нэмэгдсэн бол local state шинэчлэх
          const newSettings = { ...settings, [newSetting.key]: newSetting.value };
          setSettings(newSettings);
          setOriginalSettings(newSettings);
          localStorage.setItem('userSettings', JSON.stringify(newSettings));
          setNewSetting({ key: "", value: "" });
          setShowNewInput(false);
          showMessage('✅ Шинэ тохиргоо амжилттай нэмэгдлээ.');
        } else {
          showMessage('⚠️ Тохиргоо нэмэхэд алдаа гарлаа.', 'error');
        }
      }
    } catch (error) {
      console.error('Тохиргоо нэмэх алдаа:', error);
      showMessage('❌ Сервертэй холбогдож чадсангүй.', 'error');
    }
  };

  const handleDeleteSetting = (key) => {
    const predefinedKeys = ['language', 'currency', 'dateFormat', 'theme', 'emailNotifications', 'autoSync', 'sessionTimeout'];
    if (predefinedKeys.includes(key)) {
      showMessage('⚠️ Үндсэн тохиргоог устгах боломжгүй.', 'warning');
      return;
    }
    
    // Баталгаажуулалт харуулах
    setDeleteKey(key);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirmed = async (confirmed) => {
    setShowDeleteConfirm(false);
    if (!confirmed || !deleteKey) {
      setDeleteKey(null);
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        // Шууд DELETE API дуудах
        const response = await fetch(`${BASE_URL}/api/user-settings/${deleteKey}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          // Амжилттай устгагдсан бол local state-г шинэчлэх
          const newSettings = { ...settings };
          delete newSettings[deleteKey];
          setSettings(newSettings);
          setOriginalSettings(newSettings);
          localStorage.setItem('userSettings', JSON.stringify(newSettings));
          showMessage('✅ Тохиргоо амжилттай устгагдлаа.');
        } else {
          showMessage('⚠️ Тохиргоо устгахад алдаа гарлаа.', 'error');
        }
      }
    } catch (error) {
      console.error('Тохиргоо устгах алдаа:', error);
      showMessage('❌ Сервертэй холбогдож чадсангүй.', 'error');
    } finally {
      setDeleteKey(null);
    }
  };

  const handleEditSetting = async (key, value) => {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        // Шууд POST API дуудах (single update)
        const response = await fetch(`${BASE_URL}/api/user-settings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ setting_key: key, setting_value: String(value) }),
        });

        if (response.ok) {
          // Амжилттай хадгалагдсан бол local state шинэчлэх
          const newSettings = { ...settings, [key]: value };
          setSettings(newSettings);
          setOriginalSettings(newSettings);
          localStorage.setItem('userSettings', JSON.stringify(newSettings));
          setEditKey(null);
          showMessage('✅ Тохиргоо амжилттай хадгалагдлаа.');
        } else {
          showMessage('⚠️ Тохиргоо хадгалахад алдаа гарлаа.', 'error');
        }
      }
    } catch (error) {
      console.error('Тохиргоо засах алдаа:', error);
      showMessage('❌ Сервертэй холбогдож чадсангүй.', 'error');
    }
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
      className={styles.container}
      style={{
        marginLeft: isSidebarOpen ? 180 : 50,
        transition: "margin-left 0.3s ease-in-out",
      }}
    >
      {/* Устгах баталгаажуулалт */}
      <ConfirmationDialog 
        isOpen={showDeleteConfirm} 
        onClose={handleDeleteConfirmed}
        message="Та энэ тохиргоог устгахдаа итгэлтэй байна уу?"
      />
      
      {/* Компани сонгох хэсэг */}
      <div className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.title}>Компани Сонголт</h2>
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
      <div className={styles.card}>
        <div className={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Settings24Regular />
            <h2 className={styles.title}>Системийн Ерөнхий Тохиргоо</h2>
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
          <div className={styles.newSettingRow}>
            <Input
              placeholder="Түлхүүр нэр (жишээ: polaris_nessession)"
              value={newSetting.key}
              onChange={(_, data) => setNewSetting({ ...newSetting, key: data.value })}
            />
            <Input
              placeholder="Утга"
              value={newSetting.value}
              onChange={(_, data) => setNewSetting({ ...newSetting, value: data.value })}
            />
            <Button 
              appearance="primary" 
              onClick={handleAddNewSetting}
            >
              Хадгалах
            </Button>
          </div>
        )}

        {/* Тохиргоо хүснэгт */}
        <div className={styles.tableContainer}>
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
                      <>
                        {key === 'language' ? (
                          <Dropdown
                            value={value === 'mn' ? 'Монгол' : 'English'}
                            onOptionSelect={(_, data) => {
                              setSettings({ ...settings, [key]: data.optionValue });
                            }}
                            style={{ width: "100%" }}
                          >
                            <Option value="mn">🇲🇳 Монгол</Option>
                            <Option value="en">🇬🇧 English</Option>
                          </Dropdown>
                        ) : key === 'currency' ? (
                          <Dropdown
                            value={value}
                            onOptionSelect={(_, data) => {
                              setSettings({ ...settings, [key]: data.optionValue });
                            }}
                            style={{ width: "100%" }}
                          >
                            <Option value="MNT">₮ MNT</Option>
                            <Option value="USD">$ USD</Option>
                            <Option value="EUR">€ EUR</Option>
                          </Dropdown>
                        ) : key === 'theme' ? (
                          <Dropdown
                            value={value === 'light' ? 'Гэрэл' : 'Харанхуй'}
                            onOptionSelect={(_, data) => {
                              setSettings({ ...settings, [key]: data.optionValue });
                            }}
                            style={{ width: "100%" }}
                          >
                            <Option value="light">☀️ Гэрэл</Option>
                            <Option value="dark">🌙 Харанхуй</Option>
                          </Dropdown>
                        ) : key === 'emailNotifications' || key === 'autoSync' ? (
                          <Dropdown
                            value={value ? 'Тийм' : 'Үгүй'}
                            onOptionSelect={(_, data) => {
                              setSettings({ ...settings, [key]: data.optionValue === 'true' });
                            }}
                            style={{ width: "100%" }}
                          >
                            <Option value="true">✅ Тийм</Option>
                            <Option value="false">❌ Үгүй</Option>
                          </Dropdown>
                        ) : (
                          <Input
                            value={typeof value === 'boolean' ? String(value) : String(value)}
                            onChange={(_, data) => {
                              const newValue = key === 'sessionTimeout' 
                                ? parseInt(data.value) || 30
                                : data.value;
                              setSettings({ ...settings, [key]: newValue });
                            }}
                            style={{ width: "100%" }}
                          />
                        )}
                      </>
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
        <div style={{ marginTop: "16px" }}>
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
