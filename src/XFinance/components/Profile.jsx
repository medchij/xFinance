import React, { useEffect } from "react";
import { BASE_URL } from "../../config";
import {
  Dropdown,
  Option,
  Field,
  tokens,
  Button,
} from "@fluentui/react-components";
import { ArrowClockwise16Regular } from "@fluentui/react-icons";
import { useAppContext } from "./AppContext";
import Header from "./Header";

const Profile = ({ isSidebarOpen }) => {
  // ЗАСВАР: AppContext-ээс дата болон функцүүдийг авна
  const { 
    selectedCompany, 
    setSelectedCompany, 
    showMessage, 
    companies, 
    fetchCompanies, 
    loading 
  } = useAppContext();

  // Компонент анх ачааллахад кэш ашиглан датаг дуудна.
  useEffect(() => {
    fetchCompanies(false);
  }, [fetchCompanies]);

  const handleCompanyChange = (_, data) => {
    if (data.optionValue) {
      setSelectedCompany(data.optionValue);
      showMessage(`🏢 ${data.optionValue} компанид шилжлээ.`);
    }
  };

  // Сэргээх товч дарахад дуудагдана (force=true)
  const handleRefresh = () => {
    fetchCompanies(true);
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
        {/* ЗАСВАР: Сэргээх товчтой толгой хэсэг */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "16px" }}>
          <h2>Компани Сонголт</h2>
          <Button 
            icon={<ArrowClockwise16Regular />} 
            appearance="subtle" 
            onClick={handleRefresh} 
            aria-label="Сэргээх"
            disabled={loading}
          />
        </div>

        {/* Global loading state ашиглана */}
        {loading && companies.length === 0 ? (
          null
        ) : (
          <Field
            label="Таны ажиллах боломжтой компаниуд"
            style={{ maxWidth: "400px" }}
          >
            <Dropdown
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

        {companies.length === 0 && !loading && (
          <p style={{ color: tokens.colorPaletteRedBackground3 }}>
            ⚠️ Мэдээллийн санд компани бүртгэгдээгүй байна. `setup-database.js` скриптийг ажиллуулна уу.
          </p>
        )}
      </div>
    </div>
  );
};

export default Profile;
