import React, { useState, useEffect } from "react";
import {
  makeStyles,
  shorthands,
  Button,
  Input,
  Title3,
  Body1,
  Card,
  CardHeader,
  Checkbox,
  Label,
  Spinner,
} from "@fluentui/react-components";
import { DeleteRegular, EditRegular } from "@fluentui/react-icons";
import { BASE_URL } from "../../config";
import { useAppContext } from "./AppContext";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap("24px"),
  },
  card: {
    ...shorthands.padding("24px"),
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap("16px"),
    backgroundColor: "#ffffff",
    border: "1px solid #d1d1d1",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
  },
  formContainer: {
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap("16px"),
  },
  inputGroup: {
    display: "flex",
    alignItems: "center",
    ...shorthands.gap("12px"),
    flexWrap: "wrap",
    rowGap: "12px",
  },
  actionsContainer: {
    border: `1px solid #d1d1d1`,
    borderRadius: "8px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    maxHeight: "500px",
    overflowY: "auto",
    backgroundColor: "#f5f5f5",
  },
  actionItem: {
    display: "grid",
    gridTemplateColumns: "40px auto 1fr",
    alignItems: "start",
    gap: "12px",
    padding: "12px",
    backgroundColor: "#ffffff",
    borderRadius: "6px",
    border: "1px solid #e8e8e8",
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: "#fafafa",
      borderColor: "#0078d4",
      boxShadow: "0 2px 4px rgba(0, 120, 212, 0.1)",
    },
  },
  actionCode: {
    fontWeight: "700",
    color: "#0078d4",
    fontSize: "13px",
    padding: "4px 0",
  },
  actionName: {
    fontWeight: "600",
    fontSize: "14px",
    lineHeight: "1.5",
    color: "#323130",
  },
  actionDesc: {
    fontSize: "12px",
    color: "#605e5c",
    lineHeight: "1.4",
    marginTop: "2px",
  },
  roleList: {
    marginTop: "0px",
  },
  roleItem: {
    padding: "16px",
    borderBottom: "1px solid #f0f0f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    transition: "background-color 0.2s ease",
    "&:hover": {
      backgroundColor: "#fafafa",
    },
    "&:last-child": {
      borderBottom: "none",
    },
  },
  roleActions: {
    display: "flex",
    gap: "8px",
    flexShrink: 0,
  },
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "60px 20px",
  },
  categoryGroup: {
    marginBottom: "0px",
    paddingBottom: "0px",
    borderBottom: "none",
  },
  categoryLabel: {
    fontWeight: "700",
    marginBottom: "12px",
    color: "#0078d4",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
});

// In a real app, this would be fetched from the permissions data source
const availablePermissions = [
  { id: "view_dashboard", name: "Хяналтын самбарыг харах" },
  { id: "manage_users", name: "Хэрэглэгч удирдах" },
  { id: "manage_roles", name: "Ажил үүрэг удирдах" },
  { id: "manage_permissions", name: "Эрх удирдах" },
  { id: "submit_transaction", name: "Гүйлгээ хийх" },
  { id: "approve_transaction", name: "Гүйлгээ батлах" },
  { id: "view_reports", name: "Тайлан харах" },
];

