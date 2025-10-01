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

// Mock data for roles - in a real app, this would be fetched from the API
const availableRoles = [
    { id: 1, name: 'Администратор' },
    { id: 2, name: 'Нягтлан' },
    { id: 3, name: 'Хянагч' },
];

const UserManagement = () => {
    const styles = useStyles();
    const { showMessage, setLoading } = useAppContext();
    const [users, setUsers] = useState([]);
    const [isFormOpen, setFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    // Roles will be fetched or managed here
    // For now, we use a mock roles mapping
    const rolesMap = { 1: 'Администратор', 2: 'Нягтлан' }; 

    const fetchUsers = async () => {
        setLoading(true);
        try {
            // In a real app, you might fetch users and roles concurrently
            const response = await fetch(`${BASE_URL}/api/users`);
            if (!response.ok) throw new Error("Хэрэглэгчдийг татахад алдаа гарлаа");
            let data = await response.json();
            // Add mock role to user data
            data = data.map(u => ({...u, role_id: u.id % 2 + 1, role_name: rolesMap[u.id % 2 + 1] }))
            setUsers(data);
        } catch (error) {
            showMessage(`Алдаа: ${error.message}`, "error");
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
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.msg || "Хэрэглэгчийг устгахад алдаа гарлаа");
            }
            showMessage("Хэрэглэгч амжилттай устгагдлаа", "success");
            fetchUsers(); // Refresh the list
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


    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <h2 className={styles.title}>Хэрэглэгчийн удирдлага</h2>
                <Button icon={<Add24Regular />} appearance="primary" onClick={handleAddUser}>
                    Шинэ хэрэглэгч
                </Button>
            </div>

            <Table aria-label="User list table" className={styles.table}>
                <TableHeader>
                    <TableRow>
                        <TableHeaderCell>Хэрэглэгчийн нэр</TableHeaderCell>
                        <TableHeaderCell>И-мэйл</TableHeaderCell>
                        <TableHeaderCell>Бүтэн нэр</TableHeaderCell>
                        <TableHeaderCell>Ажил үүрэг</TableHeaderCell>
                        <TableHeaderCell>Үйлдэл</TableHeaderCell>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((user) => (
                        <TableRow key={user.id}>
                            <TableCell>{user.username}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>{user.full_name}</TableCell>
                            <TableCell>{user.role_name || "Тодорхойгүй"}</TableCell>
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
                        onClose={handleFormClose} 
                        onSave={handleFormSave}
                        user={editingUser}
                        availableRoles={availableRoles} // Pass roles to the form
                    />
                )}
            </Suspense>
        </div>
    );
};

export default UserManagement;
