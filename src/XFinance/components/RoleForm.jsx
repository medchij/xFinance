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
  Textarea,
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
  },
});

const RoleForm = ({ isOpen, onClose, onSave, role, isSaving }) => {
  const styles = useStyles();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (role) {
      setName(role.name || "");
      setDescription(role.description || "");
    } else {
      // Reset form for new role
      setName("");
      setDescription("");
    }
  }, [role, isOpen]);

  const handleSubmit = () => {
    const formData = { id: role?.id, name, description };
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{role ? "Ажил үүрэг засах" : "Шинэ ажил үүрэг нэмэх"}</DialogTitle>
          <DialogContent className={styles.content}>
            <div className={styles.formItem}>
              <Label htmlFor="name-input" required>
                Нэр
              </Label>
              <Input id="name-input" value={name} onChange={(e, data) => setName(data.value)} disabled={isSaving} />
            </div>
            <div className={styles.formItem}>
              <Label htmlFor="desc-input">Тайлбар</Label>
              <Textarea
                id="desc-input"
                value={description}
                onChange={(e, data) => setDescription(data.value)}
                disabled={isSaving}
                resize="vertical"
              />
            </div>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} disabled={isSaving}>
              Цуцлах
            </Button>
            <Button
              appearance="primary"
              onClick={handleSubmit}
              disabled={isSaving || !name}
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

export default RoleForm;
