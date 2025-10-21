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

const GroupForm = ({ isOpen, onClose, onSave, group, isSaving }) => {
  const styles = useStyles();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (group) {
      setName(group.name || "");
      setDescription(group.description || "");
    } else {
      setName("");
      setDescription("");
    }
  }, [group, isOpen]);

  const handleSubmit = () => {
    const formData = { id: group?.id, name, description };
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{group ? "Бүлэг засах" : "Шинэ бүлэг нэмэх"}</DialogTitle>
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

export default GroupForm;
