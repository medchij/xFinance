import React from "react";
import { useAppContext } from "./AppContext";
import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Caption1,
} from "@fluentui/react-components";

const ActionLogModal = ({ isOpen, onClose }) => {
  const { actionLog } = useAppContext();

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogSurface style={{ maxWidth: 600 }}>
        <DialogBody>
          <DialogTitle>📋 Үйлдлийн лог</DialogTitle>

          <DialogContent>
            {actionLog.length === 0 ? (
              <Caption1 italic>🕐 Одоогоор лог бүртгэгдээгүй байна.</Caption1>
            ) : (
              <ul style={{ listStyle: "none", padding: 0 }}>
                {actionLog
                  .slice()
                  .reverse()
                  .map((log, i) => (
                    <li key={i} style={{ marginBottom: "8px" }}>
                      <span style={{ color: "#888", fontFamily: "monospace" }}>[{log.time}]</span> {log.message}
                    </li>
                  ))}
              </ul>
            )}
          </DialogContent>

          <DialogActions>
            <Button appearance="secondary" onClick={onClose}>
              Хаах
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

export default ActionLogModal;
