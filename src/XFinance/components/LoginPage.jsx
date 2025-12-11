import React, { useState } from "react";
import PropTypes from "prop-types";
import { Input, Button, Link, Text, makeStyles, shorthands } from "@fluentui/react-components";
import { useActivityTracking } from "../hooks/useActivityTracking";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    backgroundColor: "#f3f3f3",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    ...shorthands.gap("16px"),
    width: "250px",
    padding: "24px",
    backgroundColor: "white",
    ...shorthands.borderRadius("8px"),
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
  },
  navigationLink: {
    marginTop: "16px", // Add some space
    textAlign: "center",
    marginBottom: "24px",
  },
});

const LoginPage = ({ onLogin, onCompanySelect, onNavigateToPublic }) => {
  const styles = useStyles();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Activity tracking
  const { trackFormStart, trackFieldChange, trackSubmit } = useActivityTracking("LoginPage");

  const handleLogin = (e) => {
    e.preventDefault();
    trackFormStart();

    const defaultCompany = "dataNany";
    onCompanySelect(defaultCompany);
    onLogin(username, password, defaultCompany);

    trackSubmit(true);
  };

  if (showForgotPassword) {
    // Forgot Password хуудас харуулах
    const ForgotPassword = require('./ForgotPassword').default;
    return <ForgotPassword onBackToLogin={() => setShowForgotPassword(false)} />;
  }

  return (
    <div className={styles.root}>
      <form onSubmit={handleLogin} className={styles.form}>
        <Text size={500} weight="semibold" align="center" style={{ marginBottom: '8px' }}>
          Нэвтрэх
        </Text>
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
        
        {/* Forgot Password линк */}
        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <Link onClick={() => setShowForgotPassword(true)} style={{ fontSize: '14px' }}>
            Нууц үг мартсан уу?
          </Link>
        </div>
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
