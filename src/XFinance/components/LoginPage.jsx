import React, { useState } from "react";
import PropTypes from "prop-types";
import { Input, Button, Link, makeStyles, shorthands } from "@fluentui/react-components";
import Header from "./Header";
import { useActivityTracking } from "../hooks/useActivityTracking";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    //height: "100vh",
    backgroundColor: "#f3f3f3",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap("16px"),
    width: "300px",
    padding: "24px",
    backgroundColor: "white",
    ...shorthands.borderRadius("8px"),
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
  },
  navigationLink: {
    marginTop: "16px", // Add some space
    textAlign: "center",
  },
});

const LoginPage = ({ onLogin, onCompanySelect, onNavigateToPublic }) => {
  const styles = useStyles();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Activity tracking
  const { trackFormStart, trackFieldChange, trackSubmit } = useActivityTracking("LoginPage");

  const handleLogin = (e) => {
    e.preventDefault();
    trackFormStart();

    const defaultCompany = "data";
    onCompanySelect(defaultCompany);
    onLogin(username, password, defaultCompany);

    trackSubmit(true);
  };

  return (
    <div className={styles.root}>
      <Header logo="assets/logo-filled.png" title="XFinance" message="Системд нэвтрэх" />
      <form onSubmit={handleLogin} className={styles.form}>
        <Input
          type="text"
          placeholder="Нэвтрэх нэр"
          value={username}
          onChange={(e, data) => {
            setUsername(data.value);
            trackFieldChange("username", data.value);
          }}
          required
        />
        <Input
          type="password"
          placeholder="Нууц үг"
          value={password}
          onChange={(e, data) => {
            setPassword(data.value);
            trackFieldChange("password", "***");
          }}
          required
        />
        <Button appearance="primary" type="submit">
          Нэвтрэх
        </Button>
      </form>

      {/* Link to go back to the public main page */}
      <div className={styles.navigationLink}>
        <Link onClick={onNavigateToPublic}>Буцах</Link>
      </div>
    </div>
  );
};

LoginPage.propTypes = {
  onLogin: PropTypes.func.isRequired,
  onCompanySelect: PropTypes.func.isRequired,
  onNavigateToPublic: PropTypes.func.isRequired,
};

export default LoginPage;
