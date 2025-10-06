import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Dropdown,
  Option,
  Button,
  Input,
  Label,
  makeStyles,
} from "@fluentui/react-components";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    paddingTop: "12px",
  },
  field: {
    display: "grid",
    gridRowGap: "4px",
  },
  divider: {
    textAlign: "center",
    color: "#666",
    fontWeight: "bold",
    margin: "4px 0",
  },
  actions: {
    display: "flex",
    gap: "6px",
    justifyContent: "flex-end",
  },
  dialogSurface: {
    width: "min(500px, 90vw)",
    maxWidth: "90vw",
  },
});

const SheetSelectorDialog = ({ isOpen, onClose, onSelect }) => {
  const classes = useStyles();
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [newSheetName, setNewSheetName] = useState(""); // Шинэ sheet-ийн нэрийг хадгалах state

  useEffect(() => {
    if (!isOpen) return;
    Excel.run(async (context) => {
      const sheets = context.workbook.worksheets;
      sheets.load("items/name");
      await context.sync();
      setSheetNames(sheets.items.map((sheet) => sheet.name));
    }).catch((err) => console.error("❌ Sheet нэр татахад алдаа:", err));
  }, [isOpen]);

  const handleImport = async () => {
    const targetSheetName = newSheetName.trim() || selectedSheet;
    if (!targetSheetName) {
      // Энд showMessage ашиглах боломжгүй тул alert ашиглав.
      alert("⚠️ Sheet сонгох эсвэл шинээр нэр өгнө үү.");
      return;
    }

    // Хэрэв шинэ нэр өгсөн бол тухайн sheet-г үүсгэх
    if (newSheetName.trim()) {
      try {
        await Excel.run(async (context) => {
          const sheets = context.workbook.worksheets;
          // Шинэ нэрээр sheet үүсгэх
          sheets.add(targetSheetName);
          await context.sync();
        });
      } catch (error) {
        // Хэрэв sheet аль хэдийн байвал алдааг үл тооно.
        if (error.code !== "ItemAlreadyExists") {
          console.error("❌ Шинэ sheet үүсгэхэд алдаа гарлаа:", error);
          alert(`Алдаа: ${error.message}`);
          return;
        }
      }
    }

    onSelect(targetSheetName);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface className={classes.dialogSurface}>
        <DialogBody>
          <DialogTitle style={{ fontSize: "18px" }}>Sheet сонгох эсвэл Шинээр үүсгэх</DialogTitle>
          <DialogContent>
            <div className={classes.root}>
              <div className={classes.field}>
                <Label htmlFor="sheet-dropdown">Одоо байгаа Sheet-г сонгох</Label>
                <Dropdown
                  id="sheet-dropdown"
                  placeholder="Жагсаалтаас сонгох..."
                  onOptionSelect={(_, data) => {
                    setSelectedSheet(data.optionValue);
                    setNewSheetName(""); // Dropdown-оос сонгоход input-г цэвэрлэх
                  }}
                  disabled={!!newSheetName.trim()} // Шинэ нэр бичиж байвал идэвхгүй болгох
                >
                  {sheetNames.map((name) => (
                    <Option key={name} value={name}>
                      {name}
                    </Option>
                  ))}
                </Dropdown>
              </div>

              <div className={classes.divider}>ЭСВЭЛ</div>

              <div className={classes.field}>
                <Label htmlFor="new-sheet-input">Шинэ Sheet үүсгэх</Label>
                <Input
                  id="new-sheet-input"
                  placeholder="Шинээр sheet-ийн нэр өгөх..."
                  value={newSheetName}
                  onChange={(_, data) => {
                    setNewSheetName(data.value);
                    setSelectedSheet(null); // Input-д бичихэд dropdown сонголтыг цэвэрлэх
                  }}
                />
              </div>
            </div>
          </DialogContent>
          <DialogActions className={classes.actions}>
            <Button appearance="primary" size="small" onClick={handleImport}>
              Сонгох
            </Button>
            <Button appearance="secondary" size="small" onClick={onClose}>
              Болих
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

export default SheetSelectorDialog;
