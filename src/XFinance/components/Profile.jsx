import React, { useEffect, useState } from "react";
import { BASE_URL } from "../../config";
import {
  Dropdown,
  Option,
  Field,
  tokens,
  Spinner, // For loading state
} from "@fluentui/react-components";
import { useAppContext } from "./AppContext";
import Header from "./Header";

const Profile = ({ isSidebarOpen }) => {
  const { dataDir, setDataDir, showMessage } = useAppContext();
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the list of available companies from the new database endpoint
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`${BASE_URL}/api/companies`);
        if (!res.ok) {
          throw new Error("Серверээс компаниудын жагсаалтыг татахад алдаа гарлаа.");
        }
        const fetchedCompanies = await res.json();
        setCompanies(fetchedCompanies);

        // If no company is currently selected in the context, set the first one as default.
        if (!dataDir && fetchedCompanies.length > 0) {
          setDataDir(fetchedCompanies[0].id);
        }
        
      } catch (error) {
        console.error("Failed to fetch companies:", error);
        showMessage(`❌ Компани татахад алдаа гарлаа: ${error.message}`, 5000);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanies();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setDataDir, showMessage]); // dataDir is intentionally omitted to avoid re-fetching when it changes. We only want to fetch once.

  const handleCompanyChange = (_, data) => {
    if (data.optionValue) {
      setDataDir(data.optionValue);
      showMessage(`🏢 ${data.optionValue} компанид шилжлээ.`, 3000);
    }
  };

  return (
    <div
      style={{
        flexGrow: 1,
        backgroundColor: tokens.colorNeutralBackground1,
        minHeight: "100vh",
        marginLeft: isSidebarOpen ? 250 : 50,
        transition: "margin-left 0.3s ease-in-out",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header
        logo="assets/logo-filled.png"
        message={dataDir ? `Та ${dataDir} орчинд байна` : "Компани сонгоно уу"}
      />

      <div
        style={{
          background: "#fff",
          padding: "24px",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          margin: "20px",
        }}
      >
        <h2 style={{ marginBottom: "16px" }}>Компани Сонголт</h2>
        
        {isLoading ? (
          <Spinner label="Компаниудыг ачааллаж байна..." />
        ) : (
          <Field 
            label="Таны ажиллах боломжтой компаниуд"
            style={{ maxWidth: "400px" }}
          >
            <Dropdown
              value={dataDir || ""}
              onOptionSelect={handleCompanyChange}
              placeholder="Компани сонгоно уу..."
              disabled={companies.length === 0}
            >
              {companies.map((company) => (
                <Option key={company.id} value={company.id}>
                  {company.name}
                </Option>
              ))}
            </Dropdown>
          </Field>
        )}
        
        {companies.length === 0 && !isLoading && (
            <p style={{color: tokens.colorPaletteRedBackground3}}>⚠️ Мэдээллийн санд компани бүртгэгдээгүй байна. `setup-database.js` скриптийг ажиллуулна уу.</p>
        )}

      </div>
    </div>
  );
};

export default Profile;
