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

const UserForm = ({ isOpen, onClose, onSave, user, isSaving }) => {
    const styles = useStyles();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("");

    useEffect(() => {
        if (user) {
            setName(user.name || "");
            setEmail(user.email || "");
            setRole(user.role || "");
        } else {
            // Reset form for new user
            setName("");
            setEmail("");
            setRole("");
        }
    }, [user, isOpen]); // Rerun when user or dialog visibility changes

    const handleSubmit = () => {
        const formData = { id: user?.id, name, email, role };
        onSave(formData);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(_, data) => !data.open && onClose()}>
            <DialogSurface>
                <DialogBody>
                    <DialogTitle>{user ? "Хэрэглэгч засах" : "Шинэ хэрэглэгч нэмэх"}</DialogTitle>
                    <DialogContent className={styles.content}>
                        <div className={styles.formItem}>
                            <Label htmlFor="name-input" required>Нэр</Label>
                            <Input id="name-input" value={name} onChange={(e, data) => setName(data.value)} disabled={isSaving}/>
                        </div>
                        <div className={styles.formItem}>
                            <Label htmlFor="email-input" required>И-мэйл</Label>
                            <Input id="email-input" type="email" value={email} onChange={(e, data) => setEmail(data.value)} disabled={isSaving}/>
                        </div>
                        <div className={styles.formItem}>
                            <Label htmlFor="role-input">Ажил үүрэг</Label>
                            <Input id="role-input" value={role} onChange={(e, data) => setRole(data.value)} disabled={isSaving}/>
                        </div>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={onClose} disabled={isSaving}>Цуцлах</Button>
                        <Button 
                            appearance="primary" 
                            onClick={handleSubmit} 
                            disabled={isSaving || !name || !email}
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
