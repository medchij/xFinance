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
  tokens,
  TabList,
  Tab,
} from "@fluentui/react-components";
import { EditRegular, SaveRegular, CheckmarkCircle24Regular, DismissCircle24Regular } from "@fluentui/react-icons";
import { useAppContext } from "./AppContext";
import { withLoading } from "../apiHelpers";
import { BASE_URL, fetchWithTimeout } from "../../config";
const useStyles = makeStyles({
  container: {
    flexGrow: 1,
    padding: "20px",
    backgroundColor: tokens.colorNeutralBackground1,
    minHeight: "100vh",
  },
  tabList: {
    marginBottom: "16px",
  },
  table: {
    width: "100%",
    marginBottom: "16px",
    tableLayout: "auto",
    overflowX: "auto",
  },
  input: {
    minWidth: "50px",
    maxWidth: "150px",
  },
  valueCell: {
    wordBreak: "break-word",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "300px",
  },
  newRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "10px",
    alignItems: "flex-end",
  },
  actionCell: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "6px",
  },
  actionButton: {
    padding: "6px",
    borderRadius: "6px",
    backgroundColor: tokens.colorBrandBackground,
    color: "white",
    border: "none",
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
  },
  actionButtonHover: {
    backgroundColor: tokens.colorBrandBackgroundHover,
  },
});

const SettingsPage = ({ isSidebarOpen }) => {
  const styles = useStyles();
  const [settings, setSettings] = useState([]);
  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState("");
  const [editId, setEditId] = useState(null);
  const [editRow, setEditRow] = useState({ name: "", value: "" });
  const [newSetting, setNewSetting] = useState({ name: "", value: "" });
  const [showNewInput, setShowNewInput] = useState(false);
  const { showMessage, setLoading } = useAppContext();

  useEffect(() => {
    fetchWithTimeout(`${BASE_URL}/api/settings`)
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        const uniqueTabs = [...new Set(data.map((item) => item.tab))];
        setTabs(uniqueTabs);
        setActiveTab(uniqueTabs[0] || "");
      })
      .catch((err) => console.error("⚠️ settings.json API уншихад алдаа гарлаа", err));
  }, []);

  const filteredSettings = settings.filter((item) => item.tab === activeTab);

  const handleEdit = (row) => {
    setEditId(row.id);
    setEditRow({ name: row.name, value: row.value });
  };

  const handleSave = async (id) => {
    return withLoading(setLoading, showMessage, async () => {
      const updated = settings.map((item) =>
        item.id === id ? { ...item, value: editRow.value, update_date: new Date().toISOString() } : item
      );
      setSettings(updated);

      const response = await  fetchWithTimeout(`${BASE_URL}/api/settings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: editRow.value }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Серверийн алдаа");

      setEditId(null);
      showMessage("✅ Тохиргоо амжилттай хадгалагдлаа");
    });
  };

  const handleAdd = async () => {
    if (!newSetting.name.trim() || !newSetting.value.trim()) {
      showMessage("⚠️ Нэр болон утга шаардлагатай");
      return;
    }

    return withLoading(setLoading, showMessage, async () => {
      const response = await fetchWithTimeout(`${BASE_URL}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newSetting, tab: activeTab }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Серверийн алдаа");

      setSettings((prev) => [...prev, result.data]);
      setNewSetting({ name: "", value: "" });
      setShowNewInput(false);
      showMessage("✅ Шинэ тохиргоо нэмэгдлээ");
    });
  };

  const isSensitiveKey = (key) =>
    ["khanbank_password", "access_token", "device_token", "refresh_token", "car_token"].includes(key);

  return (
    <div
      className={styles.container}
      style={{
        marginLeft: isSidebarOpen ? 250 : 50,
        transition: "margin-left 0.3s ease-in-out",
      }}
    >
      <h2>📋 {activeTab}</h2>

      <TabList selectedValue={activeTab} onTabSelect={(_, data) => setActiveTab(data.value)} className={styles.tabList}>
        {tabs.map((tab) => (
          <Tab key={tab} value={tab}>
            {tab}
          </Tab>
        ))}
      </TabList>

      <Table className={styles.table}>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Нэр</TableHeaderCell>
            <TableHeaderCell>Утга</TableHeaderCell>
            <TableHeaderCell>Үйлдэл</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredSettings.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                {editId === row.id ? (
                  <Input
                    size="small"
                    value={editRow.name}
                    readOnly
                    className={styles.input}
                    style={{ backgroundColor: "#f9f9f9", color: "#666" }}
                  />
                ) : (
                  row.name
                )}
              </TableCell>
              <TableCell className={styles.valueCell}>
                {editId === row.id ? (
                  <Input
                    size="small"
                    value={editRow.value}
                    onChange={(e, data) => setEditRow({ ...editRow, value: data.value })}
                    className={styles.input}
                  />
                ) : isSensitiveKey(row.name) ? (
                  <span title="Hidden">••••••••</span>
                ) : (
                  <span title={row.value}>
                    {row.value.length > 35 ? row.value.slice(0, 35) + "…" : row.value}
                  </span>
                )}
              </TableCell>
              <TableCell className={styles.actionCell}>
                {editId === row.id ? (
                  <>
                    <Tooltip content="Хадгалах">
                      <Button
                        appearance="subtle"
                        size="small"
                        icon={<CheckmarkCircle24Regular />}
                        onClick={() => handleSave(row.id)}
                      />
                    </Tooltip>
                    <Tooltip content="Болих">
                      <Button
                        appearance="subtle"
                        size="small"
                        icon={<DismissCircle24Regular />}
                        onClick={() => setEditId(null)}
                      />
                    </Tooltip>
                  </>
                ) : (
                  <Tooltip content="Засах">
                    <Button
                      appearance="subtle"
                      size="small"
                      icon={<EditRegular />}
                      onClick={() => handleEdit(row)}
                      className={styles.actionButton}
                    />
                  </Tooltip>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Button appearance="secondary" onClick={() => setShowNewInput(!showNewInput)}>
        {showNewInput ? "❌ Болих" : "➕ Шинэ тохиргоо"}
      </Button>

      {showNewInput && (
        <div className={styles.newRow}>
          <Input
            placeholder="Нэр"
            value={newSetting.name}
            onChange={(e, data) => setNewSetting({ ...newSetting, name: data.value })}
            className={styles.input}
          />
          <Input
            placeholder="Утга"
            value={newSetting.value}
            onChange={(e, data) => setNewSetting({ ...newSetting, value: data.value })}
            className={styles.input}
          />
          <Button appearance="primary" onClick={handleAdd}>
            Хадгалах
          </Button>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
