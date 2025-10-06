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
      alert("⚠️ Sheet-ийн нэр хоосон байж болохгүй.");
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
      alert(`Алдаа: ${error.message}`);
      return;
    }

    onSelect(sheetName);
    onClose();
  };

  const handleOptionSelect = (_, data) => {
    const selectedValue = data.optionValue;

    if (selectedValue === "__CREATE_NEW__") {
      const newSheetName = prompt("Шинээр үүсгэх Sheet-ийн нэрийг оруулна уу:");
      if (newSheetName && newSheetName.trim()) {
        handleSelect(newSheetName.trim());
      }
    } else if (selectedValue) {
      setSelectedSheet(selectedValue);
    }
  };

  const handleContinue = () => {
    if (selectedSheet) {
      handleSelect(selectedSheet);
    } else {
      alert("⚠️ Sheet сонгоно уу.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface className={classes.dialogSurface}>
        <DialogBody>
          <DialogTitle style={{ fontSize: "18px" }}>Sheet сонгох</DialogTitle>
          <DialogContent>
            <div className={classes.root}>
              <div className={classes.field}>
                <Label htmlFor="sheet-dropdown">Файл оруулах sheet-ээ сонгоно уу.</Label>
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
  );
};

export default SheetSelectorDialog;
