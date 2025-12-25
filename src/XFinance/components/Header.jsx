import * as React from "react";
import { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { Image, tokens, makeStyles, Button, Badge, Menu, MenuTrigger, MenuPopover, MenuList, MenuItem, MenuDivider } from "@fluentui/react-components";
import { PersonRegular, BuildingRegular, SignOutRegular, SettingsRegular, BookmarkMultiple20Regular } from "@fluentui/react-icons";
import { useAppContext } from "./AppContext";
import { BASE_URL } from "../../config";

const useStyles = makeStyles({
  headerContainer: {
    position: "fixed",
    top: "0",
    left: "0",
    right: "0",
    zIndex: 1000,
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
    gap: "4px",
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

const Header = ({ title, logo, message, isPublic, onNavigateToLogin, currentUser, onNavigateToProfile, onNavigateToSettings, isSidebarOpen = false, onOpenStories }) => {
  const styles = useStyles();
  const { companies, selectedCompany, setSelectedCompany, selectedRoleId, setSelectedRoleId, logout } = useAppContext();
  const [userRoles, setUserRoles] = useState([]);
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url);

  // Detect environment
  const isLocalHost = typeof window !== "undefined" && /^localhost$|^127(\.\d+){3}$/.test(window.location.hostname);
  const isDevelopment = isLocalHost || (typeof window !== "undefined" && window.location.port === "3000");

  // Listen for avatar updates from Profile component
  useEffect(() => {
    const handleUserUpdated = (event) => {
      if (event.detail?.avatar_url !== undefined) {
        setAvatarUrl(event.detail.avatar_url);
      }
    };

    window.addEventListener('userUpdated', handleUserUpdated);
    return () => window.removeEventListener('userUpdated', handleUserUpdated);
  }, []);

  // Update avatar URL when currentUser changes
  useEffect(() => {
    setAvatarUrl(currentUser?.avatar_url);
  }, [currentUser?.avatar_url]);

  // Fetch user roles
  useEffect(() => {
    if (currentUser && currentUser.id) {
      fetchUserRoles(currentUser.id);
    }
  }, [currentUser]);

  const fetchUserRoles = async (userId) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${BASE_URL}/api/users/${userId}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const roles = await response.json();
        setUserRoles(roles);
        // If no role selected yet, select the first one
        if (!selectedRoleId && roles.length > 0) {
          handleRoleChange(roles[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching user roles:", err);
    }
  };

  const handleCompanyChange = (company) => {
    if (company) {
      setSelectedCompany(company.name);
    }
  };

  const handleRoleChange = (roleId) => {
    setSelectedRoleId(roleId);
    localStorage.setItem('selectedRoleId', roleId.toString());
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
          <div style={{ position: "absolute", right: "15px", top: "8px", display: "flex", alignItems: "center", gap: "4px" }}>
            {/* Компани сонгох dropdown */}
            {companies && companies.length > 0 && (
              <Menu>
                <MenuTrigger disableButtonEnhancement>
                  <Button
                    appearance="subtle"
                    style={{
                      fontSize: tokens.fontSizeBase200,
                      color: tokens.colorNeutralForeground1,
                      padding: "6px 12px",
                    }}
                  >
                    {selectedCompany && typeof selectedCompany === 'string' 
                      ? selectedCompany
                      : selectedCompany?.name
                      || 'Компани'} ▼
                  </Button>
                </MenuTrigger>
                <MenuPopover>
                  <MenuList>
                    <div style={{ padding: '8px 12px', fontSize: tokens.fontSizeBase300, fontWeight: tokens.fontWeightSemibold, color: tokens.colorNeutralForeground2 }}>
                      Компани сонгох
                    </div>
                    {companies.map((company) => (
                      <MenuItem
                        key={company.id}
                        onClick={() => handleCompanyChange(company)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {selectedCompany === company.name && <span>✓</span>}
                          <span>{company.name}</span>
                        </div>
                      </MenuItem>
                    ))}
                  </MenuList>
                </MenuPopover>
              </Menu>
            )}

            {/* Ажил үүргийн dropdown */}
            {userRoles && userRoles.length > 0 && selectedRoleId && (
              <Menu>
                <MenuTrigger disableButtonEnhancement>
                  <Button
                    appearance="subtle"
                    style={{
                      fontSize: tokens.fontSizeBase200,
                      color: tokens.colorNeutralForeground1,
                      padding: "6px 12px",
                    }}
                  >
                    {userRoles.find(r => r.id === selectedRoleId)?.name || "Үүрэг"} ▼
                  </Button>
                </MenuTrigger>
                <MenuPopover>
                  <MenuList>
                    <div style={{ padding: '8px 12px', fontSize: tokens.fontSizeBase300, fontWeight: tokens.fontWeightSemibold, color: tokens.colorNeutralForeground2 }}>
                      Ажил үүрэг сонгох
                    </div>
                    {userRoles.map((role) => (
                      <MenuItem
                        key={role.id}
                        onClick={() => handleRoleChange(role.id)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {selectedRoleId === role.id && <span>✓</span>}
                          <span>{role.name}</span>
                        </div>
                      </MenuItem>
                    ))}
                  </MenuList>
                </MenuPopover>
              </Menu>
            )}
            
            {/* Хэрэглэгчийн аватар меню */}
            <Menu>
              <MenuTrigger disableButtonEnhancement>
                <div
                  className={styles.userAvatar}
                  style={{
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease',
                  }}
                  title="Профайл"
                >
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl.startsWith('data:') ? avatarUrl : `${BASE_URL}${avatarUrl}`} 
                      alt="Avatar" 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        borderRadius: '50%',
                        objectFit: 'cover',
                        cursor: 'pointer'
                      }} 
                    />
                  ) : (
                    (currentUser.name || currentUser.username || 'Х').charAt(0).toUpperCase()
                  )}
                </div>
              </MenuTrigger>
              <MenuPopover>
                <MenuList>
                  {/* Story товч */}
                  <MenuItem onClick={onOpenStories} icon={<BookmarkMultiple20Regular />} className={styles.menuItem}>
                    Өнөөдрийн ажлууд
                  </MenuItem>

                  <MenuDivider />
                  
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
                  
                  {/* Тохиргооны холбоос */}
                  {onNavigateToSettings && (
                    <MenuItem onClick={onNavigateToSettings} icon={<SettingsRegular />} className={styles.menuItem}>
                      Тохиргоо
                    </MenuItem>
                  )}
                  
                  {/* Гарах */}
                  <MenuItem onClick={handleLogout} icon={<SignOutRegular />} className={styles.menuItem}>
                    Гарах
                  </MenuItem>
                </MenuList>
              </MenuPopover>
            </Menu>
          </div>
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
  onNavigateToSettings: PropTypes.func,
  isSidebarOpen: PropTypes.bool,
  onOpenStories: PropTypes.func,
};

export default Header;
