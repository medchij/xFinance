import React, { useState, useEffect, useCallback } from "react";
import {
    Button,
    Dropdown,
    Option,
    Checkbox,
    Label,
    makeStyles,
    typography,
    Spinner,
} from "@fluentui/react-components";
import { useAppContext } from "./AppContext";
import { BASE_URL } from "../../config";

const useStyles = makeStyles({
    root: {
        display: "flex",
        flexDirection: "column",
        gap: "20px",
    },
    title: {
        ...typography.title2,
    },
    header: {
        display: "flex",
        gap: "20px",
        alignItems: "center",
    },
    permissionsContainer: {
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        maxHeight: "500px",
        overflowY: "auto",
        padding: "10px",
        border: "1px solid #ccc",
        borderRadius: "4px",
    },
    permissionItem: {
        display: "block",
    },
    footer: {
        display: "flex",
        justifyContent: "flex-end",
    }
});

const PermissionManagement = () => {
    const styles = useStyles();
    const { showMessage, setLoading } = useAppContext();
    
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [selectedRole, setSelectedRole] = useState(null);
    const [selectedPermissions, setSelectedPermissions] = useState(new Set());
    const [isSaving, setIsSaving] = useState(false);

    // Fetch all roles for the dropdown
    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const response = await fetch(`${BASE_URL}/api/roles`);
                if (!response.ok) throw new Error("Ажил үүргүүдийг татахад алдаа гарлаа");
                const data = await response.json();
                setRoles(data);
            } catch (error) {
                showMessage(error.message, "error");
            }
        };
        fetchRoles();
    }, [showMessage]);

    // Fetch all available permissions
    useEffect(() => {
        const fetchPermissions = async () => {
            try {
                const response = await fetch(`${BASE_URL}/api/permissions`);
                if (!response.ok) throw new Error("Эрхүүдийг татахад алдаа гарлаа");
                const data = await response.json();
                setPermissions(data);
            } catch (error) {
                showMessage(error.message, "error");
            }
        };
        fetchPermissions();
    }, [showMessage]);

    // Fetch permissions for the selected role
    const fetchRolePermissions = useCallback(async (roleId) => {
        setLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/api/roles/${roleId}/permissions`);
            if (!response.ok) throw new Error("Сонгогдсон ажил үүргийн эрхийг татахад алдаа гарлаа");
            const data = await response.json(); // Assuming returns { permissionIds: [1, 2, ...] }
            setSelectedPermissions(new Set(data.permissionIds));
        } catch (error) {
            showMessage(error.message, "error");
        } finally {
            setLoading(false);
        }
    }, [setLoading, showMessage]);

    const handleRoleChange = (event, data) => {
        const roleId = data.optionValue;
        setSelectedRole(roleId);
        if (roleId) {
            fetchRolePermissions(roleId);
        } else {
            setSelectedPermissions(new Set());
        }
    };

    const handlePermissionChange = (permId, checked) => {
        setSelectedPermissions(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(permId);
            } else {
                newSet.delete(permId);
            }
            return newSet;
        });
    };

    const handleSave = async () => {
        if (!selectedRole) {
            showMessage("Эхлээд ажил үүрэг сонгоно уу!", "warning");
            return;
        }
        setIsSaving(true);
        try {
            const response = await fetch(`${BASE_URL}/api/roles/${selectedRole}/permissions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ permissionIds: Array.from(selectedPermissions) }),
            });
            if (!response.ok) throw new Error("Эрхийг хадгалахад алдаа гарлаа");
            showMessage("Эрх амжилттай хадгалагдлаа", "success");
        } catch (error) {
            showMessage(error.message, "error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className={styles.root}>
            <h2 className={styles.title}>Эрхийн удирдлага</h2>
            
            <div className={styles.header}>
                <Label>Ажил үүрэг сонгох:</Label>
                <Dropdown
                    placeholder="Ажил үүрэг сонгоно уу..."
                    onOptionSelect={handleRoleChange}
                    style={{ minWidth: "250px" }}
                >
                    {roles.map((role) => (
                        <Option key={role.id} value={role.id}>
                            {role.name}
                        </Option>
                    ))}
                </Dropdown>
            </div>

            {selectedRole && (
                 <div className={styles.permissionsContainer}>
                    {permissions.length > 0 ? (
                        permissions.map(perm => (
                            <Checkbox 
                                key={perm.id}
                                label={perm.name}
                                checked={selectedPermissions.has(perm.id)}
                                onChange={(e, data) => handlePermissionChange(perm.id, data.checked)}
                                className={styles.permissionItem}
                            />
                        ))
                    ) : (
                        <p>Тохируулах боломжтой эрх олдсонгүй.</p>
                    )}
                </div>
            )}

            <div className={styles.footer}>
                <Button 
                    appearance="primary" 
                    onClick={handleSave} 
                    disabled={!selectedRole || isSaving}
                    icon={isSaving ? <Spinner size="tiny" /> : null}
                >
                    {isSaving ? "Хадгалж байна..." : "Хадгалах"}
                </Button>
            </div>
        </div>
    );
};

export default PermissionManagement;
