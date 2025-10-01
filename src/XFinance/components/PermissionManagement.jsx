import React, { useState, useMemo } from "react";
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
    Title3
} from "@fluentui/react-components";

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
    }
});

const columns = [
    { columnKey: "name", label: "Эрхийн нэр" },
    { columnKey: "description", label: "Тайлбар" },
];

const initialItems = [
    { id: 1, name: "view_dashboard", description: "Хяналтын самбарыг харах" },
    { id: 2, name: "manage_users", description: "Хэрэглэгч удирдах (нэмэх, устгах, засах)" },
    { id: 3, name: "manage_roles", description: "Ажил үүрэг удирдах" },
    { id: 4, name: "manage_permissions", description: "Эрх удирдах" },
    { id: 5, name: "submit_transaction", description: "Гүйлгээ хийх" },
    { id: 6, name: "approve_transaction", description: "Гүйлгээ батлах" },
    { id: 7, name: "view_reports", description: "Тайлан харах" },
    { id: 8, name: "view_admin_page", description: "Админ хуудсыг харах" },
];

const PermissionManagement = () => {
    const styles = useStyles();
    const [items, setItems] = useState(initialItems);
    const [newPermissionName, setNewPermissionName] = useState("");
    const [newPermissionDesc, setNewPermissionDesc] = useState("");

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

    const handleAddPermission = () => {
        if (newPermissionName.trim() && newPermissionDesc.trim()) {
            const newPermission = {
                id: items.length + 1,
                name: newPermissionName.trim(),
                description: newPermissionDesc.trim(),
            };
            setItems([...items, newPermission]);
            setNewPermissionName("");
            setNewPermissionDesc("");
        }
    };
    
    return (
        <div className={styles.root}>
            <Title3>Эрхийн удирдлага</Title3>
            <Body1>Системд ашиглагдах боломжтой бүх үйлдлийн эрхийг энд тодорхойлж, удирдна.</Body1>
            
            <Card className={styles.card}>
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
                        <Button appearance="primary" onClick={handleAddPermission}>Нэмэх</Button>
                    </div>
                </CardHeader>

                <div className={styles.content}>
                    <Table arial-label="Эрхийн жагсаалт" size="small">
                        <TableHeader>
                            <TableRow>
                                {columns.map((column) => (
                                    <TableHeaderCell
                                        key={column.columnKey}
                                        sortDirection={getSortDirection(column.columnKey)}
                                        onClick={() => toggleColumnSort(column.columnKey)}
                                    >
                                        {column.label}
                                    </TableHeaderCell>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedRows.map(({ item }) => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.name}</TableCell>
                                    <TableCell>{item.description}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
};

export default PermissionManagement;
