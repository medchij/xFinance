import React, { useState } from "react";
import {
  Home24Regular,
  ArrowSwap24Regular,
  DocumentArrowDown24Regular,
  Search24Regular,
  Globe24Regular,
  Settings24Regular,
  Chat24Regular,
  PersonCircle24Regular,
  Wrench24Regular,
  ChevronLeft24Regular,
  ChevronRight24Regular,
} from "@fluentui/react-icons";
import { Button } from "@fluentui/react-components";
import TransactionModal from "./TransactionModal";
import ConfirmationDialog from "./ConfirmationDialog";
import SearchAccount from "./SearchAccount";
import SheetSelectorDialog from "./SheetSelectorDialog";
import { writeToImportSheet, handleFileImport } from "../xFinance";
import { useAppContext } from "./AppContext";


const SidebarItem = ({ icon, text, isOpen, onClick }) => (
  <li style={{ width: "100%", marginBottom: "4px" }}>
    <Button
      onClick={onClick}
      appearance="transparent"
      icon={icon}
      style={{
        justifyContent: isOpen ? "flex-start" : "center",
        width: "100%",
        padding: "12px 20px",
        textAlign: "left",
        color: "#333",
      }}
    >
      {isOpen && text}
    </Button>
  </li>
);

const Sidebar = ({ isOpen, toggleSidebar, setActivePage }) => {
  const [manualToggle, setManualToggle] = useState(false);
  const [isTransactionOpen, setTransactionOpen] = useState(false);
  const [isConfirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [isSheetDialogOpen, setSheetDialogOpen] = useState(false);
  const [sheetData, setSheetData] = useState();
  const [selectedSheet, setSelectedSheet] = useState(null);
  //const [selectedSheetName, setSelectedSheetName] = useState(null);


  const { setLoading, showMessage } = useAppContext();

  // const handleMouseEnter = () => {
  //   if (!manualToggle) toggleSidebar(true);
  // };

  // const handleMouseLeave = () => {
  //   if (!manualToggle) toggleSidebar(false);
  // };

  const handleToggleClick = () => {
    setManualToggle(!manualToggle);
    toggleSidebar(!isOpen);
  };

  const handleImportClick = (event) => {
    if (!selectedSheet) {
      showMessage("⚠️ Эхлээд sheet сонгоно уу!");
      return;
    }
    handleFileImport(event, {
      sheetName: selectedSheet,
      setLoading,
      setSheetData,
      setConfirmDialogOpen,
      setImportStatus: () => {},
      setErrorMessage: showMessage,
      setSheetDialogOpen,
    });
  };

  return (
    <>
      <div
        // onMouseEnter={handleMouseEnter}
        // onMouseLeave={handleMouseLeave}
        style={{
          width: isOpen ? "250px" : "50px",
          height: "100vh",
          background: "#f3f3f3",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "10px 0",
          transition: "width 0.3s ease-in-out",
          overflow: "hidden",
          position: "fixed",
          left: 0,
          top: 0,
          boxShadow: "2px 0 5px rgba(0, 0, 0, 0.1)",
          zIndex: 1000,
        }}
      >
        <ul style={{ listStyle: "none", width: "100%", padding: 0, margin: 0 }}>
          <SidebarItem
            icon={<Home24Regular />}
            text="Нүүр хуудас"
            isOpen={isOpen}
            onClick={() => setActivePage("maincontent")}
          />
          <SidebarItem
            icon={<ArrowSwap24Regular />}
            text="Гүйлгээ хийх"
            isOpen={isOpen}
            onClick={() => setTransactionOpen(true)}
          />
          <SidebarItem
            icon={<DocumentArrowDown24Regular />}
            text="Import Sheet"
            isOpen={isOpen}
            onClick={() => setSheetDialogOpen(true)}
          />
          <SidebarItem
            icon={<Wrench24Regular />}
            text="Нэмэлтүүд"
            isOpen={isOpen}
            onClick={() => setActivePage("CustomTools")}
          />
          <SidebarItem
            icon={<Search24Regular />}
            text="Дансны хайлт"
            isOpen={isOpen}
            onClick={() => setSearchOpen(true)}
          />
          <SidebarItem
            icon={<Settings24Regular />}
            text="Settings"
            isOpen={isOpen}
            onClick={() => setActivePage("settings")}
          />

          <SidebarItem
            icon={<Globe24Regular />}
            text="browser"
            isOpen={isOpen}
            onClick={() => setActivePage("browser")}
          />
       
          <SidebarItem icon={<Chat24Regular />} text="Messages" isOpen={isOpen} />
        </ul>

        <input
          type="file"
          id="fileInput"
          accept=".xlsx, .xls"
          style={{ display: "none" }}
          onChange={handleImportClick}
        />

        <Button
          appearance="transparent"
          icon={<PersonCircle24Regular />}
          style={{
            width: "100%",
            justifyContent: isOpen ? "flex-start" : "center",
            padding: "12px 20px",
            marginTop: "auto",
            marginBottom: "20px",
          }}
          onClick={() => setActivePage("profile")}
        >
          {isOpen && "Profile"}
        </Button>
      </div>

      <button
        onClick={handleToggleClick}
        style={{
          position: "fixed",
          top: "20px",
          left: isOpen ? "250px" : "50px",
          transform: "translateY(-50%)",
          background: "#fff",
          border: "none",
          cursor: "pointer",
          fontSize: "14px",
          padding: "10px 15px",
          borderRadius: "0 20% 20% 0",
          boxShadow: "2px 2px 5px rgba(0,0,0,0.1)",
          transition: "left 0.3s ease-in-out",
          zIndex: 1001,
        }}
      >
        {isOpen ? <ChevronLeft24Regular /> : <ChevronRight24Regular />}
      </button>

      <TransactionModal isOpen={isTransactionOpen} onClose={() => setTransactionOpen(false)} />
      <SearchAccount isOpen={isSearchOpen} onClose={() => setSearchOpen(false)} />
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        onClose={async (confirmed) => {
          setLoading(true);
          try {
            const { message, success } = await writeToImportSheet(
              selectedSheet, // 🎯 SheetSelector-с авсан нэр
              sheetData,
              confirmed,
              setLoading,
              showMessage
            );
            showMessage(message, success ? "success" : "error");
          } catch (error) {
            showMessage("❌ Алдаа гарлаа: " + error.message);
          } finally {
            setConfirmDialogOpen(false);
            setLoading(false);
          }
        }}
      />
   

      <SheetSelectorDialog
        isOpen={isSheetDialogOpen}
        onClose={() => setSheetDialogOpen(false)}
        onSelect={(sheetName) => {
          setSelectedSheet(sheetName);
          setSheetDialogOpen(false);
          document.getElementById("fileInput").click();
        }}
      />
    </>
  );
};

export default Sidebar;
