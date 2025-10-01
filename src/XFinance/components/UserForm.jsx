import React, { useState, useEffect } from 'react';
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
    Select
} from '@fluentui/react-components';
import { useAppContext } from './AppContext';
import { BASE_URL } from '../../config';

const useStyles = makeStyles({
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px',
        width: '400px',
    },
});

const UserForm = ({ isOpen, onClose, onSave, user, availableRoles }) => {
    const styles = useStyles();
    const { showMessage, setLoading } = useAppContext();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [roleId, setRoleId] = useState(null);

    useEffect(() => {
        if (user) {
            setUsername(user.username);
            setEmail(user.email);
            setFullName(user.full_name || '');
            setRoleId(user.role_id || '');
            setPassword(''); // Do not pre-fill password
        } else {
            // Reset form for new user
            setUsername('');
            setEmail('');
            setFullName('');
            setPassword('');
            setRoleId('');
        }
    }, [user, isOpen]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const isEditing = !!user;
            const url = isEditing ? `${BASE_URL}/api/users/${user.id}` : `${BASE_URL}/api/users`;
            const method = isEditing ? 'PUT' : 'POST';

            const body = {
                username,
                email,
                full_name: fullName,
                role_id: roleId,
            };
            if (password || !isEditing) {
                body.password = password;
            }

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.msg || (isEditing ? "Хэрэглэгчийг засахад алдаа гарлаа" : "Хэрэглэгч нэмэхэд алдаа гарлаа"));
            }

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
                        <Input id="password-input" type="password" value={password} onChange={(_, data) => setPassword(data.value)} required={!user} />

                        <Label htmlFor="role-select">Ажил үүрэг</Label>
                        <Select id="role-select" value={roleId} onChange={(_, data) => setRoleId(data.value)}>
                            <option value="">[Сонгоно уу]</option>
                            {(availableRoles || []).map(role => (
                                <option key={role.id} value={role.id}>{role.name}</option>
                            ))}
                        </Select>

                    </DialogContent>
                    <DialogActions>
                        <Button appearance="secondary" onClick={onClose}>Цуцлах</Button>
                        <Button appearance="primary" onClick={handleSave}>Хадгалах</Button>
                    </DialogActions>
                </DialogBody>
            </DialogSurface>
        </Dialog>
    );
};

export default UserForm;