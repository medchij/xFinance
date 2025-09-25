import React from "react";
import PropTypes from "prop-types";
import { Dialog, DialogSurface, DialogBody, DialogTitle, DialogActions, Button } from "@fluentui/react-components";

const ConfirmationDialog = ({ isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={(_, data) => !data.open && onClose(false)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Та хуучин өгөгдлийг устгахдаа итгэлтэй байна уу?</DialogTitle>

          <DialogActions>
            <Button
              appearance="primary"
              size="small"
              onClick={() => onClose(true)}
              style={{
                maxWidth: "100px",
              }}
            >
              Тийм
            </Button>
            <Button
              appearance="secondary"
              size="small"
              onClick={() => onClose(false)}
              style={{
                maxWidth: "100px",
              }}
            >
              Үгүй
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

ConfirmationDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default ConfirmationDialog;
