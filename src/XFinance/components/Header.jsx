import * as React from "react";
import PropTypes from "prop-types";
import { Image, tokens, makeStyles } from "@fluentui/react-components";

const useStyles = makeStyles({
  welcome__header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingBottom: "30px",
    paddingTop: "100px",
    backgroundColor: tokens.colorNeutralBackground3,
  },
  message: {
    fontSize: tokens.fontSizeHero900,
    fontWeight: tokens.fontWeightRegular,
    color: tokens.colorNeutralForeground1, // ✅ зөв өнгө
    maxWidth: "90%", // ✅ дэлгэцээс хэтрэхгүй
    textAlign: "center", // ✅ төвд
    wordBreak: "break-word", // ✅ үг тасалж хугалах
    lineHeight: "1.4",
    marginTop: "16px",
  },
});

const Header = ({ title, logo, message }) => {
  const styles = useStyles();

  return (
    <section className={styles.welcome__header}>
      <Image width="90" height="90" src={logo} alt={title} />
      <h1 className={styles.message}>{message}</h1>
    </section>
  );
};

Header.propTypes = {
  title: PropTypes.string,
  logo: PropTypes.string,
  message: PropTypes.string,
};

export default Header;
