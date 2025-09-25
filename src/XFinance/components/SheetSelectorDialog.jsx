import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogActions,
  Dropdown,
  Option,
  Button,
} from "@fluentui/react-components";

const SheetSelectorDialog = ({ isOpen, onClose, onSelect }) => {
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

  const handleImport = () => {
    if (!selectedSheet) return alert("⚠️ Sheet сонгоно уу");
    onSelect(selectedSheet);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface
        style={{
          width: "min(500px, 90vw)",
          maxWidth: "90vw",
        }}
      >
        <DialogBody>
          <DialogTitle style={{ fontSize: "16px" }}>📄 Оруулах sheet сонгох</DialogTitle>

          <Dropdown
            style={{ width: "100%", margin: "12px 0" }}
            placeholder="Sheet сонгох"
            onOptionSelect={(_, data) => setSelectedSheet(data.optionValue)}
          >
            {sheetNames.map((name) => (
              <Option key={name} value={name}>
                {name}
              </Option>
            ))}
          </Dropdown>

          <DialogActions style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
            <Button
              appearance="primary"
              size="small" // 🔹 Жижиг хувилбар
              onClick={handleImport}
              style={{
                maxWidth: "100px",
              }}
            >
              Импорт хийх
            </Button>
            <Button
              appearance="secondary"
              size="small" // 🔹 Жижиг хувилбар
              onClick={onClose}
              style={{
                maxWidth: "100px",
              }}
            >
              Болих
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

export default SheetSelectorDialog;
