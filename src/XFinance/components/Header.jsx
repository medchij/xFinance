import * as React from "react";
import PropTypes from "prop-types";
import { Image, tokens, makeStyles, Button, Badge } from "@fluentui/react-components";

const useStyles = makeStyles({
  headerContainer: {
    position: "relative", // For positioning the login button
    backgroundColor: tokens.colorNeutralBackground3,
    paddingTop: "20px", // Зайг багасгав
    paddingBottom: "16px", // Зайг багасгав
  },
  controlsSection: {
    position: "relative",
    height: "40px", // Хяналтын хэсгийн өндөр
    marginBottom: "12px", // Доорх хэсэгтэй зай
  },
  separator: {
    width: "80%",
    height: "1px",
    backgroundColor: tokens.colorNeutralStroke2,
    margin: "0 auto 16px auto", // Доор margin нэмэв
    opacity: 0.6,
  },
  welcome__header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  loginButton: {
    position: "absolute",
    top: "8px",
    right: "15px",
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightMedium,
    color: tokens.colorNeutralForeground1,
    backgroundColor: "transparent",
    border: "none",
    "&:hover": {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  userInfo: {
    position: "absolute",
    top: "8px",
    right: "15px",
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightMedium,
    color: tokens.colorNeutralForeground1,
    backgroundColor: "transparent", // Дэвсгэр өнгийг авав
    padding: "6px 12px",
    borderRadius: tokens.borderRadiusSmall,
    border: "none", // Хүрээг авав
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
    display: "flex",
    alignItems: "center",
    gap: "8px", // Зураг болон текстийн хоорондох зай
    "&:hover": {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  userAvatar: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
    flexShrink: 0, // Багасахгүй
  },
  envBadge: {
    position: "absolute",
    top: "8px",
    left: "15px",
  },
  message: {
    fontSize: tokens.fontSizeHero900,
    fontWeight: tokens.fontWeightRegular,
    color: tokens.colorNeutralForeground1,
    maxWidth: "90%",
    textAlign: "center",
    wordBreak: "break-word",
    lineHeight: "1.4",
    marginTop: "8px", // Зайг багасгав
  },
});

const Header = ({ title, logo, message, isPublic, onNavigateToLogin, currentUser, onNavigateToProfile }) => {
  const styles = useStyles();

  // Detect environment
  const isLocalHost = typeof window !== "undefined" && /^localhost$|^127(\.\d+){3}$/.test(window.location.hostname);
  const isDevelopment = isLocalHost || (typeof window !== "undefined" && window.location.port === "3000");

  return (
    <section className={styles.headerContainer + " fluent-Header-headerContainer"}>
      {/* ===================== Хяналтын товчнууд ===================== */}
      <div className={styles.controlsSection}>
        {isDevelopment && (
          <Badge appearance="filled" color="danger" className={styles.envBadge}>
            🔧 Development
          </Badge>
        )}
        {isPublic ? (
          <Button appearance="transparent" className={styles.loginButton} onClick={onNavigateToLogin}>
            Нэвтрэх
          </Button>
        ) : currentUser ? (
          <div className={styles.userInfo} onClick={onNavigateToProfile}>
            <div className={styles.userAvatar}>
              {(currentUser.name || currentUser.username || 'Х').charAt(0).toUpperCase()}
            </div>
            <div>
              {currentUser.name || currentUser.username || 'Хэрэглэгч'}
              {currentUser.role && (
                <span style={{ 
                  marginLeft: "8px", 
                  fontSize: tokens.fontSizeBase100, 
                  opacity: 0.8 
                }}>
                  ({currentUser.role})
                </span>
              )}
            </div>
          </div>
        ) : null}
      </div>
      {/* ============================================================= */}
      
      {/* Тусгаарлах зураас */}
      <div className={styles.separator}></div>
      
      {/* ===================== Logo болон Гарчиг ==================== */}
      <div className={styles.welcome__header + " fluent-Header-welcome__header"}>
        <Image width="70" height="70" src={logo} alt={title} />
        <h1 className={styles.message + " fluent-Header-message"}>{message}</h1>
      </div>
    </section>
  );
};

Header.propTypes = {
  title: PropTypes.string,
  logo: PropTypes.string,
  message: PropTypes.string,
  isPublic: PropTypes.bool,
  onNavigateToLogin: PropTypes.func,
  currentUser: PropTypes.object,
  onNavigateToProfile: PropTypes.func,
};

export default Header;
