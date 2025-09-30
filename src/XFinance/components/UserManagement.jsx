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

const UserForm = lazy(() => import(/* webpackChunkName: "admin-user-form" */ './UserForm'));

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

const UserManagement = () => {
    const styles = useStyles();
    const { showMessage, setLoading } = useAppContext();
    const [users, setUsers] = useState([]);
    const [isFormOpen, setFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${BASE_URL}/api/users`);
            if (!response.ok) throw new Error("Хэрэглэгчдийг татахад алдаа гарлаа");
            const data = await response.json();
            setUsers(data);
        } catch (error) {
            showMessage(`Алдар: ${error.message}`, "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

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
            const response = await fetch(`${BASE_URL}/api/users/${userId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error("Хэрэглэгчийг устгахад алдаа гарлаа");
            showMessage("Хэрэглэгч амжилттай устгагдлаа", "success");
            fetchUsers(); // Refresh the list
        } catch (error) {
            showMessage(`Алдаа: ${error.message}`, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveUser = async (userData) => {
        setLoading(true);
        const isUpdating = !!userData.id;
        const url = isUpdating ? `${BASE_URL}/api/users/${userData.id}` : `${BASE_URL}/api/users`;
        const method = isUpdating ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData),
            });
            if (!response.ok) throw new Error("Хэрэглэгчийн мэдээллийг хадгалахад алдаа гарлаа");
            
            showMessage(`Хэрэглэгч амжилттай ${isUpdating ? 'шинэчлэгдлээ' : 'үүслээ'}`, "success");
            setFormOpen(false);
            fetchUsers(); // Refresh the list
        } catch (error) {
            showMessage(`Алдаа: ${error.message}`, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <h2 className={styles.title}>Хэрэглэгчийн удирдлага</h2>
                <Button icon={<Add24Regular />} appearance="primary" onClick={handleAddUser}>
                    Шинэ хэрэглэгч
                </Button>
            </div>

            <Table arial-label="User list table" className={styles.table}>
                <TableHeader>
                    <TableRow>
                        <TableHeaderCell>Нэр</TableHeaderCell>
                        <TableHeaderCell>И-мэйл</TableHeaderCell>
                        <TableHeaderCell>Ажил үүрэг</TableHeaderCell>
                        <TableHeaderCell>Үйлдэл</TableHeaderCell>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((user) => (
                        <TableRow key={user.id}>
                            <TableCell>{user.name}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{user.role}</TableCell>
                            <TableCell>
                                <div className={styles.actionCell}>
                                <Button icon={<Edit24Regular />} aria-label="Засах" onClick={() => handleEditUser(user)} />
                                <Button icon={<Delete24Regular />} aria-label="Устгах" onClick={() => handleDeleteUser(user.id)} />
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            
            <Suspense fallback={<div>Ачааллаж байна...</div>}>
                {isFormOpen && (
                    <UserForm 
                        isOpen={isFormOpen} 
                        onClose={() => setFormOpen(false)} 
                        onSave={handleSaveUser}
                        user={editingUser}
                    />
                )}
            </Suspense>
        </div>
    );
};

export default UserManagement;
