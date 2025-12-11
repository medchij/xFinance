import ConfirmationDialog from "./ConfirmationDialog";
import React, { useState, useEffect } from "react";
import {
  Button,
  Tooltip,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  makeStyles,
  TabList,
  Tab,
} from "@fluentui/react-components";
import {
  EditRegular,
  CheckmarkCircle24Regular,
  DismissCircle24Regular,
  AddRegular,
  ArrowClockwise16Regular,
} from "@fluentui/react-icons";
import { useAppContext } from "./AppContext";
import { ACTION_CODES } from "../utils/actionCodes";
import { withLoading, getUserSetting } from "../apiHelpers";
import { BASE_URL } from "../../config";

const useStyles = makeStyles({
  container: {
    padding: "0",
    minHeight: "100vh",
    boxSizing: "border-box",
  },
  tabList: {
    marginBottom: "16px",
    overflowX: "auto", // Make tabs scrollable on small screens
  },
  tableContainer: {
    overflowX: "auto",
    width: "100%",
  },
  table: {
    width: "100%",
    marginBottom: "16px",
    tableLayout: "fixed",
    "& td, & th": {
      padding: "4px 2px !important",
      whiteSpace: "nowrap",
    },
  },
  input: {
    minWidth: "100px",
  },
  actionCell: {
    display: "flex",
    gap: "0",
    justifyContent: "center",
  },
  newRow: {
    display: "flex",
    gap: "10px",
    marginTop: "16px",
    alignItems: "flex-end",
  },
});

const SettingsPage = ({ isSidebarOpen }) => {
  const styles = useStyles();
  const { selectedCompany, showMessage, setLoading, settings, fetchSettings, loading, hasAction } = useAppContext();
  
  const canEditSettings = hasAction && hasAction(ACTION_CODES.EDIT_SETTINGS);
    // Confirm dialog state for delete
  const [deleteId, setDeleteId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [newSetting, setNewSetting] = useState({ name: "", value: "" });
  const [showNewInput, setShowNewInput] = useState(false);
  const [sensitiveKeys, setSensitiveKeys] = useState([]);

  // Load sensitive keys from user settings (admin can manage `isSensitiveKey` user setting)
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const val = await getUserSetting("isSensitiveKey");
        const keys = val
          ? val.split(",").map((k) => k.trim()).filter(Boolean)
          : [];
        if (mounted) setSensitiveKeys(keys);
      } catch (err) {
        if (mounted) setSensitiveKeys([]);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      showMessage(`'${selectedCompany}' компанийн тохиргоог ачааллаж байна...`);
      fetchSettings(false);
    }
  }, [selectedCompany, fetchSettings]);

  useEffect(() => {
    if (settings.length > 0) {
      const uniqueTabs = [...new Set(settings.map((item) => item.tab))].sort((a, b) => {
        if (a === "Үндсэн тохиргоо") return -1;
        if (b === "Үндсэн тохиргоо") return 1;
        return a.localeCompare(b);
      });
      setTabs(uniqueTabs);
      if (!activeTab || !uniqueTabs.includes(activeTab)) {
        setActiveTab(uniqueTabs[0] || null);
      }
    } else {
      setTabs([]);
      setActiveTab(null);
    }
  }, [settings, activeTab]);
// Тохиргоо устгах баталгаажуулалттай функц
const handleDelete = (id) => {
  setDeleteId(id);
  setShowDeleteConfirm(true);
};

