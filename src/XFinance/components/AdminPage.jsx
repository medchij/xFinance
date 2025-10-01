import React, { useState, lazy, Suspense } from "react";
import {
  Switch,
  Label,
  makeStyles,
  tokens,
  typography,
} from "@fluentui/react-components";

// Lazily load the sub-page components
const UserManagement = lazy(() => import(/* webpackChunkName: "admin-users" */ "./UserManagement"));
const RoleManagement = lazy(() => import(/* webpackChunkName: "admin-roles" */ "./RoleManagement"));
const GroupManagement = lazy(() => import(/* webpackChunkName: "admin-groups" */ "./GroupManagement"));
const PermissionManagement = lazy(() => import(/* webpackChunkName: "admin-permissions" */ "./PermissionManagement"));

const useStyles = makeStyles({
  root: {
    display: "flex",
    height: "calc(100vh - 40px)", // Adjust height to fill viewport minus padding
  },
  sidebar: {
    width: "280px",
    padding: "20px",
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    display: "flex",
    flexDirection: "column",
  },
  headerContainer: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "24px",
    paddingBottom: "10px",
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  title: {
    ...typography.title3,
    margin: 0,
  },
  menuContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  menuItem: {
    ...typography.body1,
    cursor: "pointer",
    padding: "12px 16px",
    borderRadius: tokens.borderRadiusMedium,
    "&:hover": {
      backgroundColor: tokens.colorSubtleBackgroundHover,
    },
    "&[data-active='true']": {
        backgroundColor: tokens.colorBrandBackground,
        color: tokens.colorBrandForegroundOnLight,
        fontWeight: tokens.fontWeightSemiBold,
        "&:hover": {
            backgroundColor: tokens.colorBrandBackgroundHover,
        }
    },
    "&[aria-disabled]": {
        cursor: "not-allowed",
        color: tokens.colorNeutralForegroundDisabled,
        backgroundColor: tokens.colorSubtleBackground,
    },
  },
  content: {
    flexGrow: 1,
    padding: "20px 40px",
    overflowY: "auto",
  },
});

const AdminPage = () => {
  const styles = useStyles();
  const [activeSection, setActiveSection] = useState("Users");
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  const handleToggleChange = (ev) => {
    setIsMaintenanceMode(ev.currentTarget.checked);
  };

  const renderSection = () => {
    if (isMaintenanceMode) {
      return <div>Засварын горимд байна.</div>;
    }
    switch (activeSection) {
      case "Users":
        return <UserManagement />;
      case "Roles":
        return <RoleManagement />;
      case "UserGroups":
        return <GroupManagement />;
      case "Permissions":
        return <PermissionManagement />;
      default:
        return <UserManagement />;
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.sidebar}>
        <div className={styles.headerContainer}>
          <Switch 
            size="large" 
            checked={isMaintenanceMode}
            onChange={handleToggleChange}
          />
          <h2 className={styles.title}>{isMaintenanceMode ? "Засварт байгаа" : "Админ"}</h2>
        </div>
        <div className={styles.menuContainer}>
          <div 
            className={styles.menuItem} 
            data-active={activeSection === "Users"}
            onClick={() => !isMaintenanceMode && setActiveSection("Users")}
            aria-disabled={isMaintenanceMode}>
            Хэрэглэгч
          </div>
          <div 
            className={styles.menuItem} 
            data-active={activeSection === "Roles"}
            onClick={() => !isMaintenanceMode && setActiveSection("Roles")}
            aria-disabled={isMaintenanceMode}>
            Ажил үүрэг
          </div>
          <div 
            className={styles.menuItem} 
            data-active={activeSection === "UserGroups"}
            onClick={() => !isMaintenanceMode && setActiveSection("UserGroups")}
            aria-disabled={isMaintenanceMode}>
            Хэрэглэгчийн бүлэг
          </div>
          <div 
            className={styles.menuItem} 
            data-active={activeSection === "Permissions"}
            onClick={() => !isMaintenanceMode && setActiveSection("Permissions")}
            aria-disabled={isMaintenanceMode}>
            Эрхийн удирдлага
          </div>
        </div>
      </div>
      <div className={styles.content}>
        <Suspense fallback={<div>Ачааллаж байна...</div>}>
          {renderSection()}
        </Suspense>
      </div>
    </div>
  );
};

export default AdminPage;
