import React, { useState } from "react";
import LoginPage from "./LoginPage";
import MainContent from "./maincontent";

const UnauthenticatedApp = ({ onLogin, onCompanySelect }) => {
  // State to toggle between login and public view
  const [showLogin, setShowLogin] = useState(false);

  const handleNavigateToLogin = () => {
    setShowLogin(true);
  };

  const handleNavigateToPublic = () => {
    setShowLogin(false);
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      padding: "24px",
      backgroundColor: "#f3f4f6"
    }}>
      {showLogin ? (
        <LoginPage 
          onLogin={onLogin} 
          onCompanySelect={onCompanySelect} 
          onNavigateToPublic={handleNavigateToPublic} 
        />
      ) : (
        // Pass a function to MainContent to allow it to trigger navigation
        <MainContent isPublic={true} onNavigateToLogin={handleNavigateToLogin} />
      )}
    </div>
  );
};

export default UnauthenticatedApp;
