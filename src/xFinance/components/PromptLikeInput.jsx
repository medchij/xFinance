// PromptLikeInput.jsx
import React, { useState } from "react";
import { Dialog, DialogSurface, DialogBody, DialogTitle, DialogActions, Input, Button } from "@fluentui/react-components";

const PromptLikeInput = ({ open, onClose, onSubmit, title = "Утга оруулна уу", placeholder = "..." }) => {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    onSubmit(value);
    setValue("");
  };

  const handleClose = () => {
    setValue("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && handleClose()}>
      <DialogSurface style={{ maxWidth: 400, width: "90vw" }}>
        <DialogBody>
          <DialogTitle>{title}</DialogTitle>
          <Input
            value={value}
            onChange={(_, data) => setValue(data.value)}
            placeholder={placeholder}
            style={{ margin: "10px 0" }}
          />
          <DialogActions>
            <Button appearance="secondary" onClick={handleClose}>Болих</Button>
            <Button appearance="primary" onClick={handleSubmit}>OK</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

export default PromptLikeInput;
