import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  Button,
  Input,
  Dropdown,
  Option,
  Switch,
  Text,
  Badge,
  Spinner,
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  makeStyles,
  shorthands,
  tokens,
} from "@fluentui/react-components";
import { ArrowSync16Regular, Delete16Regular, Dismiss16Regular } from "@fluentui/react-icons";
import logger from "../utils/logger";
import { BASE_URL } from "../../config";
import { useModalTracking } from "../hooks/useActivityTracking";
import activityTracker from "../utils/activityTracker"; // Consistent import

const useStyles = makeStyles({
  dialogSurface: {
    width: "98vw",
    maxWidth: "1800px",
    height: "98vh",
    ...shorthands.padding("12px"),
    display: "flex",
    flexDirection: "column",
  },
  controlsContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "12px",
    flexWrap: "wrap",
    gap: "8px",
    flexShrink: 0,
    "@media (max-width: 768px)": {
      flexDirection: "column",
      alignItems: "stretch",
    },
  },
  controlGroup: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    flexWrap: "wrap",
    "@media (max-width: 768px)": {
      justifyContent: "space-between",
      width: "100%",
    },
  },
  switchContainer: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  tableContainer: {
    flex: 1,
    height: "100%",
    minHeight: 0,
    overflowY: "auto",
    overflowX: "auto",
    ...shorthands.border("2px", "solid", tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground1,
    marginTop: "8px",
    marginBottom: "8px",
  },
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
    minHeight: "300px",
  },
  emptyContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
    minHeight: "300px",
    flexDirection: "column",
    gap: "12px",
  },
  timestampCell: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: "12px",
    width: "140px",
    minWidth: "120px",
    fontWeight: tokens.fontWeightSemibold,
    whiteSpace: "nowrap",
    ...shorthands.padding("8px", "12px"),
  },
  levelCell: {
    width: "80px",
    minWidth: "70px",
    textAlign: "center",
    ...shorthands.padding("8px"),
  },
  messageCell: {
    wordBreak: "break-word",
    fontSize: "13px",
    width: "auto",
    flex: "1 1 300px",
    lineHeight: "1.4",
    whiteSpace: "normal",
    ...shorthands.padding("8px", "12px"),
    maxWidth: "600px",
  },
  userCell: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorBrandForeground1,
    width: "100px",
    minWidth: "80px",
    fontSize: "12px",
    whiteSpace: "nowrap",
    ...shorthands.padding("8px"),
  },
  serviceCell: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: "11px",
    color: tokens.colorNeutralForeground3,
    width: "80px",
    minWidth: "60px",
    whiteSpace: "nowrap",
    ...shorthands.padding("8px"),
  },
});

