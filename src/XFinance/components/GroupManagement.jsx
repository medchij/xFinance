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
  typographyStyles,
} from "@fluentui/react-components";
import { Add24Regular, Edit24Regular, Delete24Regular } from "@fluentui/react-icons";
import { useAppContext } from "./AppContext";
import { BASE_URL } from "../../config";

const GroupForm = lazy(() => import(/* webpackChunkName: "admin-group-form" */ "./GroupForm"));

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
    ...typographyStyles.title2,
  },
  table: {
    width: "100%",
  },
  actionCell: {
    display: "flex",
    gap: tokens.spacingHorizontalS,
  },
});

const GroupManagement = () => {
  const styles = useStyles();
  const { showMessage, setLoading } = useAppContext();
  const [groups, setGroups] = useState([]);
  const [isFormOpen, setFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/groups`);
      if (!response.ok) throw new Error("Бүлгүүдийг татахад алдаа гарлаа");
      const data = await response.json();
      setGroups(data);
    } catch (error) {
      showMessage(`Алдаа: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleAddGroup = () => {
    setEditingGroup(null);
    setFormOpen(true);
  };

  const handleEditGroup = (group) => {
    setEditingGroup(group);
    setFormOpen(true);
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm("Энэ бүлгийг устгахдаа итгэлтэй байна уу?")) return;

    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/groups/${groupId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Бүлгийг устгахад алдаа гарлаа");
      showMessage("Бүлэг амжилттай устгагдлаа", "success");
      fetchGroups(); // Refresh the list
    } catch (error) {
      showMessage(`Алдаа: ${error.message}`, "error");
      setLoading(false);
    }
  };

  const handleSaveGroup = async (groupData) => {
    setIsSaving(true);
    const isUpdating = !!groupData.id;
    const url = isUpdating ? `${BASE_URL}/api/groups/${groupData.id}` : `${BASE_URL}/api/groups`;
    const method = isUpdating ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(groupData),
      });
      if (!response.ok) throw new Error("Бүлгийн мэдээллийg хадгалахад алдаа гарлаа");

      showMessage(`Бүлэг амжилттай ${isUpdating ? "шинэчлэгдлээ" : "үүслээ"}`, "success");
      setFormOpen(false);
      fetchGroups(); // Refresh the list
    } catch (error) {
      showMessage(`Алдаа: ${error.message}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h2 className={styles.title}>Хэрэглэгчийн бүлгийн удирдлага</h2>
        <Button icon={<Add24Regular />} appearance="primary" onClick={handleAddGroup}>
          Шинэ бүлэг
        </Button>
      </div>

      <Table aria-label="Group list table" className={styles.table}>
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Нэр</TableHeaderCell>
            <TableHeaderCell>Тайлбар</TableHeaderCell>
            <TableHeaderCell>Үйлдэл</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <TableRow key={group.id}>
              <TableCell>{group.name}</TableCell>
              <TableCell>{group.description}</TableCell>
              <TableCell>
                <div className={styles.actionCell}>
                  <Button icon={<Edit24Regular />} aria-label="Засах" onClick={() => handleEditGroup(group)} />
                  <Button icon={<Delete24Regular />} aria-label="Устгах" onClick={() => handleDeleteGroup(group.id)} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Suspense fallback={<div>Ачааллаж байна...</div>}>
        {isFormOpen && (
          <GroupForm
            isOpen={isFormOpen}
            onClose={() => setFormOpen(false)}
            onSave={handleSaveGroup}
            group={editingGroup}
            isSaving={isSaving}
          />
        )}
      </Suspense>
    </div>
  );
};

export default GroupManagement;
