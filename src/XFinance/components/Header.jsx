import * as React from "react";
import { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { Image, tokens, makeStyles, Button, Badge, Menu, MenuTrigger, MenuPopover, MenuList, MenuItem, MenuDivider } from "@fluentui/react-components";
import { PersonRegular, BuildingRegular, SignOutRegular, SettingsRegular } from "@fluentui/react-icons";
import { useAppContext } from "./AppContext";

const useStyles = makeStyles({
  headerContainer: {
    position: "relative",
    
    backgroundColor: tokens.colorNeutralBackground3,
    paddingTop: "8px",
    paddingBottom: "8px",
  },
  controlsSection: {
    position: "relative",
    height: "40px", // Хяналтын хэсгийн өндөр - аватар багтахаар өсгөв
    marginBottom: "0px",
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
    backgroundColor: "transparent",
    padding: "6px 12px",
    borderRadius: tokens.borderRadiusSmall,
    border: "none",
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    "&:hover": {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  userAvatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    flexShrink: 0,
    cursor: "pointer",
    "&:hover": {
      opacity: 0.8,
    },
  },
  menuItem: {
    fontSize: tokens.fontSizeBase200,
  },
  companyMenuItem: {
    fontSize: tokens.fontSizeBase200,
    paddingLeft: "32px",
  },
  envBadge: {
    position: "absolute",
    top: "8px",
    left: "15px",
  },
});

const Header = ({ title, logo, message, isPublic, onNavigateToLogin, currentUser, onNavigateToProfile, isSidebarOpen = false }) => {
  const styles = useStyles();
  const { companies, selectedCompany, setSelectedCompany, logout } = useAppContext();

  // Detect environment
  const isLocalHost = typeof window !== "undefined" && /^localhost$|^127(\.\d+){3}$/.test(window.location.hostname);
  const isDevelopment = isLocalHost || (typeof window !== "undefined" && window.location.port === "3000");

  const handleCompanyChange = (company) => {
    if (company) {
      setSelectedCompany(company.name);
    }
  };

  const handleLogout = () => {
    if (logout) {
      logout();
    }
  };

  return (
    <section 
      className={styles.headerContainer + " fluent-Header-headerContainer"}
      style={{
        marginLeft: isPublic ? "0" : (isSidebarOpen ? "180px" : "50px"),
        width: isPublic ? "100%" : (isSidebarOpen ? "calc(100% - 180px)" : "calc(100% - 50px)"),
        transition: "margin-left 0.3s ease-in-out, width 0.3s ease-in-out",
      }}
    >
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
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <div className={styles.userInfo}>
                <div className={styles.userAvatar}>
                  {(currentUser.name || currentUser.username || 'Х').charAt(0).toUpperCase()}
                </div>
              </div>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                {/* Хэрэглэгчийн мэдээлэл */}
                <MenuItem onClick={onNavigateToProfile} icon={<PersonRegular />} className={styles.menuItem}>
                  <div>
                    <div style={{ fontWeight: tokens.fontWeightSemibold }}>
                      {currentUser.name || currentUser.username || 'Хэрэглэгч'}
                    </div>
                    {currentUser.role && (
                      <div style={{ fontSize: tokens.fontSizeBase100, opacity: 0.7 }}>
                        {currentUser.role}
                      </div>
                    )}
                  </div>
                </MenuItem>
                
                <MenuDivider />
                
                {/* Компаниуд */}
                {companies && companies.length > 0 && (
                  <>
                    <MenuItem disabled icon={<BuildingRegular />} className={styles.menuItem}>
                      Компани солих
                    </MenuItem>
                    {companies.map((company) => (
                      <MenuItem
                        key={company.id}
                        onClick={() => handleCompanyChange(company)}
                        className={styles.companyMenuItem}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {selectedCompany === company.name && <span>✓</span>}
                          <span>{company.name}</span>
                        </div>
                      </MenuItem>
                    ))}
                    <MenuDivider />
                  </>
                )}
                
                {/* Гарах */}
                <MenuItem onClick={handleLogout} icon={<SignOutRegular />} className={styles.menuItem}>
                  Гарах
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        ) : null}
      </div>
      {/* ============================================================= */}
      
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
  isSidebarOpen: PropTypes.bool,
};

export default Header;
