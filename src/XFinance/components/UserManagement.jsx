import React, { useState, useEffect, lazy, Suspense } from "react";
import {
  Button,
  Table,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  makeStyles,
  tokens,
  Card,
  Spinner,
  Badge,
  Switch,
} from "@fluentui/react-components";
import { Add24Regular, Edit24Regular, Delete24Regular, CheckmarkCircle24Regular, XCircle24Regular } from "@fluentui/react-icons";
import { useAppContext } from "./AppContext";
import { BASE_URL } from "../../config";
import { ACTION_CODES } from "../utils/actionCodes";

const UserForm = lazy(() => import(/* webpackChunkName: "admin-user-form" */ "./UserForm"));

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    padding: "0",
  },
  header: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: "16px",
  },
  card: {
    backgroundColor: "white",
    borderRadius: "0",
    boxShadow: "none",
    padding: "0",
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  tableContainer: {
    overflowX: "auto",
    width: "100%",
  },
  table: {
    width: "100%",
    marginBottom: "0",
    tableLayout: "auto",
    borderCollapse: "collapse",
    wordBreak: "break-word",
    "& td, & th": {
      padding: "8px 12px !important",
      textAlign: "left",
      borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
      wordBreak: "break-word",
      overflowWrap: "break-word",
    },
    "& thead th": {
      backgroundColor: tokens.colorNeutralBackground2,
      fontWeight: tokens.fontWeightSemibold,
      borderBottom: `2px solid ${tokens.colorNeutralStroke2}`,
      minWidth: "80px",
    },
    "& tbody tr:hover": {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
    "@media (max-width: 768px)": {
      fontSize: "12px",
      "& td, & th": {
        padding: "6px 8px !important",
      },
    },
  },
  colUsername: {
    minWidth: "120px",
    "@media (max-width: 768px)": {
      minWidth: "100px",
    },
  },
  colEmail: {
    minWidth: "180px",
    "@media (max-width: 768px)": {
      minWidth: "150px",
    },
  },
  colFullName: {
    minWidth: "150px",
    "@media (max-width: 768px)": {
      minWidth: "120px",
    },
  },
  colRole: {
    minWidth: "120px",
    "@media (max-width: 768px)": {
      minWidth: "100px",
    },
  },
  colActions: {
    minWidth: "100px",
    textAlign: "center",
    "@media (max-width: 768px)": {
      minWidth: "70px",
    },
  },
  actionCell: {
    display: "flex",
    gap: "8px",
    justifyContent: "center",
    alignItems: "center",
    "@media (max-width: 768px)": {
      gap: "4px",
      flexWrap: "wrap",
    },
  },
});

