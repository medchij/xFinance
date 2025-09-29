import * as React from "react";
import PropTypes from "prop-types";
import { Image, tokens, makeStyles, Button } from "@fluentui/react-components";

const useStyles = makeStyles({
  headerContainer: {
    position: "relative", // For positioning the login button
    backgroundColor: tokens.colorNeutralBackground3,
    paddingTop: "40px", // Adjust padding
    paddingBottom: "30px",
  },
  welcome__header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  loginButton: {
    position: "absolute",
    top: "15px",
    right: "15px",
  },
  message: {
    fontSize: tokens.fontSizeHero900,
    fontWeight: tokens.fontWeightRegular,
    color: tokens.colorNeutralForeground1,
    maxWidth: "90%",
    textAlign: "center",
    wordBreak: "break-word",
    lineHeight: "1.4",
    marginTop: "16px",
  },
});

const Header = ({ title, logo, message, isPublic, onNavigateToLogin }) => {
  const styles = useStyles();

  return (
    <section className={styles.headerContainer}>
      {isPublic && (
        <Button 
          appearance="primary"
          className={styles.loginButton} 
          onClick={onNavigateToLogin}
        >
          Нэвтрэх
        </Button>
      )}
      <div className={styles.welcome__header}>
        <Image width="90" height="90" src={logo} alt={title} />
        <h1 className={styles.message}>{message}</h1>
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
};

export default Header;
