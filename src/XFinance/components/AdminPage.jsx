import React, { useState, lazy, Suspense } from "react";
import PropTypes from "prop-types";
import { 
  Switch, 
  Text,
  Title3,
  Caption1,
  makeStyles, 
  tokens,
  Card,
  Spinner,
  TabList,
  Tab,
} from "@fluentui/react-components";
import { 
  People24Regular, 
  ShieldTask24Regular,
  Settings24Regular,
} from "@fluentui/react-icons";
import { useAppContext } from "./AppContext";

// Lazily load the sub-page components
const UserManagement = lazy(() => import(/* webpackChunkName: "admin-users" */ "./UserManagement"));
const RoleManagement = lazy(() => import(/* webpackChunkName: "admin-roles" */ "./RoleManagement"));

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 32px",
    backgroundColor: "white",
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    boxShadow: tokens.shadow2,
    flexWrap: "wrap",
    gap: "12px",
    "@media (max-width: 768px)": {
      padding: "12px 16px",
      flexDirection: "column",
      alignItems: "flex-start",
    },
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    "@media (max-width: 768px)": {
      gap: "8px",
    },
  },
  headerIcon: {
    fontSize: "28px",
    color: tokens.colorBrandForeground1,
    "@media (max-width: 768px)": {
      fontSize: "24px",
    },
  },
  headerContent: {
    display: "flex",
    flexDirection: "column",
  },
  headerTitle: {
    fontSize: "20px",
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    lineHeight: "28px",
    "@media (max-width: 768px)": {
      fontSize: "16px",
    },
  },
  headerSubtitle: {
    fontSize: "13px",
    color: tokens.colorNeutralForeground3,
    "@media (max-width: 768px)": {
      fontSize: "12px",
    },
  },
  maintenanceToggle: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 16px",
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: "6px",
    "@media (max-width: 768px)": {
      width: "100%",
      padding: "8px 12px",
      justifyContent: "space-between",
    },
  },
  tabContainer: {
    backgroundColor: "white",
    borderBottom: `2px solid ${tokens.colorNeutralStroke2}`,
    paddingLeft: "32px",
    overflow: "auto",
    "@media (max-width: 768px)": {
      paddingLeft: "0",
      paddingRight: "16px",
    },
  },
  content: {
    flex: 1,
    padding: "24px 32px",
    backgroundColor: "#f5f5f5",
    overflowY: "auto",
    "@media (max-width: 768px)": {
      padding: "16px",
    },
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "400px",
    gap: "16px",
  },
  maintenanceContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 20px",
    textAlign: "center",
    backgroundColor: "white",
    borderRadius: "12px",
    boxShadow: tokens.shadow8,
    "@media (max-width: 768px)": {
      padding: "40px 16px",
      borderRadius: "8px",
    },
  },
  maintenanceIcon: {
    fontSize: "64px",
    marginBottom: "20px",
    "@media (max-width: 768px)": {
      fontSize: "48px",
      marginBottom: "16px",
    },
  },
});

const AdminPage = ({ isSidebarOpen }) => {
  const styles = useStyles();
  const { hasPermission, selectedRoleId } = useAppContext();
  const [activeSection, setActiveSection] = useState("Users");
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  const handleToggleChange = (ev) => {
    setIsMaintenanceMode(ev.currentTarget.checked);
  };

  const renderSection = () => {
    // If no role selected, show message
    if (!selectedRoleId) {
      return (
        <div className={styles.maintenanceContainer}>
          <div className={styles.maintenanceIcon}>👤</div>
          <Title3>Ажил үүрэг сонгоно уу</Title3>
          <Caption1 style={{ marginTop: "8px", color: tokens.colorNeutralForeground3 }}>
            Админ хуудас руу хандахын өмнө дээд баруун буланд байгаа цэснээс өөрийн ажил үүргээ сонгоно уу
          </Caption1>
        </div>
      );
    }

    if (isMaintenanceMode) {
      return (
        <div className={styles.maintenanceContainer}>
          <div className={styles.maintenanceIcon}>🔧</div>
          <Title3>Засварын горимд байна</Title3>
          <Caption1 style={{ marginTop: "8px", color: tokens.colorNeutralForeground3 }}>
            Систем засвар үйлчилгээнд байгаа тул түр хүлээнэ үү
          </Caption1>
        </div>
      );
    }
    switch (activeSection) {
      case "Users":
        return <UserManagement />;
      case "Roles":
        return <RoleManagement />;
      default:
        return <UserManagement />;
    }
  };

  return (
    <div 
      className={styles.root}
      style={{
        marginLeft: isSidebarOpen ? 180 : 50,
        width: isSidebarOpen ? "calc(100% - 180px)" : "calc(100% - 50px)",
        transition: "margin-left 0.3s ease-in-out, width 0.3s ease-in-out",
      }}
    >
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Settings24Regular className={styles.headerIcon} />
          <div className={styles.headerContent}>
            <div className={styles.headerTitle}>Удирдлагын самбар</div>
            <div className={styles.headerSubtitle}>Систем тохиргоо, эрх удирдлага</div>
          </div>
        </div>

        <div className={styles.maintenanceToggle}>
          <Switch 
            checked={isMaintenanceMode} 
            onChange={handleToggleChange}
          />
          <Text size={300} weight="semibold">
            {isMaintenanceMode ? "🔧 Засварын горим" : "✅ Ажиллаж байна"}
          </Text>
        </div>
      </div>

      <div className={styles.tabContainer}>
        <TabList 
          selectedValue={activeSection}
          onTabSelect={(_, data) => !isMaintenanceMode && setActiveSection(data.value)}
          size="large"
        >
          {hasPermission("manage_users") && (
            <Tab 
              value="Users" 
              icon={<People24Regular />}
              disabled={isMaintenanceMode}
            >
              Хэрэглэгчид
            </Tab>
          )}
          {hasPermission("manage_roles") && (
            <Tab 
              value="Roles" 
              icon={<ShieldTask24Regular />}
              disabled={isMaintenanceMode}
            >
              Ажил үүрэг
            </Tab>
          )}
        </TabList>
      </div>

      <div className={styles.content}>
        <Suspense fallback={
          <div className={styles.loadingContainer}>
            <Spinner size="extra-large" label="Ачааллаж байна..." />
          </div>
        }>
          {renderSection()}
        </Suspense>
      </div>
    </div>
  );
};

AdminPage.propTypes = {
  isSidebarOpen: PropTypes.bool,
};

export default AdminPage;
