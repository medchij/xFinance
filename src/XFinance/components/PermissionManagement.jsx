import React, { useState, useMemo, useEffect } from "react";
import {
  makeStyles,
  shorthands,
  Button,
  Input,
  TableBody,
  TableCell,
  TableRow,
  Table,
  TableHeader,
  TableHeaderCell,
  useTableFeatures,
  useTableSort,
  Body1,
  Card,
  CardHeader,
  Title3,
  Tooltip,
  Spinner,
} from "@fluentui/react-components";
import { 
  EditRegular, 
  DeleteRegular, 
  CheckmarkCircle24Regular,
  DismissCircle24Regular,
} from "@fluentui/react-icons";
import { BASE_URL } from "../../config";
import { useAppContext } from "./AppContext";
import ConfirmationDialog from "./ConfirmationDialog";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap("20px"),
    height: "100%",
  },
  card: {
    ...shorthands.flex(1),
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    ...shorthands.padding("0", "16px"),
  },
  form: {
    display: "flex",
    alignItems: "center",
    ...shorthands.gap("10px"),
  },
  content: {
    ...shorthands.overflow("auto"),
  },
  actionButtons: {
    display: "flex",
    ...shorthands.gap("8px"),
  },
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    ...shorthands.padding("40px"),
  },
});

const columns = [
  { columnKey: "name", label: "Эрхийн нэр" },
  { columnKey: "description", label: "Тайлбар" },
  { columnKey: "actions", label: "Үйлдэл" },
];

