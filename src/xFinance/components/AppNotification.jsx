import React from "react";
import { useAppContext } from "./AppContext";
import Notification from "./Notification";

const AppNotification = () => {
  const { message, type, setMessage } = useAppContext();

  if (!message) return null;

  return (
    <Notification
      message={message}
      type={type}
      onClose={() => setMessage("")}
    />
  );
};

export default AppNotification;
