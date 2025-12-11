import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogContent,
  DialogBody,
  DialogActions,
  Button,
  Input,
  Label,
  makeStyles,
  Select,
  Checkbox,
} from "@fluentui/react-components";
import { useAppContext } from "./AppContext";
import { BASE_URL } from "../../config";

const useStyles = makeStyles({
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
    width: "400px",
  },
  rolesContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    padding: "12px",
    border: "1px solid #d1d1d1",
    borderRadius: "4px",
    backgroundColor: "#f5f5f5",
    maxHeight: "200px",
    overflowY: "auto",
  },
  roleItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "6px",
  },
});

const UserForm = ({ isOpen, onClose, onSave, user, availableRoles }) => {
  const styles = useStyles();
  const { showMessage, setLoading } = useAppContext();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState(""); // Keep for backward compatibility
  const [selectedRoleIds, setSelectedRoleIds] = useState(new Set());
  const [showRoleSelector, setShowRoleSelector] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
      setFullName(user.full_name || "");
      setRoleId(user.role_id || "");
      setPassword(""); // Do not pre-fill password
      // Fetch user roles
      fetchUserRoles(user.id);
    } else {
      // Reset form for new user
      setUsername("");
      setEmail("");
      setFullName("");
      setPassword("");
      setRoleId("");
      setSelectedRoleIds(new Set());
    }
  }, [user, isOpen]);

  const fetchUserRoles = async (userId) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${BASE_URL}/api/users/${userId}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const roles = await response.json();
        const roleIds = new Set(roles.map((r) => r.id.toString()));
        setSelectedRoleIds(roleIds);
      }
    } catch (err) {
      console.error("Error fetching user roles:", err);
    }
  };

  const handleRoleToggle = (roleId) => {
    const newSelection = new Set(selectedRoleIds);
    const roleIdStr = roleId.toString();
    
    if (newSelection.has(roleIdStr)) {
      newSelection.delete(roleIdStr);
    } else {
      newSelection.add(roleIdStr);
    }
    
    setSelectedRoleIds(newSelection);
  };

  const handleSave = async () => {
    if (!username || !email || (!user && !password)) {
      showMessage("Бүх шаардлагатай талбарыг бөглөнө үү", "warning");
      return;
    }

    if (selectedRoleIds.size === 0) {
      showMessage("Дор хаяж нэг ажил үүрэг сонгоно уу", "warning");
      return;
    }

    setLoading(true);
    try {
      const isEditing = !!user;
      const token = localStorage.getItem("authToken");
      const url = isEditing ? `${BASE_URL}/api/users/${user.id}` : `${BASE_URL}/api/users`;
      const method = isEditing ? "PUT" : "POST";

      const body = {
        username,
        email,
        full_name: fullName,
        role_id: selectedRoleIds.size > 0 ? parseInt(Array.from(selectedRoleIds)[0]) : null,
      };
      if (password || !isEditing) {
        body.password = password;
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          responseData.msg || (isEditing ? "Хэрэглэгчийг засахад алдаа гарлаа" : "Хэрэглэгч нэмэхэд алдаа гарлаа")
        );
      }

      // Assign roles to user
      const roleIds = Array.from(selectedRoleIds).map((id) => parseInt(id));
      const roleAssignUrl = isEditing 
        ? `${BASE_URL}/api/users/${user.id}/roles`
        : `${BASE_URL}/api/users/${responseData.id}/roles`;

      await fetch(roleAssignUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ roleIds }),
      });

      showMessage(isEditing ? "Хэрэглэгч амжилттай засагдлаа" : "Хэрэглэгч амжилттай нэмэгдлээ", "success");
      onSave();
    } catch (error) {
      showMessage(`Алдаа: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{user ? "Хэрэглэгч засах" : "Шинэ хэрэглэгч нэмэх"}</DialogTitle>
          <DialogContent className={styles.form}>
            <Label htmlFor="username-input">Хэрэглэгчийн нэр</Label>
            <Input id="username-input" value={username} onChange={(_, data) => setUsername(data.value)} required />

            <Label htmlFor="email-input">И-мэйл</Label>
            <Input id="email-input" type="email" value={email} onChange={(_, data) => setEmail(data.value)} required />

            <Label htmlFor="fullname-input">Бүтэн нэр</Label>
            <Input id="fullname-input" value={fullName} onChange={(_, data) => setFullName(data.value)} />

            <Label htmlFor="password-input">Нууц үг {user ? "(солихгүй бол хоосон орхино уу)" : ""}</Label>
            <Input
              id="password-input"
              type="password"
              value={password}
              onChange={(_, data) => setPassword(data.value)}
              required={!user}
            />

            <Label>Ажил үүргүүд (хамгийн багадаа нэг сонгоно уу)</Label>
            <Button
              appearance="outline"
              onClick={() => setShowRoleSelector(!showRoleSelector)}
            >
              {selectedRoleIds.size > 0 
                ? `${selectedRoleIds.size} ажил үүрэг сонгогдсон`
                : "Ажил үүргүүдийг сонгоно уу"}
            </Button>

            {showRoleSelector && (
              <div className={styles.rolesContainer}>
                {(availableRoles || []).map((role) => (
                  <div key={role.id} className={styles.roleItem}>
                    <Checkbox
                      checked={selectedRoleIds.has(role.id.toString())}
                      onChange={() => handleRoleToggle(role.id)}
                      label={role.name}
                    />
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose}>
              Цуцлах
            </Button>
            <Button appearance="primary" onClick={handleSave}>
              Хадгалах
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

export default UserForm;
