// ShortcutListener.jsx
import { useEffect } from "react";

const ShortcutListener = ({ onTrigger }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        onTrigger();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onTrigger]);

  return null;
};

export default ShortcutListener;