const UserManagement = () => {
  const styles = useStyles();
  const { showMessage, setLoading, hasAction } = useAppContext();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isFormOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userRolesMap, setUserRolesMap] = useState({});
  const [loading, setLoadingState] = useState(false);

  // Check if user has action to create users
  const canCreateUser = hasAction && hasAction(ACTION_CODES.CREATE_USER);
  const canEditUser = hasAction && hasAction(ACTION_CODES.EDIT_USER);
  const canDeleteUser = hasAction && hasAction(ACTION_CODES.DELETE_USER);

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${BASE_URL}/api/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Ажил үүргүүдийг татахад алдаа гарлаа");
      const data = await response.json();
      setRoles(data);
    } catch (error) {
      showMessage(`Алдаа: ${error.message}`, "error");
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${BASE_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Хэрэглэгчдийг татахад алдаа гарлаа");
      const userData = await response.json();
      
      // Map role names to users (main role for backward compatibility)
      const usersWithRoles = userData.map((user) => {
        const role = roles.find((r) => r.id === user.role_id);
        return { ...user, role_name: role?.name || "Тодорхойгүй" };
      });
      
      setUsers(usersWithRoles);
      
      // Fetch all roles for each user
      await fetchAllUserRoles(userData, token);
    } catch (error) {
      showMessage(`Алдаа: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUserRoles = async (userData, token) => {
    const rolesMap = {};
    for (const user of userData) {
      try {
        const response = await fetch(`${BASE_URL}/api/users/${user.id}/roles`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const userRoles = await response.json();
          rolesMap[user.id] = userRoles;
        }
      } catch (err) {
        console.error(`Error fetching roles for user ${user.id}:`, err);
      }
    }
    setUserRolesMap(rolesMap);
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    if (roles.length > 0) {
      fetchUsers();
    }
  }, [roles]);

  const handleAddUser = () => {
    setEditingUser(null);
    setFormOpen(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormOpen(true);
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Энэ хэрэглэгчийг устгахдаа итгэлтэй байна уу?")) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${BASE_URL}/api/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || "Хэрэглэгчийг устгахад алдаа гарлаа");
      }
      showMessage("Хэрэглэгч амжилттай устгагдлаа", "success");
      fetchUsers();
    } catch (error) {
      showMessage(`Алдаа: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSave = () => {
    setFormOpen(false);
    fetchUsers(); // Refresh the list after save
  };

  const handleFormClose = () => {
    setFormOpen(false);
  };

  const handleToggleActive = async (userId, isActive) => {
    setLoadingState(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${BASE_URL}/api/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !isActive }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || "Хэрэглэгчийн статусыг өөрчлөхөд алдаа гарлаа");
      }
      showMessage(`Хэрэглэгч ${!isActive ? "идэвхитэй" : "идэвхгүй"} боллоо`, "success");
      fetchUsers();
    } catch (error) {
      showMessage(`Алдаа: ${error.message}`, "error");
    } finally {
      setLoadingState(false);
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Button
          icon={<Add24Regular />}
          appearance="primary"
          onClick={handleAddUser}
          disabled={!canCreateUser}
          title={!canCreateUser ? "Та энэ үйлдлийг хийх эрхгүй байна" : ""}
        >
          Шинэ хэрэглэгч
        </Button>
      </div>

      <Card className={styles.card}>
        <div className={styles.tableContainer}>
          <Table aria-label="User list table" className={styles.table}>
            <TableHeader>
              <TableRow>
                <TableHeaderCell className={styles.colUsername}>Хэрэглэгчийн нэр</TableHeaderCell>
                <TableHeaderCell className={styles.colEmail}>И-мэйл</TableHeaderCell>
                <TableHeaderCell className={styles.colFullName}>Бүтэн нэр</TableHeaderCell>
                <TableHeaderCell className={styles.colRole}>Ажил үүрэг</TableHeaderCell>
                <TableHeaderCell style={{ minWidth: "80px" }}>Статус</TableHeaderCell>
                <TableHeaderCell className={styles.colActions}>Үйлдэл</TableHeaderCell>
              </TableRow>
            </TableHeader>
        <TableBody>
          {users.map((user) => {
            const userRoles = userRolesMap[user.id] || [];
            return (
              <TableRow key={user.id}>
                <TableCell className={styles.colUsername}>{user.username}</TableCell>
                <TableCell className={styles.colEmail}>{user.email}</TableCell>
                <TableCell className={styles.colFullName}>{user.full_name}</TableCell>
                <TableCell className={styles.colRole}>
                  {userRoles.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {userRoles.map((role) => (
                        <span
                          key={role.id}
                          style={{
                            display: "inline-block",
                            backgroundColor: "#e8f4f8",
                            color: "#0078d4",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: "600",
                            border: "1px solid #c8e4ee",
                          }}
                        >
                          {role.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: "#999" }}>Ажил үүрэг байхгүй</span>
                  )}
                </TableCell>
                <TableCell style={{ minWidth: "80px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Switch
                      checked={user.is_active}
                      onChange={() => handleToggleActive(user.id, user.is_active)}
                      disabled={loading}
                    />
                    <Badge appearance={user.is_active ? "success" : "warning"}>
                      {user.is_active ? "Идэвхитэй" : "Идэвхгүй"}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className={styles.colActions}>
                  <div className={styles.actionCell}>
                    <Button
                      icon={<Edit24Regular />}
                      aria-label="Засах"
                      onClick={() => handleEditUser(user)}
                      disabled={!canEditUser}
                      title={!canEditUser ? "Та энэ үйлдлийг хийх эрхгүй байна" : ""}
                    />
                    <Button
                      icon={<Delete24Regular />}
                      aria-label="Устгах"
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={!canDeleteUser}
                      title={!canDeleteUser ? "Та энэ үйлдлийг хийх эрхгүй байна" : ""}
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Suspense fallback={
        <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
          <Spinner size="large" label="Ачааллаж байна..." />
        </div>
      }>
        {isFormOpen && (
          <UserForm
            isOpen={isFormOpen}
            onClose={handleFormClose}
            onSave={handleFormSave}
            user={editingUser}
            availableRoles={roles}
          />
        )}
      </Suspense>
    </div>
  );
};

export default UserManagement;
