import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogSurface,
    DialogTitle,
    DialogBody,
    DialogActions,
    DialogContent,
    Button,
    Input,
    Label,
    makeStyles,
    Spinner,
} from "@fluentui/react-components";
import { useAppContext } from "./AppContext";
import { BASE_URL } from "../../config";

const useStyles = makeStyles({
    content: {
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        width: "400px",
    },
    formItem: {
        display: "flex",
        flexDirection: "column",
        gap: "4px",
    }
});

const UserForm = ({ isOpen, onClose, onSave, user }) => {
    const styles = useStyles();
    const { showMessage, setLoading, loading: isSaving } = useAppContext();

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [fullName, setFullName] = useState("");
    const [password, setPassword] = useState(""); // New password field

    const isUpdating = !!user; // Check if we are updating an existing user

    useEffect(() => {
        if (isOpen) { // Only update state when dialog opens
            if (isUpdating) {
                setUsername(user.username || "");
                setEmail(user.email || "");
                setFullName(user.full_name || "");
                setPassword(""); // Always clear password on open for security
            } else {
                // Reset form for new user
                setUsername("");
                setEmail("");
                setFullName("");
                setPassword("");
            }
        }
    }, [user, isOpen, isUpdating]);

    const handleSave = async () => {
        const url = isUpdating ? `${BASE_URL}/api/users/${user.id}` : `${BASE_URL}/api/users`;
        const method = isUpdating ? 'PUT' : 'POST';

        // Validation
        if (!username || !email) {
            showMessage("Хэрэглэгчийн нэр, и-мэйл хоёрыг заавал бөглөнө үү.", "warning");
            return;
        }
        if (!isUpdating && !password) {
            showMessage("Шинэ хэрэглэгч үүсгэхэд нууц үг заавал хэрэгтэй.", "warning");
            return;
        }

        const userData = {
            username,
            email,
            full_name: fullName,
        };

        // Only include password if it's being set (for new user or password change)
        if (password) {
            userData.password = password;
        }

        setLoading(true);
        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData),
            });
            
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.msg || (isUpdating ? "Хэрэглэгч шинэчлэхэд алдаа гарлаа" : "Хэрэглэгч үүсгэхэд алдаа гарлаа"));
            }
            
            showMessage(`Хэрэглэгч амжилттай ${isUpdating ? 'шинэчлэгдлээ' : 'үүслээ'}`, "success");
            onSave(); // Callback to refresh the parent component's state
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
                    <DialogTitle>{isUpdating ? "Хэрэглэгч засах" : "Шинэ хэрэглэгч нэмэх"}</DialogTitle>
                    <DialogContent className={styles.content}>
                        <div className={styles.formItem}>
                            <Label htmlFor="username-input" required>Хэрэглэгчийн нэр</Label>
                            <Input id="username-input" value={username} onChange={(e, data) => setUsername(data.value)} disabled={isSaving}/>
                        </div>
                        <div className={styles.formItem}>
                            <Label htmlFor="email-input" required>И-мэйл</Label>
                            <Input id="email-input" type="email" value={email} onChange={(e, data) => setEmail(data.value)} disabled={isSaving}/>
                        </div>
                        <div className={styles.formItem}>
                            <Label htmlFor="fullname-input">Бүтэн нэр</Label>
                            <Input id="fullname-input" value={fullName} onChange={(e, data) => setFullName(data.value)} disabled={isSaving}/>
                        </div>
                         <div className={styles.formItem}>
                            <Label htmlFor="password-input">Нууц үг</Label>
                            <Input id="password-input" type="password" value={password} onChange={(e, data) => setPassword(data.value)} disabled={isSaving} placeholder={isUpdating ? "Шинэ нууц үгээ энд бичнэ үү..." : ""}/>
                        </div>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={onClose} disabled={isSaving}>Цуцлах</Button>
                        <Button 
                            appearance="primary" 
                            onClick={handleSave} 
                            disabled={isSaving || !username || !email}
                            icon={isSaving ? <Spinner size="tiny" /> : null}
                        >
                            {isSaving ? "Хадгалж байна..." : "Хадгалах"}
                        </Button>
                    </DialogActions>
                </DialogBody>
            </DialogSurface>
        </Dialog>
    );
};

export default UserForm;
