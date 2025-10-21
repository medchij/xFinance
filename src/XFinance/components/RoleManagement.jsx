import React, { useState } from "react";
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
} from "@fluentui/react-components";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap("20px"),
  },
  card: {
    ...shorthands.padding("16px"),
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap("10px"),
  },
  formContainer: {
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap("15px"),
  },
  inputGroup: {
    display: "flex",
    alignItems: "center",
    ...shorthands.gap("10px"),
  },
  permissionsContainer: {
    ...shorthands.border("1px", "solid", "#ccc"),
    ...shorthands.borderRadius("4px"),
    ...shorthands.padding("10px"),
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap("5px"),
    maxHeight: "200px",
    overflowY: "auto",
  },
  roleList: {
    marginTop: "20px",
  },
  roleItem: {
    ...shorthands.padding("10px"),
    ...shorthands.borderBottom("1px", "solid", "#eee"),
    display: "flex",
    justifyContent: "space-between",
  },
  permissionsList: {
    fontStyle: "italic",
    color: "#666",
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
  const [roles, setRoles] = useState([
    { id: 1, name: "Администратор", permissions: ["manage_users", "manage_roles", "view_dashboard"] },
    { id: 2, name: "Нягтлан", permissions: ["view_dashboard", "submit_transaction", "view_reports"] },
  ]);
  const [newRoleName, setNewRoleName] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState(new Set());

  const handlePermissionChange = (permId, isChecked) => {
    const newSelection = new Set(selectedPermissions);
    if (isChecked) {
      newSelection.add(permId);
    } else {
      newSelection.delete(permId);
    }
    setSelectedPermissions(newSelection);
  };

  const handleAddRole = () => {
    if (newRoleName.trim()) {
      const newRole = {
        id: roles.length + 1,
        name: newRoleName.trim(),
        permissions: Array.from(selectedPermissions),
      };
      setRoles([...roles, newRole]);
      setNewRoleName("");
      setSelectedPermissions(new Set());
    }
  };

  return (
    <div className={styles.root}>
      <Title3>Ажил үүргийн удирдлага</Title3>
      <Body1>Хэрэглэгчдэд оноох ажил үүргүүдийг үүсгэж, харгалзах эрхүүдийг сонгоно.</Body1>

      <Card className={styles.card}>
        <div className={styles.formContainer}>
          <Label>Шинэ ажил үүрэг үүсгэх</Label>
          <div className={styles.inputGroup}>
            <Input
              placeholder="Ажил үүргийн нэр"
              value={newRoleName}
              onChange={(_, data) => setNewRoleName(data.value)}
            />
            <Button appearance="primary" onClick={handleAddRole} disabled={!newRoleName.trim()}>
              Нэмэх
            </Button>
          </div>
          <Label>Эрхүүд</Label>
          <div className={styles.permissionsContainer}>
            {availablePermissions.map((perm) => (
              <Checkbox
                key={perm.id}
                label={perm.name}
                checked={selectedPermissions.has(perm.id)}
                onChange={(_, data) => handlePermissionChange(perm.id, data.checked)}
              />
            ))}
          </div>
        </div>
      </Card>

      <div className={styles.roleList}>
        <Title3 as="h3">Одоо байгаа ажил үүргүүд</Title3>
        <Card>
          {roles.map((role) => (
            <div key={role.id} className={styles.roleItem}>
              <Body1>
                <strong>{role.name}</strong>
              </Body1>
              <span className={styles.permissionsList}>{role.permissions.join(", ")}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};

export default RoleManagement;
