import React, { useState } from "react";
import PropTypes from 'prop-types';
import {
  Input,
  Button,
  Link,
  makeStyles,
  shorthands,
} from "@fluentui/react-components";
import { useAppContext } from "./AppContext";
import Header from "./Header";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
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
    marginTop: "8px",
    textAlign: "center",
  }
});

const LoginPage = ({ onNavigateMain }) => { // onNavigateMain prop-г хүлээн авна
  const styles = useStyles();
  const { login } = useAppContext();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    login(username, password);
  };

  return (
    <div className={styles.root}>
      <Header logo="assets/logo-filled.png" title="XFinance" message="Системд нэвтрэх" />
      <form onSubmit={handleLogin} className={styles.form}>
        <Input
          type="text"
          placeholder="Нэвтрэх нэр"
          value={username}
          onChange={(e, data) => setUsername(data.value)}
          required
        />
        <Input
          type="password"
          placeholder="Нууц үг"
          value={password}
          onChange={(e, data) => setPassword(data.value)}
          required
        />
        <Button appearance="primary" type="submit">Нэвтрэх</Button>
      </form>
       {/* Үндсэн хуудас руу шилжих холбоос */}
       <div className={styles.navigationLink}>
          <Link onClick={onNavigateMain}>Үндсэн хуудас руу буцах</Link>
        </div>
    </div>
  );
};

LoginPage.propTypes = {
    onNavigateMain: PropTypes.func.isRequired
}

export default LoginPage;