const handleDeleteConfirmed = async (confirmed) => {
  setShowDeleteConfirm(false);
  if (!confirmed || !deleteId) {
    setDeleteId(null);
    return;
  }
  await withLoading(setLoading, showMessage, async () => {
    const url = `${BASE_URL}/api/settings/${deleteId}?company_id=${selectedCompany}`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("authToken")}`,
        "Content-Type": "application/json"
      }
    });
    let result = {};
    if (response.headers.get("content-type")?.includes("application/json")) {
      result = await response.json();
    }
    if (!response.ok) throw new Error(result.message || "Тохиргоо устгахад алдаа гарлаа.");
    await fetchSettings(true);
    showMessage("✅ Тохиргоо амжилттай устгагдлаа.", "success");
  });
  setDeleteId(null);
};

  const handleRefresh = () => {
    showMessage("Тохиргоог дахин ачааллаж байна...");
    fetchSettings(true);
  };

  const handleEdit = (row) => {
    setEditId(row.id);
    setEditValue(sensitiveKeys.includes(row.name) ? "" : row.value);
  };

  const handleSave = async (id) => {
    await withLoading(setLoading, showMessage, async () => {
      const url = `${BASE_URL}/api/settings?id=${id}&company_id=${selectedCompany}`;
      const response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: editValue }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Серверийн алдаа");

      await fetchSettings(true);
      setEditId(null);
      showMessage("✅ Тохиргоо амжилттай хадгалагдлаа");
    });
  };

  const handleAdd = async () => {
    if (!newSetting.name.trim() || !newSetting.value.trim() || !activeTab) {
      showMessage("⚠️ Нэр, утга болон идэвхтэй таб шаардлагатай.", "warning");
      return;
    }

    await withLoading(setLoading, showMessage, async () => {
      const url = `${BASE_URL}/api/settings?company_id=${selectedCompany}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newSetting, tab: activeTab }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Шинэ тохиргоо нэмэхэд алдаа гарлаа.");

      await fetchSettings(true);
      setNewSetting({ name: "", value: "" });
      setShowNewInput(false);
      showMessage("✅ Шинэ тохиргоо амжилттай нэмэгдлээ.", "success");
    });
  };

  const filteredSettings = settings.filter((item) => item.tab === activeTab);

  return (
    <div
      className={styles.container}
      style={{
        marginLeft: isSidebarOpen ? 180 : 50,
        transition: "margin-left 0.3s ease-in-out",
      }}
    >
      <ConfirmationDialog isOpen={showDeleteConfirm} onClose={handleDeleteConfirmed} message="Та энэ тохиргоог устгахдаа итгэлтэй байна уу?" />
      {!selectedCompany ? (
        <h2>⚠️ Компани сонгогдоогүй байна. Профайл хуудаснаас сонгоно уу.</h2>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2>📋 {activeTab ? `${activeTab} тохиргоо` : "Тохиргоо"}</h2>
            <Button
              icon={<ArrowClockwise16Regular />}
              appearance="subtle"
              onClick={handleRefresh}
              aria-label="Сэргээх"
              disabled={loading}
            />
          </div>

          {tabs.length > 0 && (
            <TabList
              selectedValue={activeTab}
              onTabSelect={(_, data) => setActiveTab(data.value)}
              className={styles.tabList}
            >
              {tabs.map((tab) => (
                <Tab key={tab} value={tab}>
                  {tab}
                </Tab>
              ))}
            </TabList>
          )}
          <div className={styles.tableContainer}>
            <Table className={styles.table} style={{ width: "100%" }}>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell style={{ width: "120px", padding: "2px" }}>Нэр</TableHeaderCell>
                  <TableHeaderCell style={{ width: "150px", padding: "2px" }}>Утга</TableHeaderCell>
                  <TableHeaderCell style={{ width: "80px", textAlign: "center", padding: "2px" }}>Үйлдэл</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSettings.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>
                      {editId === row.id ? (
                        <Input
                          fluid
                          value={editValue}
                          placeholder={sensitiveKeys.includes(row.name) ? "Шинэ утга оруулна уу" : ""}
                          onChange={(e, data) => setEditValue(data.value)}
                        />
                      ) : (
                        <span
                          title={sensitiveKeys.includes(row.name) ? "********" : row.value}
                          style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: "100px",
                            display: "inline-block",
                          }}
                        >
                          {sensitiveKeys.includes(row.name) ? "********" : row.value}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className={styles.actionCell}>
                      {editId === row.id ? (
                        <>
                          <Tooltip content="Хадгалах" relationship="label">
                            <Button 
                              icon={<CheckmarkCircle24Regular />} 
                              onClick={() => handleSave(row.id)}
                              disabled={!canEditSettings}
                              title={!canEditSettings ? "Та энэ үйлдлийг хийх эрхгүй байна" : ""}
                            />
                          </Tooltip>
                          <Tooltip content="Болих" relationship="label">
                            <Button icon={<DismissCircle24Regular />} onClick={() => setEditId(null)} />
                          </Tooltip>
                        </>
                      ) : (
                        <>
                          <Tooltip content="Засах" relationship="label">
                            <Button 
                              icon={<EditRegular />} 
                              onClick={() => handleEdit(row)}
                              disabled={!canEditSettings}
                              title={!canEditSettings ? "Та энэ үйлдлийг хийх эрхгүй байна" : ""}
                            />
                          </Tooltip>
                          <Tooltip content="Устгах" relationship="label">
                            <Button 
                              icon={<DismissCircle24Regular />} 
                              onClick={() => handleDelete(row.id)} 
                              appearance="subtle"
                              disabled={!canEditSettings}
                              title={!canEditSettings ? "Та энэ үйлдлийг хийх эрхгүй байна" : ""}
                            />
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Button 
            appearance="primary" 
            icon={<AddRegular />} 
            onClick={() => setShowNewInput(!showNewInput)}
            disabled={!canEditSettings}
            title={!canEditSettings ? "Та энэ үйлдлийг хийх эрхгүй байна" : ""}
          >
            {showNewInput ? "Болих" : "Шинэ тохиргоо"}
          </Button>

          {showNewInput && (
            <div className={styles.newRow}>
              <Input
                placeholder="Нэр"
                value={newSetting.name}
                onChange={(e, data) => setNewSetting({ ...newSetting, name: data.value })}
                disabled={!canEditSettings}
              />
              <Input
                placeholder="Утга"
                value={newSetting.value}
                onChange={(e, data) => setNewSetting({ ...newSetting, value: data.value })}
                disabled={!canEditSettings}
              />
              <Button 
                appearance="primary" 
                onClick={handleAdd}
                disabled={!canEditSettings}
                title={!canEditSettings ? "Та энэ үйлдлийг хийх эрхгүй байна" : ""}
              >
                Хадгалах
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SettingsPage;