const PermissionManagement = () => {
  const styles = useStyles();
  const { showMessage, logout, hasPermission } = useAppContext();
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPermissionName, setNewPermissionName] = useState("");
  const [newPermissionDesc, setNewPermissionDesc] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPermission, setDeletingPermission] = useState(null);

  // Fetch permissions from backend
  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${BASE_URL}/api/permissions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        showMessage("Нэвтрэх эрх дууссан байна. Дахин нэвтэрнэ үү.", "error");
        logout();
        return;
      }

      if (!response.ok) {
        throw new Error("Эрх татахад алдаа гарлаа");
      }

      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      showMessage(error.message || "Эрх татахад алдаа гарлаа", "error");
    } finally {
      setLoading(false);
    }
  };

  const {
    getRows,
    sort: { getSortDirection, toggleColumnSort, sort },
  } = useTableFeatures(
    {
      columns,
      items,
    },
    [
      useTableSort({
        defaultSortState: { sortColumn: "name", sortDirection: "ascending" },
      }),
    ]
  );

  const sortedRows = useMemo(() => sort(getRows()), [sort, getRows]);

  const handleAddPermission = async () => {
    if (!newPermissionName.trim() || !newPermissionDesc.trim()) {
      showMessage("Эрхийн нэр болон тайлбар оруулна уу", "warning");
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${BASE_URL}/api/permissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newPermissionName.trim(),
          description: newPermissionDesc.trim(),
        }),
      });

      if (response.status === 401) {
        showMessage("Нэвтрэх эрх дууссан байна. Дахин нэвтэрнэ үү.", "error");
        logout();
        return;
      }

      const data = await response.json();

      if (response.status === 409) {
        showMessage(data.message || "Ийм нэртэй эрх аль хэдийн байна", "warning");
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Эрх нэмэхэд алдаа гарлаа");
      }

      showMessage("Эрх амжилттай нэмэгдлээ", "success");
      setNewPermissionName("");
      setNewPermissionDesc("");
      fetchPermissions();
    } catch (error) {
      console.error("Error adding permission:", error);
      showMessage(error.message || "Эрх нэмэхэд алдаа гарлаа", "error");
    }
  };

  const handleEditStart = (permission) => {
    setEditingId(permission.id);
    setEditName(permission.name);
    setEditDesc(permission.description);
  };

  const handleEditSave = async (id) => {
    if (!editName.trim() || !editDesc.trim()) {
      showMessage("Эрхийн нэр болон тайлбар оруулна уу", "warning");
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${BASE_URL}/api/permissions/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDesc.trim(),
        }),
      });

      if (response.status === 401) {
        showMessage("Нэвтрэх эрх дууссан байна. Дахин нэвтэрнэ үү.", "error");
        logout();
        return;
      }

      const data = await response.json();

      if (response.status === 409) {
        showMessage(data.message || "Ийм нэртэй эрх аль хэдийн байна", "warning");
        return;
      }

      if (response.status === 404) {
        showMessage("Эрх олдсонгүй", "error");
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Эрх засахад алдаа гарлаа");
      }

      showMessage("Эрх амжилттай засагдлаа", "success");
      setEditingId(null);
      setEditName("");
      setEditDesc("");
      fetchPermissions();
    } catch (error) {
      console.error("Error updating permission:", error);
      showMessage(error.message || "Эрх засахад алдаа гарлаа", "error");
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditName("");
    setEditDesc("");
  };

  const handleDeleteClick = (permission) => {
    setDeletingPermission(permission);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPermission) return;

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${BASE_URL}/api/permissions/${deletingPermission.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        showMessage("Нэвтрэх эрх дууссан байна. Дахин нэвтэрнэ үү.", "error");
        logout();
        return;
      }

      const data = await response.json();

      if (response.status === 409) {
        showMessage(data.message || "Энэ эрх ашиглагдаж байгаа тул устгах боломжгүй", "warning");
        return;
      }

      if (response.status === 404) {
        showMessage("Эрх олдсонгүй", "error");
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Эрх устгахад алдаа гарлаа");
      }

      showMessage("Эрх амжилттай устгагдлаа", "success");
      fetchPermissions();
    } catch (error) {
      console.error("Error deleting permission:", error);
      showMessage(error.message || "Эрх устгахад алдаа гарлаа", "error");
    } finally {
      setDeleteDialogOpen(false);
      setDeletingPermission(null);
    }
  };

  if (loading) {
    return (
      <div className={styles.root}>
        <div className={styles.loadingContainer}>
          <Spinner label="Эрх ачааллаж байна..." />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <Title3>Эрхийн удирдлага</Title3>
      <Body1>Системд ашиглагдах боломжтой бүх үйлдлийн эрхийг энд тодорхойлж, удирдна.</Body1>

      <Card className={styles.card}>
        {hasPermission("manage_permissions") && (
          <CardHeader className={styles.header}>
            <div className={styles.form}>
              <Input
                placeholder="Эрхийн нэр (жишээ: create_user)"
                value={newPermissionName}
                onChange={(_, data) => setNewPermissionName(data.value)}
              />
              <Input
                placeholder="Тайлбар"
                value={newPermissionDesc}
                onChange={(_, data) => setNewPermissionDesc(data.value)}
              />
              <Button appearance="primary" onClick={handleAddPermission}>
                Нэмэх
              </Button>
            </div>
          </CardHeader>
        )}

        <div className={styles.content}>
          <Table arial-label="Эрхийн жагсаалт" size="small">
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHeaderCell
                    key={column.columnKey}
                    sortDirection={getSortDirection(column.columnKey)}
                    onClick={column.columnKey !== "actions" ? () => toggleColumnSort(column.columnKey) : undefined}
                  >
                    {column.label}
                  </TableHeaderCell>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedRows.map(({ item }) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {editingId === item.id ? (
                      <Input
                        value={editName}
                        onChange={(_, data) => setEditName(data.value)}
                        size="small"
                      />
                    ) : (
                      item.name
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === item.id ? (
                      <Input
                        value={editDesc}
                        onChange={(_, data) => setEditDesc(data.value)}
                        size="small"
                      />
                    ) : (
                      item.description
                    )}
                  </TableCell>
                  <TableCell>
                    <div className={styles.actionButtons}>
                      {hasPermission("manage_permissions") && (
                        editingId === item.id ? (
                          <>
                            <Tooltip content="Хадгалах" relationship="label">
                              <Button
                                icon={<CheckmarkCircle24Regular />}
                                appearance="subtle"
                                onClick={() => handleEditSave(item.id)}
                                size="small"
                              />
                            </Tooltip>
                            <Tooltip content="Цуцлах" relationship="label">
                              <Button
                                icon={<DismissCircle24Regular />}
                                appearance="subtle"
                                onClick={handleEditCancel}
                                size="small"
                              />
                            </Tooltip>
                          </>
                        ) : (
                          <>
                            <Tooltip content="Засах" relationship="label">
                              <Button
                                icon={<EditRegular />}
                                appearance="subtle"
                                onClick={() => handleEditStart(item)}
                                size="small"
                              />
                            </Tooltip>
                            <Tooltip content="Устгах" relationship="label">
                              <Button
                                icon={<DeleteRegular />}
                                appearance="subtle"
                                onClick={() => handleDeleteClick(item)}
                                size="small"
                              />
                            </Tooltip>
                          </>
                        )
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        message={`"${deletingPermission?.name}" эрхийг устгах уу?`}
      />
    </div>
  );
};

export default PermissionManagement;
