import React, { useEffect, useState, useCallback } from "react";
import { BASE_URL } from "../../config";
import {
  Dropdown,
  Option,
  Field,
  tokens,
  Spinner,
} from "@fluentui/react-components";
import { useAppContext } from "./AppContext";
import Header from "./Header";

const Profile = ({ isSidebarOpen }) => {
  // REFACTOR: Use selectedCompany instead of dataDir
  const { selectedCompany, setSelectedCompany, showMessage } = useAppContext();
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the list of available companies from the database
  const fetchCompanies = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${BASE_URL}/api/companies`);
      if (!res.ok) {
        throw new Error("Серверээс компаниудын жагсаалтыг татахад алдаа гарлаа.");
      }
      const fetchedCompanies = await res.json();
      setCompanies(fetchedCompanies);

      // If no company is currently selected, and we have companies, prompt the user.
      // Don't automatically select one.
      if (!selectedCompany && fetchedCompanies.length > 0) {
          showMessage("⚠️ Ажиллах компаниа сонгоно уу.", 0);
      }

    } catch (error) {
      console.error("Failed to fetch companies:", error);
      showMessage(`❌ Компани татахад алдаа гарлаа: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCompany, setSelectedCompany, showMessage]); // Add dependencies

  useEffect(() => {
    fetchCompanies();
  }, []); // Fetch only once on component mount

  const handleCompanyChange = (_, data) => {
    if (data.optionValue) {
      // REFACTOR: Update selectedCompany state
      setSelectedCompany(data.optionValue);
      showMessage(`🏢 ${data.optionValue} компанид шилжлээ.`);
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
        // REFACTOR: Update header message
        message={selectedCompany ? `Та ${selectedCompany} орчинд байна` : "Компани сонгоогүй байна"}
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
              // REFACTOR: Use selectedCompany for the value
              value={selectedCompany || ""}
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
          <p style={{ color: tokens.colorPaletteRedBackground3 }}>
            ⚠️ Мэдээллийн санд компани бүртгэгдээгүй байна. `setup-database.js` скриптийг ажиллуулна уу.
          </p>
        )}
      </div>
    </div>
  );
};

export default Profile;
