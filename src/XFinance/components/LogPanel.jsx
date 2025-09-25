import React, { useEffect, useState , useRef } from "react";
import {
  Button,
  Input,
  Textarea,
  Field,
  makeStyles,
  tokens,
} from "@fluentui/react-components";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: tokens.colorNeutralBackground1,
    padding: "10px",
    overflow: "hidden",
  },
  header: {
    flexShrink: 0,
    paddingBottom: "8px",
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground2,
    zIndex: 1,
  },
  title: {
    margin: 0,
    fontSize: "16px",
  },
  controls: {
    marginTop: "6px",
    display: "flex",
    gap: "6px",
    alignItems: "center",
    fontSize: "11px",
  },
  logs: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    paddingTop: "10px",
  },
  logItem: {
    fontFamily: "monospace",
    fontSize: "12px",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  messagePanel: {
    flex: 1,
    marginTop: "10px",
    display: "flex",
    flexDirection: "column",
  },
  textarea: {
    height: "40vh",
    width: "100%",
  },
});

const setupRuntimeLogger = (setLogList) => {
  const originalLog = console.log;
  const originalError = console.error;

  const addLog = (type, ...args) => {
    const entry = {
      time: new Date(),
      type,
      message: args.map((a) => (typeof a === "object" ? JSON.stringify(a) : a)).join(" "),
    };
    //setLogList((prev) => [...prev, entry]);
    //setLogList((prev) => [...prev, entry]); // ❌ сүүлд нэмэгдсэн лог доор гардаг
setLogList((prev) => [entry, ...prev]); // ✅ дээр талд нэмэгдэнэ

  };

  console.log = (...args) => {
    addLog("log", ...args);
    originalLog(...args);
  };

  console.error = (...args) => {
    addLog("error", ...args);
    originalError(...args);
  };
};

const LogPanelFluent = () => {
  const styles = useStyles();
  const [logs, setLogs] = useState([]);
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const logContainerRef = useRef(null);

  useEffect(() => {
    setupRuntimeLogger(setLogs);
  }, []);

   // 🔸 2. scroll-г дээд тал руу автоматаар хийх useEffect
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }
  }, [logs]);

  const filteredLogs = logs.filter((log) =>
    log.message.toLowerCase().includes(search.toLowerCase())
  );

  const exportLogs = () => {
    const blob = new Blob(
      [
        filteredLogs.map((log) => `[${log.time.toLocaleTimeString()}] ${log.message}`).join("\n"),
      ],
      { type: "text/plain;charset=utf-8" }
    );

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "logs.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>📋 Үйлдлийн лог</h3>
        <div className={styles.controls}>
          <Input
            size="small"
            value={search}
            placeholder="Хайх..."
            onChange={(e, data) => setSearch(data.value)}
            style={{ flex: 1 }}
          />
          <Button   size="small" onClick={exportLogs}>📤</Button>
        </div>
      </div>

     <div className={styles.logs} ref={logContainerRef}>
        {filteredLogs.length === 0 && <p style={{ color: "#888" }}>🕒 Хайлтанд тохирсон лог олдсонгүй.</p>}
        {filteredLogs.map((log, i) => (
          <div
            key={i}
            className={styles.logItem}
            style={{ color: log.type === "error" ? "#cc0000" : "#333" }}
          >
            [{log.time.toLocaleTimeString()}] {log.message}
          </div>
        ))}
      </div>

      <div className={styles.messagePanel}>
        <Field size="large"label="📝 Message Panel">
          <Textarea
            size="large"
            className={styles.textarea}
            value={note}
            onChange={(e, data) => setNote(data.value)}
          />
        </Field>
      </div>
    </div>
  );
};

export default LogPanelFluent;