const RoleManagement = () => {
  const styles = useStyles();
  const { showMessage, logout, isLoggedIn } = useAppContext();

  const [roles, setRoles] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newRoleName, setNewRoleName] = useState("");
  const [selectedActions, setSelectedActions] = useState(new Set());
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [editingActions, setEditingActions] = useState(new Set());
  const [roleActionsMap, setRoleActionsMap] = useState({});

  // Fetch roles and actions on mount
  useEffect(() => {
    if (isLoggedIn) {
      fetchRolesAndActions();
    } else {
      console.log("⚠️ User not logged in yet, skipping fetch");
      setLoading(false);
    }
  }, [isLoggedIn]);

  const fetchRolesAndActions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      
      console.log("🔍 Token check:", { token, hasToken: !!token });

      if (!token) {
        showMessage("⚠️ Нэвтрэх эрх байхгүй. Дахин нэвтрэнэ үү.", "error");
        logout();
        return;
      }

      // Fetch actions
      const actionsRes = await fetch(`${BASE_URL}/api/actions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (actionsRes.status === 401) {
        showMessage("Нэвтрэх эрх дууссан байна", "error");
        logout();
        return;
      }

      if (!actionsRes.ok) throw new Error("Үйлдлүүдийг татахад алдаа гарлаа");
      const actionsData = await actionsRes.json();
      setActions(actionsData);

      // Fetch roles
      const rolesRes = await fetch(`${BASE_URL}/api/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!rolesRes.ok) throw new Error("Ажил үүргүүдийг татахад алдаа гарлаа");
      const rolesData = await rolesRes.json();
      setRoles(rolesData);

      // Fetch actions for each role
      const roleActionsMapTemp = {};
      for (const role of rolesData) {
        try {
          const roleActionsRes = await fetch(`${BASE_URL}/api/roles/${role.id}/actions`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (roleActionsRes.ok) {
            const roleActionsData = await roleActionsRes.json();
            roleActionsMapTemp[role.id] = roleActionsData;
          }
        } catch (err) {
          console.error(`Error fetching actions for role ${role.id}:`, err);
        }
      }
      setRoleActionsMap(roleActionsMapTemp);
    } catch (error) {
      console.error("Error:", error);
      showMessage(error.message || "Мэдээлэл татахад алдаа гарлаа", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleActionChange = (code, isChecked) => {
    const newSelection = new Set(selectedActions);
    if (isChecked) {
      newSelection.add(code);
    } else {
      newSelection.delete(code);
    }
    setSelectedActions(newSelection);
  };

  const handleAddRole = async () => {
    if (!newRoleName.trim() || selectedActions.size === 0) {
      showMessage("Ажил үүргийн нэр болон үйлдлүүдийг сонгоно уу", "warning");
      return;
    }

    try {

      const token = localStorage.getItem("authToken");

      // Create role
      const response = await fetch(`${BASE_URL}/api/roles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newRoleName.trim() }),
      });

      if (!response.ok) throw new Error("Ажил үүрэг үүсгэхэд алдаа гарлаа");
      const newRole = await response.json();

      // Assign actions to role
      await fetch(`${BASE_URL}/api/actions/role/${newRole.id}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ actionCodes: Array.from(selectedActions) }),
      });

      showMessage("Ажил үүрэг амжилттай үүсгэгдлээ", "success");
      setNewRoleName("");
      setSelectedActions(new Set());
      fetchRolesAndActions();
    } catch (error) {
      console.error("Error:", error);
      showMessage(error.message || "Ажил үүрэг үүсгэхэд алдаа гарлаа", "error");
    }
  };

  const handleEditRole = async (role) => {
    try {
      const token = localStorage.getItem("authToken");
      
      // Fetch role's current actions
      const response = await fetch(`${BASE_URL}/api/roles/${role.id}/actions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Ажил үүргийн үйлдлүүдийг татахад алдаа гарлаа");
      
      const roleActions = await response.json();
      const actionCodes = new Set(roleActions.map(a => a.code));

      setEditingRoleId(role.id);
      setEditingName(role.name);
      setEditingActions(actionCodes);
    } catch (error) {
      console.error("Error:", error);
      showMessage(error.message || "Засахад алдаа гарлаа", "error");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingName.trim() || editingActions.size === 0) {
      showMessage("Ажил үүргийн нэр болон үйлдлүүдийг сонгоно уу", "warning");
      return;
    }

    try {
      const token = localStorage.getItem("authToken");

      // Update role name
      await fetch(`${BASE_URL}/api/roles/${editingRoleId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: editingName.trim() }),
      });

      // Update role actions
      await fetch(`${BASE_URL}/api/actions/role/${editingRoleId}/assign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ actionCodes: Array.from(editingActions) }),
      });

      showMessage("Ажил үүрэг амжилттай засагдлаа", "success");
      setEditingRoleId(null);
      setEditingName("");
      setEditingActions(new Set());
      fetchRolesAndActions();
    } catch (error) {
      console.error("Error:", error);
      showMessage(error.message || "Засахад алдаа гарлаа", "error");
    }
  };

  const handleCancelEdit = () => {
    setEditingRoleId(null);
    setEditingName("");
    setEditingActions(new Set());
  };

  const handleEditActionChange = (code, isChecked) => {
    const newSelection = new Set(editingActions);
    if (isChecked) {
      newSelection.add(code);
    } else {
      newSelection.delete(code);
    }
    setEditingActions(newSelection);
  };

  const handleDeleteRole = async (roleId) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${BASE_URL}/api/roles/${roleId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Ажил үүрэг устгахад алдаа гарлаа");
      showMessage("Ажил үүрэг амжилттай устгагдлаа", "success");
      fetchRolesAndActions();
    } catch (error) {
      console.error("Error:", error);
      showMessage(error.message || "Ажил үүрэг устгахдаа алдаа гарлаа", "error");
    }
  };

  // Group actions by category
  const groupedActions = actions.reduce((acc, action) => {
    if (!acc[action.category]) acc[action.category] = [];
    acc[action.category].push(action);
    return acc;
  }, {});

  if (!isLoggedIn) {
    return (
      <div className={styles.root}>
        <div className={styles.loadingContainer}>
          <Spinner label="Нэвтрэх шаардлагатай..." />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.root}>
        <div className={styles.loadingContainer}>
          <Spinner label="Ачааллаж байна..." />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {/* Одоо байгаа ажил үүргүүдийн жагсаалт */}
      <div className={styles.roleList}>
        <Card className={styles.card}>
          <div>
            <Title3 style={{ marginBottom: "16px", color: "#323130" }}>Одоо байгаа ажил үүргүүд</Title3>
            {roles.length === 0 ? (
              <div style={{ padding: "20px", color: "#605e5c", textAlign: "center" }}>
                Ажил үүрэг байхгүй байна
              </div>
            ) : (
              roles.map((role) => {
                const roleActions = roleActionsMap[role.id] || [];
                return (
                  <div key={role.id} className={styles.roleItem}>
                    <div style={{ flex: 1 }}>
                      <Body1 style={{ fontWeight: "600", color: "#323130", marginBottom: "4px" }}>
                        {role.name}
                      </Body1>
                      <span style={{ fontSize: "12px", color: "#8a8886", display: "block", marginBottom: "8px" }}>
                        ID: {role.id}
                      </span>
                      {roleActions.length > 0 && (
                        <div style={{ marginTop: "8px" }}>
                          <div style={{ fontSize: "11px", fontWeight: "600", color: "#605e5c", marginBottom: "8px", textTransform: "uppercase" }}>
                            Эрхүүд ({roleActions.length}):
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {roleActions.map((action) => (
                              <span
                                key={action.code}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  backgroundColor: "#e8f4f8",
                                  color: "#0078d4",
                                  padding: "6px 10px",
                                  borderRadius: "4px",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  border: "1px solid #c8e4ee",
                                  cursor: "default",
                                  transition: "all 0.2s ease",
                                }}
                                title={action.name}
                              >
                                {action.code}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className={styles.roleActions}>
                      <Button
                        icon={<EditRegular />}
                        appearance="subtle"
                        onClick={() => handleEditRole(role)}
                        title="Засах"
                      />
                      <Button
                        icon={<DeleteRegular />}
                        appearance="subtle"
                        onClick={() => handleDeleteRole(role.id)}
                        title="Устгах"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* Шинэ ажил үүрэг үүсгэх эсвэл засах форм */}
      {editingRoleId ? (
        <Card className={styles.card}>
          <div>
            <Title3 style={{ marginBottom: "20px", color: "#323130" }}>Ажил үүрэг засах</Title3>
          </div>
          <div className={styles.formContainer}>
            <div className={styles.inputGroup}>
              <Input
                placeholder="Ажил үүргийн нэр"
                value={editingName}
                onChange={(_, data) => setEditingName(data.value)}
                style={{ flex: 1, minWidth: "200px" }}
              />
              <Button
                appearance="primary"
                onClick={handleSaveEdit}
                disabled={!editingName.trim() || editingActions.size === 0}
              >
                Хадгалах
              </Button>
              <Button appearance="subtle" onClick={handleCancelEdit}>
                Цуцлах
              </Button>
            </div>

            <div>
              <Label style={{ display: "block", marginBottom: "12px", fontWeight: "600" }}>
                Үйлдлүүд (дугаар + нэр)
              </Label>
              <div className={styles.actionsContainer}>
                {Object.entries(groupedActions).map(([category, categoryActions]) => (
                  <div key={category} className={styles.categoryGroup}>
                    <div className={styles.categoryLabel}>{category}</div>
                    {categoryActions.map((action) => (
                      <div key={action.code} className={styles.actionItem}>
                        <Checkbox
                          checked={editingActions.has(action.code)}
                          onChange={(_, data) => handleEditActionChange(action.code, data.checked)}
                        />
                        <div className={styles.actionCode}>{action.code}</div>
                        <div>
                          <div className={styles.actionName}>{action.name}</div>
                          <div className={styles.actionDesc}>{action.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className={styles.card}>
          <div>
            <Title3 style={{ marginBottom: "20px", color: "#323130" }}>Шинэ ажил үүрэг үүсгэх</Title3>
          </div>
          <div className={styles.formContainer}>
            <div className={styles.inputGroup}>
              <Input
                placeholder="Ажил үүргийн нэр"
                value={newRoleName}
                onChange={(_, data) => setNewRoleName(data.value)}
                style={{ flex: 1, minWidth: "200px" }}
              />
              <Button
                appearance="primary"
                onClick={handleAddRole}
                disabled={!newRoleName.trim() || selectedActions.size === 0}
              >
                Нэмэх
              </Button>
            </div>

            <div>
              <Label style={{ display: "block", marginBottom: "12px", fontWeight: "600" }}>
                Үйлдлүүд (дугаар + нэр)
              </Label>
              <div className={styles.actionsContainer}>
                {Object.entries(groupedActions).map(([category, categoryActions]) => (
                  <div key={category} className={styles.categoryGroup}>
                    <div className={styles.categoryLabel}>{category}</div>
                    {categoryActions.map((action) => (
                      <div key={action.code} className={styles.actionItem}>
                        <Checkbox
                          checked={selectedActions.has(action.code)}
                          onChange={(_, data) => handleActionChange(action.code, data.checked)}
                        />
                        <div className={styles.actionCode}>{action.code}</div>
                        <div>
                          <div className={styles.actionName}>{action.name}</div>
                          <div className={styles.actionDesc}>{action.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default RoleManagement;
