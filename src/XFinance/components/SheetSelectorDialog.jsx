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
    gap: "4px",
    paddingTop: "12px",
  },
  field: {
    display: "grid",
    gridRowGap: "4px",
  },
  actions: {
    display: "flex",
    gap: "6px",
    justifyContent: "flex-end",
    paddingTop: "24px",
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
  const [isNewSheetDialogOpen, setIsNewSheetDialogOpen] = useState(false);
  const [newSheetName, setNewSheetName] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    Excel.run(async (context) => {
      const sheets = context.workbook.worksheets;
      sheets.load("items/name");
      await context.sync();
      setSheetNames(sheets.items.map((sheet) => sheet.name));
    }).catch((err) => console.error("❌ Sheet нэр татахад алдаа:", err));
  }, [isOpen]);

  const handleSelect = async (sheetName) => {
    if (!sheetName) {
      // We should provide better feedback than alert
      console.error("Sheet-ийн нэр хоосон байж болохгүй.");
      return;
    }

    try {
      await Excel.run(async (context) => {
        const sheets = context.workbook.worksheets;
        sheets.load("items/name");
        await context.sync();

        const existingSheets = sheets.items.map((s) => s.name);
        if (!existingSheets.includes(sheetName)) {
          sheets.add(sheetName);
          await context.sync();
        }
      });
    } catch (error) {
      console.error("❌ Sheet үүсгэх эсвэл шалгахад алдаа гарлаа:", error);
      // We should provide better feedback than alert
      return;
    }

    onSelect(sheetName);
    onClose();
  };

  const handleOptionSelect = (_, data) => {
    const selectedValue = data.optionValue;

    if (selectedValue === "__CREATE_NEW__") {
      setIsNewSheetDialogOpen(true);
    } else if (selectedValue) {
      setSelectedSheet(selectedValue);
    }
  };

  const handleContinue = () => {
    if (selectedSheet) {
      handleSelect(selectedSheet);
    } else {
      // We should provide better feedback than alert
      console.error("Sheet сонгоно уу.");
    }
  };

  const handleCreateNewSheet = () => {
    if (newSheetName && newSheetName.trim()) {
      handleSelect(newSheetName.trim());
      setIsNewSheetDialogOpen(false);
      setNewSheetName("");
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(_, data) => !data.open && onClose()}>
        <DialogSurface className={classes.dialogSurface}>
          <DialogBody>
            <DialogTitle style={{ fontSize: "18px" }}>Sheet сонгох</DialogTitle>
            <DialogContent>
              <div className={classes.root}>
                <div className={classes.field} style={{ width: "100%" }}>
                 
                  <Dropdown
                    id="sheet-dropdown"
                    placeholder="Жагсаалтаас сонгох..."
                    onOptionSelect={handleOptionSelect}
                    value={selectedSheet || ""}
                  
                  >
                    {sheetNames.map((name) => (
                      <Option key={name} value={name}>
                        {name}
                      </Option>
                    ))}
                    <Option key="__CREATE_NEW__" value="__CREATE_NEW__">
                      + Шинэ Sheet үүсгэх
                    </Option>
                  </Dropdown>
                </div>
              </div>
            </DialogContent>
            <DialogActions className={classes.actions}>
              <Button appearance="primary" size="small" onClick={handleContinue} disabled={!selectedSheet}>
                Үргэлжлүүлэх
              </Button>
              <Button appearance="secondary" size="small" onClick={onClose}>
                Болих
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog
        open={isNewSheetDialogOpen}
        onOpenChange={(_, data) => {
          if (!data.open) {
            setIsNewSheetDialogOpen(false);
            setNewSheetName("");
          }
        }}
      >
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Шинэ Sheet үүсгэх</DialogTitle>
            <DialogContent>
              <div className={classes.field} style={{ paddingTop: "12px" }}>
                <Label htmlFor="new-sheet-name-input">Sheet-ийн нэрийг оруулна уу:</Label>
                <Input
                  id="new-sheet-name-input"
                  value={newSheetName}
                  onChange={(_, data) => setNewSheetName(data.value)}
                  placeholder="Жш: Import_2025_10_06"
                />
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="primary" onClick={handleCreateNewSheet} disabled={!newSheetName.trim()}>
                Үүсгэх
              </Button>
              <Button appearance="secondary" onClick={() => setIsNewSheetDialogOpen(false)}>
                Болих
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
};

export default SheetSelectorDialog;