const LogViewer = ({ isOpen, onClose }) => {
  const styles = useStyles();
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Activity tracking
  // const activityTracker = ActivityTracker.getInstance(); // Commented out - using imported instance
  useModalTracking("LogViewer", isOpen);

  // API base
  const API_BASE = BASE_URL || "";

  useEffect(() => {
    if (isOpen) {
      // Component нээгдэх tracking - идэвхгүй болгосон
      if (activityTracker.config?.enableComponents && activityTracker.config?.enableLogViewer) {
        activityTracker.trackComponentMount("LogViewer", { autoRefresh });
      }

      setLoading(true);
      setError(null);
      const load = async () => {
        try {
          if (activityTracker.config?.enableLogViewer) {
            activityTracker.trackUserAction("LogViewer", "Лог татаж эхэллээ", { source: "server" });
          }
          const res = await fetch(`${API_BASE}/api/logs?limit=100`);
          if (!res.ok) throw new Error("Серверээс лог татаж чадсангүй");
          const data = await res.json();
          if (data && Array.isArray(data.logs) && data.logs.length >= 0) {
            setLogs(data.logs);
            if (activityTracker.config?.enableLogViewer) {
              activityTracker.trackUserAction("LogViewer", "Серверээс лог татсан", {
                logCount: data.logs.length,
                source: "server",
              });
            }
            return;
          }
          setLogs(logger.getLogs());
          if (activityTracker.config?.enableLogViewer) {
            activityTracker.trackUserAction("LogViewer", "Local лог ашиглав", { source: "local" });
          }
        } catch (e) {
          setLogs(logger.getLogs());
          if (activityTracker.config?.enableLogViewer) {
            activityTracker.trackUserAction("LogViewer", "Лог татахад алдаа", {
              error: e.message,
              fallback: "local",
            });
          }
        } finally {
          setLoading(false);
        }
      };
      load();

      // Auto-refresh
      let interval;
      if (autoRefresh) {
        interval = setInterval(() => {
          refreshLogs();
        }, 5000);
      }

      return () => {
        if (interval) clearInterval(interval);
        // Component хаагдах tracking - идэвхгүй болгосон
        if (activityTracker.config?.enableComponents && activityTracker.config?.enableLogViewer) {
          activityTracker.trackComponentUnmount("LogViewer");
        }
      };
    } else {
      // Modal хаагдсан tracking - идэвхгүй болгосон
      if (isOpen === false && activityTracker.config?.enableModals && activityTracker.config?.enableLogViewer) {
        activityTracker.trackModalClose("LogViewer");
      }
    }
  }, [isOpen]); // autoRefresh dependency хасав, component tracking-д хэрэггүй

  const refreshLogs = async () => {
    if (activityTracker.config?.enableLogViewer) {
      activityTracker.trackButtonClick("Сэргээх", "LogViewer", { autoRefresh });
      activityTracker.trackApiCall("LogViewer", "refreshLogs", "GET", "/api/logs?limit=100");
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/logs?limit=100`);
      if (res.ok) {
        const data = await res.json();
        setLogs((data && data.logs) || []);
        if (activityTracker.config?.enableLogViewer) {
          activityTracker.trackUserAction("LogViewer", "Лог амжилттай сэргээгдсэн", {
            logCount: data?.logs?.length || 0,
          });
        }
      } else {
        setLogs(logger.getLogs());
        if (activityTracker.config?.enableLogViewer) {
          activityTracker.trackUserAction("LogViewer", "Серверээс лог татахад алдаа, local ашиглав");
        }
      }
    } catch (e) {
      setLogs(logger.getLogs());
      if (activityTracker.config?.enableLogViewer) {
        activityTracker.trackUserAction("LogViewer", "Лог сэргээхэд алдаа", { error: e.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const clearAllLogs = () => {
    if (activityTracker.config?.enableLogViewer) {
      activityTracker.trackButtonClick("Цэвэрлэх", "LogViewer", { currentLogCount: logs.length });
    }
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/api/logs`, {
      method: "DELETE",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Лог цэвэрлэж чадсангүй");
        return res.json();
      })
      .then(() => {
        setLogs([]);
        if (activityTracker.config?.enableLogViewer) {
          activityTracker.trackUserAction("LogViewer", "Бүх лог амжилттай цэвэрлэгдсэн");
        }
      })
      .catch((err) => {
        setError(err.message);
        activityTracker.trackUserAction("LogViewer", "Лог цэвэрлэхэд алдаа", { error: err.message });
      })
      .finally(() => setLoading(false));
  };

  const filteredLogs = logs
    .filter((log) => filter === "all" || (log.level && log.level.toLowerCase() === filter))
    .filter((log) => {
      const logUser = log.user || (log.data && log.data.user) || "anonymous";
      return userFilter === "all" || logUser === userFilter;
    })
    .filter(
      (log) =>
        searchTerm === "" ||
        (log.message && log.message.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.data && JSON.stringify(log.data).toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .slice(-100)
    .reverse();

  // Get unique users from logs for filter dropdown
  const uniqueUsers = [...new Set(logs.map((log) => log.user || (log.data && log.data.user) || "anonymous"))].sort();

  const getBadgeAppearance = (level) => {
    switch (level?.toLowerCase()) {
      case "error":
        return "important"; // Улаан
      case "warn":
        return "caution"; // Шар/Улбар шар
      case "info":
        return "informative"; // Цэнхэр
      case "debug":
        return "subtle"; // Саарал
      case "success":
        return "brand"; // Ногоон
      default:
        return "outline";
    }
  };

  // Level-ийн нэмэлт style
  const getLevelStyle = (level) => {
    switch (level?.toLowerCase()) {
      case "error":
        return {
          backgroundColor: tokens.colorPaletteRedBackground2,
          color: tokens.colorPaletteRedForeground1,
          fontWeight: tokens.fontWeightBold,
        };
      case "warn":
        return {
          backgroundColor: tokens.colorPaletteYellowBackground2,
          color: tokens.colorPaletteYellowForeground1,
          fontWeight: tokens.fontWeightSemibold,
        };
      case "info":
        return {
          backgroundColor: tokens.colorPaletteBlueBa,
          color: tokens.colorPaletteBlueForeground1,
          fontWeight: tokens.fontWeightMedium,
        };
      case "debug":
        return {
          backgroundColor: tokens.colorNeutralBackground3,
          color: tokens.colorNeutralForeground2,
          fontWeight: tokens.fontWeightRegular,
        };
      case "success":
        return {
          backgroundColor: tokens.colorPaletteGreenBackground2,
          color: tokens.colorPaletteGreenForeground1,
          fontWeight: tokens.fontWeightSemibold,
        };
      default:
        return {};
    }
  };

  // Row-ийн background өнгө level-ийн дагуу
  const getRowStyle = (level) => {
    switch (level?.toLowerCase()) {
      case "error":
        return { backgroundColor: tokens.colorPaletteRedBackground1 };
      case "warn":
        return { backgroundColor: tokens.colorPaletteYellowBackground1 };
      case "info":
        return { backgroundColor: tokens.colorPaletteBlueBackground1 };
      case "success":
        return { backgroundColor: tokens.colorPaletteGreenBackground1 };
      default:
        return {};
    }
  };
  const formatMessage = (log) => {
    if (!log.message) {
      return JSON.stringify(log, null, 2);
    }

    // Хэрэв message нь array байвал
    if (Array.isArray(log.message)) {
      return `[Array(${log.message.length})] ${JSON.stringify(log.message)}`;
    }

    // Хэрэв message нь object байвал array элементүүдийг шалгах
    if (typeof log.message === "object") {
      try {
        return JSON.stringify(
          log.message,
          (key, value) => {
            if (Array.isArray(value)) {
              return `[Array(${value.length})] ${JSON.stringify(value)}`;
            }
            return value;
          },
          2
        );
      } catch (e) {
        return String(log.message);
      }
    }

    // Үндсэн message
    let message = String(log.message);

    // Data-г message дээр нэмэх
    if (log.data && typeof log.data === "object") {
      const dataEntries = [];

      Object.keys(log.data).forEach((key) => {
        const value = log.data[key];

        // Эдгээр техникийн талбаруудыг алгасъя
        if (["sessionId", "activityCount", "timestamp", "category", "action", "url", "userAgent"].includes(key)) {
          return;
        }

        if (Array.isArray(value)) {
          dataEntries.push(`${key}: [${value.length} items]`);
        } else if (typeof value === "object" && value !== null) {
          try {
            const objStr = JSON.stringify(value);
            if (objStr.length > 50) {
              dataEntries.push(`${key}: {...}`);
            } else {
              dataEntries.push(`${key}: ${objStr}`);
            }
          } catch (e) {
            dataEntries.push(`${key}: [object]`);
          }
        } else if (value !== undefined && value !== null) {
          dataEntries.push(`${key}: ${value}`);
        }
      });

      if (dataEntries.length > 0) {
        message += ` | ${dataEntries.join(", ")}`;
      }
    }

    return message;
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface className={styles.dialogSurface}>
        <DialogTitle style={{ fontSize: "20px", fontWeight: "bold", textAlign: "center", margin: "0 0 12px 0" }}>
          � Програмын Лог
        </DialogTitle>
        <DialogBody style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, padding: 0 }}>
          <div className={styles.controlsContainer}>
            <div className={styles.controlGroup}>
              <Dropdown
                placeholder="Төрлөөр шүүх"
                value={filter}
                onOptionSelect={(_, data) => {
                  setFilter(data.optionValue);
                  activityTracker.trackFilter("level", data.optionValue, filteredLogs.length);
                }}
              >
                <Option value="all">🔍 Бүх төрөл</Option>
                <Option value="error">🔴 Алдаа</Option>
                <Option value="warn">🟡 Сэрэмжлүүлэг</Option>
                <Option value="info">🔵 Мэдээлэл</Option>
                <Option value="debug">⚪ Debug</Option>
                <Option value="success">🟢 Амжилт</Option>
              </Dropdown>
              <Dropdown
                placeholder="Хэрэглэгчээр шүүх"
                value={userFilter}
                onOptionSelect={(_, data) => {
                  setUserFilter(data.optionValue);
                  activityTracker.trackFilter("user", data.optionValue, filteredLogs.length);
                }}
              >
                <Option value="all">Бүх хэрэглэгч</Option>
                {uniqueUsers.map((user) => (
                  <Option key={user} value={user}>
                    {user}
                  </Option>
                ))}
              </Dropdown>
              <Input
                placeholder="Хайх..."
                value={searchTerm}
                onChange={(_, data) => {
                  setSearchTerm(data.value);
                  if (data.value.length > 2) {
                    activityTracker.trackSearch("log", data.value, filteredLogs.length);
                  }
                }}
                style={{
                  minWidth: "200px",
                  flexGrow: 1,
                  maxWidth: "300px",
                }}
              />
            </div>
            <div className={styles.controlGroup}>
              <div className={styles.switchContainer}>
                <Switch
                  checked={autoRefresh}
                  onChange={(_, data) => {
                    setAutoRefresh(data.checked);
                    if (activityTracker.config?.enableLogViewer) {
                      activityTracker.trackUserAction("LogViewer", "Auto-refresh өөрчлөгдсөн", {
                        enabled: data.checked,
                      });
                    }
                  }}
                />
                <Text size={200}>{autoRefresh ? "Автомат" : "Гараар"}</Text>
              </div>
              <Button icon={<ArrowSync16Regular />} onClick={refreshLogs} disabled={loading}>
                Сэргээх
              </Button>
              <Button icon={<Delete16Regular />} onClick={clearAllLogs} disabled={loading} appearance="primary">
                Цэвэрлэх
              </Button>
            </div>
          </div>

          <div className={styles.tableContainer}>
            {loading ? (
              <div className={styles.loadingContainer}>
                <Spinner label="Лог ачааллаж байна..." />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className={styles.emptyContainer}>
                <Text size={400} weight="semibold">
                  Лог олдсонгүй
                </Text>
                <Text size={300}>Шүүлтүүрээ өөрчилж дахин оролдоно уу.</Text>
              </div>
            ) : (
              <Table
                size="small"
                aria-label="Логийн хүснэгт - Бүрэн дэлгэрэнгүй харуулах"
                style={{
                  width: "100%",
                  minWidth: "600px",
                  tableLayout: "auto",
                  borderCollapse: "separate",
                  borderSpacing: 0,
                }}
              >
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell className={styles.timestampCell}>
                      <Text size={100} weight="bold">
                        🕐 Цаг
                      </Text>
                    </TableHeaderCell>
                    <TableHeaderCell className={styles.levelCell}>
                      <Text size={100} weight="bold">
                        📊 Төрөл
                      </Text>
                    </TableHeaderCell>
                    <TableHeaderCell className={styles.messageCell}>
                      <Text size={100} weight="bold">
                        💬 Мэдээлэл
                      </Text>
                    </TableHeaderCell>
                    <TableHeaderCell className={styles.userCell}>
                      <Text size={100} weight="bold">
                        👤 Хэрэглэгч
                      </Text>
                    </TableHeaderCell>
                    <TableHeaderCell className={styles.serviceCell}>
                      <Text size={100} weight="bold">
                        ⚙️ Сервис
                      </Text>
                    </TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log, index) => (
                    <TableRow
                      key={index}
                      style={{
                        ...getRowStyle(log.level),
                        borderLeft: `4px solid ${
                          log.level?.toLowerCase() === "error"
                            ? tokens.colorPaletteRedBorder1
                            : log.level?.toLowerCase() === "warn"
                              ? tokens.colorPaletteYellowBorder1
                              : log.level?.toLowerCase() === "info"
                                ? tokens.colorPaletteBlueBorder1
                                : log.level?.toLowerCase() === "success"
                                  ? tokens.colorPaletteGreenBorder1
                                  : tokens.colorNeutralStroke2
                        }`,
                      }}
                    >
                      <TableCell className={styles.timestampCell}>
                        <Text size={100}>{log.timestamp || "N/A"}</Text>
                      </TableCell>
                      <TableCell className={styles.levelCell}>
                        <Badge appearance={getBadgeAppearance(log.level)} size="small" style={getLevelStyle(log.level)}>
                          {log.level?.toUpperCase() || "INFO"}
                        </Badge>
                      </TableCell>
                      <TableCell className={styles.messageCell}>
                        <Text size={100} style={{ whiteSpace: "pre-wrap" }}>
                          {formatMessage(log)}
                        </Text>
                      </TableCell>
                      <TableCell className={styles.userCell}>
                        <Text size={100} weight="semibold">
                          {log.user || (log.data && log.data.user) || "anonymous"}
                        </Text>
                      </TableCell>
                      <TableCell className={styles.serviceCell}>
                        <Text size={100}>{log.service || "client"}</Text>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          {error && (
            <Text style={{ color: tokens.colorPaletteRedForeground1, marginTop: "8px" }}>❌ Алдаа: {error}</Text>
          )}
        </DialogBody>
        <DialogActions>
          <Button onClick={onClose} icon={<Dismiss16Regular />}>
            Хаах
          </Button>
        </DialogActions>
      </DialogSurface>
    </Dialog>
  );
};

export default LogViewer;
