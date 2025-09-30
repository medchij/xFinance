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
    typography,
} from "@fluentui/react-components";
import { Add24Regular, Edit24Regular, Delete24Regular } from "@fluentui/react-icons";
import { useAppContext } from "./AppContext";
import { BASE_URL } from "../../config";

const RoleForm = lazy(() => import(/* webpackChunkName: "admin-role-form" */ './RoleForm'));

const useStyles = makeStyles({
    root: {
        display: "flex",
        flexDirection: "column",
        gap: "20px",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    title: {
        ...typography.title2,
    },
    table: {
        width: "100%",
    },
    actionCell: {
        display: "flex",
        gap: tokens.spacingHorizontalS,
    }
});

const RoleManagement = () => {
    const styles = useStyles();
    const { showMessage, setLoading } = useAppContext();
    const [roles, setRoles] = useState([]);
    const [isFormOpen, setFormOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingRole, setEditingRole] = useState(null);

    const fetchRoles = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/api/roles`);
            if (!response.ok) throw new Error("Ажил үүргүүдийг татахад алдаа гарлаа");
            const data = await response.json();
            setRoles(data);
        } catch (error) {
            showMessage(`Алдаа: ${error.message}`, "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    const handleAddRole = () => {
        setEditingRole(null);
        setFormOpen(true);
    };

    const handleEditRole = (role) => {
        setEditingRole(role);
        setFormOpen(true);
    };

    const handleDeleteRole = async (roleId) => {
        if (!window.confirm("Энэ ажил үүргийг устгахдаа итгэлтэй байна уу?")) return;

        setLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/api/roles/${roleId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error("Ажил үүргийг устгахад алдаа гарлаа");
            showMessage("Ажил үүрэг амжилттай устгагдлаа", "success");
            fetchRoles(); // Refresh the list
        } catch (error) {
            showMessage(`Алдаа: ${error.message}`, "error");
            setLoading(false); // Ensure loading is turned off on error
        }
    };

    const handleSaveRole = async (roleData) => {
        setIsSaving(true);
        const isUpdating = !!roleData.id;
        const url = isUpdating ? `${BASE_URL}/api/roles/${roleData.id}` : `${BASE_URL}/api/roles`;
        const method = isUpdating ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(roleData),
            });
            if (!response.ok) throw new Error("Ажил үүргийн мэдээллийг хадгалахад алдаа гарлаа");
            
            showMessage(`Ажил үүрэг амжилттай ${isUpdating ? 'шинэчлэгдлээ' : 'үүслээ'}`, "success");
            setFormOpen(false);
            fetchRoles(); // Refresh the list
        } catch (error) {
            showMessage(`Алдаа: ${error.message}`, "error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <h2 className={styles.title}>Ажил үүргийн удирдлага</h2>
                <Button icon={<Add24Regular />} appearance="primary" onClick={handleAddRole}>
                    Шинэ ажил үүрэг
                </Button>
            </div>

            <Table arial-label="Role list table" className={styles.table}>
                <TableHeader>
                    <TableRow>
                        <TableHeaderCell>Нэр</TableHeaderCell>
                        <TableHeaderCell>Тайлбар</TableHeaderCell>
                        <TableHeaderCell>Үйлдэл</TableHeaderCell>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {roles.map((role) => (
                        <TableRow key={role.id}>
                            <TableCell>{role.name}</TableCell>
                            <TableCell>{role.description}</TableCell>
                            <TableCell>
                                <div className={styles.actionCell}>
                                <Button icon={<Edit24Regular />} aria-label="Засах" onClick={() => handleEditRole(role)} />
                                <Button icon={<Delete24Regular />} aria-label="Устгах" onClick={() => handleDeleteRole(role.id)} />
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <Suspense fallback={<div>Ачааллаж байна...</div>}>
                {isFormOpen && (
                    <RoleForm 
                        isOpen={isFormOpen} 
                        onClose={() => setFormOpen(false)} 
                        onSave={handleSaveRole}
                        role={editingRole}
                        isSaving={isSaving}
                    />
                )}
            </Suspense>
        </div>
    );
};

export default RoleManagement;
