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
  SaveRegular,
  CheckmarkCircle24Regular,
  DismissCircle24Regular,
  AddRegular,
  ArrowClockwise16Regular,
} from "@fluentui/react-icons";
import { useAppContext } from "./AppContext";
import { withLoading } from "../apiHelpers";
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
    minWidth: "600px", // Ensure table has a minimum width
    marginBottom: "16px",
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

// Check for sensitive keys to mask them
const isSensitiveKey = (key) =>
  ["khanbank_password", "access_token", "device_token", "refresh_token", "car_token"].includes(key);

const SettingsPage = ({ isSidebarOpen }) => {
  const styles = useStyles();
  const { selectedCompany, showMessage, setLoading, settings, fetchSettings, loading } = useAppContext();
    // Confirm dialog state for delete
  const [deleteId, setDeleteId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [newSetting, setNewSetting] = useState({ name: "", value: "" });
  const [showNewInput, setShowNewInput] = useState(false);

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
  {/* Confirm dialog for delete */}
  <ConfirmationDialog isOpen={showDeleteConfirm} onClose={handleDeleteConfirmed} />
  const handleRefresh = () => {
    showMessage("Тохиргоог дахин ачааллаж байна...");
    fetchSettings(true);
  };

  const handleEdit = (row) => {
    setEditId(row.id);
    setEditValue(isSensitiveKey(row.name) ? "" : row.value);
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
      <ConfirmationDialog isOpen={showDeleteConfirm} onClose={handleDeleteConfirmed} />
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
            <Table className={styles.table}>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell style={{ width: "20%" }}>Нэр</TableHeaderCell>
                  <TableHeaderCell>Утга</TableHeaderCell>
                  <TableHeaderCell style={{ width: "15%", textAlign: "center" }}>Үйлдэл</TableHeaderCell>
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
                          placeholder={isSensitiveKey(row.name) ? "Шинэ утга оруулна уу" : ""}
                          onChange={(e, data) => setEditValue(data.value)}
                        />
                      ) : (
                        <span
                          title={isSensitiveKey(row.name) ? "********" : row.value}
                          style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: "400px",
                            display: "block",
                          }}
                        >
                          {isSensitiveKey(row.name) ? "********" : row.value}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className={styles.actionCell}>
                      {editId === row.id ? (
                        <>
                          <Tooltip content="Хадгалах" relationship="label">
                            <Button icon={<CheckmarkCircle24Regular />} onClick={() => handleSave(row.id)} />
                          </Tooltip>
                          <Tooltip content="Болих" relationship="label">
                            <Button icon={<DismissCircle24Regular />} onClick={() => setEditId(null)} />
                          </Tooltip>
                        </>
                      ) : (
                        <>
                          <Tooltip content="Засах" relationship="label">
                            <Button icon={<EditRegular />} onClick={() => handleEdit(row)} />
                          </Tooltip>
                          <Tooltip content="Устгах" relationship="label">
                            <Button icon={<DismissCircle24Regular />} onClick={() => handleDelete(row.id)} appearance="subtle" />
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Button appearance="primary" icon={<AddRegular />} onClick={() => setShowNewInput(!showNewInput)}>
            {showNewInput ? "Болих" : "Шинэ тохиргоо"}
          </Button>

          {showNewInput && (
            <div className={styles.newRow}>
              <Input
                placeholder="Нэр"
                value={newSetting.name}
                onChange={(e, data) => setNewSetting({ ...newSetting, name: data.value })}
              />
              <Input
                placeholder="Утга"
                value={newSetting.value}
                onChange={(e, data) => setNewSetting({ ...newSetting, value: data.value })}
              />
              <Button appearance="primary" onClick={handleAdd}>
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
