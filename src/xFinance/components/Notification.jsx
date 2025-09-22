import React from "react";
import PropTypes from "prop-types";
import {
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  MessageBarGroup,
  MessageBarActions,
  Button,
} from "@fluentui/react-components";
import { DismissRegular } from "@fluentui/react-icons";

const Notification = ({ message, type = "info", onClose, singleline = false }) => {
  if (!message) return null;

  const content = message.replace(/^✅ |^❌ |^⚠️ /, "");

  return (
    <div
      style={{
        position: "fixed",
        top: "20%",
        left: "50%",
        transform: "translate(-50%, -20%)",
        zIndex: 1000,
        maxWidth: "360px",
        width: "90%",
      }}
    >
      <MessageBarGroup animate="both">
        <MessageBar layout={singleline ? "singleline" : "multiline"} intent={type}>
          <MessageBarBody > 
            {/* style={{ paddingTop: "8px", paddingBottom: "8px" }} */}
            <MessageBarTitle>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "4px",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                    maxWidth: "290px",
                    whiteSpace: "pre-wrap",
                    lineHeight: "1.5",
                  }}
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              </div>
            </MessageBarTitle>
          </MessageBarBody>

          <MessageBarActions
            containerAction={
              type !== "success" ? (
                <Button
                  onClick={onClose}
                  aria-label="dismiss"
                  appearance="transparent"
                  icon={<DismissRegular />}
                />
              ) : null
            }
          />
        </MessageBar>
      </MessageBarGroup>
    </div>
  );
};

Notification.propTypes = {
  message: PropTypes.string,
  type: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  singleline: PropTypes.bool,
};

export default Notification;