import React, { useState, useEffect, useCallback } from "react";
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
  Spinner
} from "@fluentui/react-components";
import { EditRegular, SaveRegular, CheckmarkCircle24Regular, DismissCircle24Regular, AddRegular } from "@fluentui/react-icons";
import { useAppContext } from "./AppContext";
import { withLoading } from "../apiHelpers";
import { BASE_URL } from "../../config";

const useStyles = makeStyles({
    container: {
        padding: "20px",
        minHeight: "100vh",
      },
      tabList: {
        marginBottom: "16px",
      },
      table: {
        width: "100%",
        marginBottom: "16px",
      },
      input: {
        minWidth: "100px",
      },
      actionCell: {
        display: "flex",
        gap: "8px",
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
  // REFACTOR: Use selectedCompany instead of dataDir
  const { selectedCompany, showMessage, setLoading } = useAppContext();
  
  const [settings, setSettings] = useState([]);
  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [newSetting, setNewSetting] = useState({ name: "", value: "" });
  const [showNewInput, setShowNewInput] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  // REFACTOR: Fetch settings based on the selectedCompany
  const fetchSettings = useCallback(async () => {
    // Don't fetch if no company is selected
    if (!selectedCompany) {
      setSettings([]);
      setTabs([]);
      return;
    }
    
    setIsFetching(true);
    try {
      const response = await fetch(`${BASE_URL}/api/settings?company_id=${selectedCompany}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Тохиргоог серверээс татахад алдаа гарлаа.");
      }
      const data = await response.json();
      setSettings(data);
      
      const uniqueTabs = [...new Set(data.map((item) => item.tab))].sort();
      setTabs(uniqueTabs);

      // Set active tab to the first one if it's not already set or invalid
      if (!activeTab || !uniqueTabs.includes(activeTab)) {
         setActiveTab(uniqueTabs[0] || null);
      }
    } catch (error) {
      showMessage(`❌ Тохиргоо татах үед алдаа: ${error.message}`);
      setSettings([]);
      setTabs([]);
    } finally {
      setIsFetching(false);
    }
  }, [selectedCompany, showMessage, activeTab]);

  useEffect(() => {
    fetchSettings();
  }, [selectedCompany, fetchSettings]); // Re-fetch when company changes

  const handleEdit = (row) => {
    setEditId(row.id);
    setEditValue(row.value);
  };

  const handleSave = async (id) => {
    await withLoading(setLoading, showMessage, async () => {
      const url = `${BASE_URL}/api/settings/${id}?company_id=${selectedCompany}`;
      const response = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: editValue }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Серверийн алдаа");
      
      await fetchSettings(); // Re-fetch to show updated data
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

            if (!response.ok) {
                throw new Error(result.message || "Шинэ тохиргоо нэмэхэд алдаа гарлаа.");
            }
            
            await fetchSettings(); // Refresh the list
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
        marginLeft: isSidebarOpen ? 250 : 50,
        transition: "margin-left 0.3s ease-in-out",
      }}
    >
      {/* REFACTOR: Show a message if no company is selected */}
      {!selectedCompany ? (
        <h2>⚠️ Компани сонгогдоогүй байна. Профайл хуудаснаас сонгоно уу.</h2>
      ) : isFetching ? (
        <Spinner label={`'${selectedCompany}' компанийн тохиргоог ачааллаж байна...`} />
      ) : (
        <>
          <h2>📋 {activeTab ? `${activeTab} тохиргоо` : "Тохиргоо"}</h2>
          
          {tabs.length > 0 && (
              <TabList selectedValue={activeTab} onTabSelect={(_, data) => setActiveTab(data.value)} className={styles.tabList}>
                {tabs.map((tab) => <Tab key={tab} value={tab}>{tab}</Tab>)}
              </TabList>
          )}

          <Table className={styles.table}>
            <TableHeader>
              <TableRow>
                <TableHeaderCell style={{width: '20%'}}>Нэр</TableHeaderCell>
                <TableHeaderCell>Утга</TableHeaderCell>
                <TableHeaderCell style={{width: '15%', textAlign: 'center'}}>Үйлдэл</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSettings.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>
                    {editId === row.id ? (
                      <Input fluid value={editValue} onChange={(e, data) => setEditValue(data.value)} />
                    ) : (
                      <span title={row.value} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '400px', display: 'block' }}>
                          {row.value}
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
                        <Tooltip content="Засах" relationship="label">
                            <Button icon={<EditRegular />} onClick={() => handleEdit(row)} />
                        </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Button appearance="primary" icon={<AddRegular />} onClick={() => setShowNewInput(!showNewInput)}>
            {showNewInput ? "Болих" : "Шинэ тохиргоо"}
          </Button>

          {showNewInput && (
            <div className={styles.newRow}>
              <Input placeholder="Нэр" value={newSetting.name} onChange={(e, data) => setNewSetting({ ...newSetting, name: data.value })} />
              <Input placeholder="Утга" value={newSetting.value} onChange={(e, data) => setNewSetting({ ...newSetting, value: data.value })} />
              <Button appearance="primary" onClick={handleAdd}>Хадгалах</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SettingsPage;
