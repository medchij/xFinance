import React, { useState, useEffect } from "react";
import PropTypes from 'prop-types';
import {
  Input,
  Button,
  Link,
  makeStyles,
  shorthands,
  Dropdown,
  Option,
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
    marginTop: "16px", // Add some space
    textAlign: "center",
  }
});

const LoginPage = ({ onLogin, onCompanySelect, onNavigateToPublic }) => {
  const styles = useStyles();
  const { showMessage } = useAppContext();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);

  useEffect(() => {
    // Fetch the list of companies from the backend
    const fetchCompanies = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/companies`);
        if (!response.ok) {
          throw new Error('Failed to fetch companies');
        }
        const data = await response.json();
        setCompanies(data);
        if (data.length > 0) {
            // Set default company, e.g., the first one
            setSelectedCompany(data[0]);
        }
      } catch (error) {
        showMessage(`❌ Компанийн жагсаалт авахад алдаа гарлаа: ${error.message}`);
      }
    };

    fetchCompanies();
  }, [showMessage]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!selectedCompany) {
        showMessage("⚠️ Та компаниа сонгоно уу!");
        return;
    }
    onCompanySelect(selectedCompany); // Pass selected company to AppContext
    onLogin(username, password, selectedCompany); // Pass it to the login function as well
  };
  
  const handleOptionSelect = (event, data) => {
    const selectedValue = data.optionValue;
    setSelectedCompany(selectedValue);
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
        {companies.length > 0 && (
            <Dropdown 
                placeholder="Компани сонгох"
                value={selectedCompany}
                onOptionSelect={handleOptionSelect}
            >
                {companies.map((company) => (
                    <Option key={company} value={company}>
                        {company.charAt(0).toUpperCase() + company.slice(1)}
                    </Option>
                ))}
            </Dropdown>
        )}

        <Button appearance="primary" type="submit">Нэвтрэх</Button>
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
