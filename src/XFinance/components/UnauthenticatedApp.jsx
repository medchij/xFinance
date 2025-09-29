import React, { useState, lazy, Suspense } from "react";
import { Button, tokens, makeStyles } from "@fluentui/react-components";

// Lazy-load хийх компонентууд
const LoginPage = lazy(() => import(/* webpackChunkName: "page-login" */ "./LoginPage"));
const MainContent = lazy(() => import(/* webpackChunkName: "page-main" */ "./maincontent"));

const useStyles = makeStyles({
  wrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minHeight: "100vh",
    backgroundColor: tokens.colorNeutralBackground3, // Фон өнгө
  },
  buttonContainer: {
    padding: "20px",
    backgroundColor: "white", // Товчны арын дэвсгэр
    width: "100%",
    textAlign: "center",
    boxShadow: "0 -2px 4px rgba(0,0,0,0.1)", // Сүүдэр
    marginTop: "auto", // Доор байрлуулна
  },
});

const UnauthenticatedApp = () => {
  const styles = useStyles();
  // "main" эсвэл "login" гэсэн 2 төлөвтэй
  const [activeUnauthPage, setActiveUnauthPage] = useState("main"); 

  const navigateToLogin = () => setActiveUnauthPage("login");
  const navigateToMain = () => setActiveUnauthPage("main");

  return (
    <Suspense fallback={<div style={{ padding: 12 }}>Түр хүлээгээрэй…</div>}>
      {activeUnauthPage === "login" && (
        <LoginPage onNavigateMain={navigateToMain} />
      )}

      {activeUnauthPage === "main" && (
        <div className={styles.wrapper}>
          <MainContent title="XFinance" isPublic={true} />
          <div className={styles.buttonContainer}>
              <Button appearance="primary" onClick={navigateToLogin}>
                  Системд нэвтрэх
              </Button>
          </div>
        </div>
      )}
    </Suspense>
  );
};

export default UnauthenticatedApp;
