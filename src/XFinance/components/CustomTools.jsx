import React, { useRef, useState, useEffect } from "react";

import { Button, Tooltip } from "@fluentui/react-components";
import * as fns from "../xFinance";
import * as bFns from "../ebarimt";
import * as efns from "../externalAPI";
import * as pfns from "../polaris";
import { withLoading } from "../apiHelpers";
import CreateGL from "./CreateGL";
import CreateAccount from "./CreateAccount";
import CreateCustomer from "./CreateCustomer";
import { useAppContext } from "./AppContext";
import Calculator from "./Calculator";
import {
  NumberSymbol16Regular,
  ArrowSort16Regular,
  Filter16Regular,
  Eraser24Regular,
  Color16Regular,
  ClipboardPaste16Regular,
  CalendarLtr16Regular,
  TargetArrow16Regular,
  DataTrending16Regular,
  VehicleCarProfileLtr16Regular,
  MoneyHand16Regular,
  Add16Regular,
  AddCircle16Regular,
  AddSquare16Regular,
  Dismiss24Regular,
  ReceiptSearchRegular,
  DocumentTableSearchRegular,
  TableCalculatorRegular,
} from "@fluentui/react-icons";
import CalendarDateBoundaries from "./CalendarDateBoundaries";
import { ExcelIcon, KhanbankIcon } from "../../icons";
import SearchTableSheet from "./SearchTableSheet";
const groupedTools = [
  {
    title: "Хөрвүүлэх хэрэгсэл",
    tools: [
      { icon: <NumberSymbol16Regular />, label: "Тоо руу хөрвүүлэх" },
      { icon: <NumberSymbol16Regular />, label: "Текст рүү хөрвүүлэх" },
      { icon: <NumberSymbol16Regular />, label: "Тоог сөрөг болгох" },
      { icon: <ArrowSort16Regular />, label: "Хааны хуулга янзлах" },
      { icon: <ExcelIcon />, label: "Сонгосон мужийг экпорт хийх" },
    ],
  },
  {
    title: "Туслах хэрэгсэл",
    tools: [
      { icon: <Filter16Regular />, label: "Идэвхитэй нүдээр шүүлт хийх" },
      { icon: <Eraser24Regular />, label: "Шүүлт арилгах" },
      { icon: <Color16Regular />, label: "Өнгөөр ялгах" },
      { icon: <ClipboardPaste16Regular />, label: "Paste value" },
      { icon: <CalendarLtr16Regular />, label: "Идэвхитэй нүдэнд огноо оруулах" },
      { icon: <CalendarLtr16Regular />, label: "Date convert" },
      { icon: <TargetArrow16Regular />, label: "Goal seek" },
      { icon: <TargetArrow16Regular />, label: "Multi Goal seek" },
      { icon: <TableCalculatorRegular />, label: "Динамик хүснэгт" },
    ],
  },
  {
    title: "API холболтууд",
    tools: [
      { icon: <DataTrending16Regular />, label: "Албан ханш татах" },
      { icon: <VehicleCarProfileLtr16Regular />, label: "Машины мэдээлэл татах" },
      { icon: <MoneyHand16Regular />, label: "Хааны token татах" },
      { icon: <KhanbankIcon />, label: "Хааны хуулга татах" },
      { icon: <ReceiptSearchRegular />, label: "Хааны данс лавлах" },
    ],
  },
  {
    title: "Ebarimt хэрэгслүүд",
    tools: [{ icon: <DocumentTableSearchRegular />, label: "РД-аар ҮА лавлах" }],
  },
  {
    title: "Дансны удирдлага",
    tools: [
      { icon: <Add16Regular />, label: "ЕДД данс үүсгэх" },
      { icon: <AddCircle16Regular />, label: "Данс үүсгэх" },
      { icon: <AddSquare16Regular />, label: "Харилцагч үүсгэх" },
    ],
  },
  {
    title: "Поларис автоматжуулалт",
    tools: [
      { icon: <Filter16Regular />, label: "PS Зээлийн баланс" },
      { icon: <Filter16Regular />, label: "PS Зээлийн олголт" },
      { icon: <Filter16Regular />, label: "PS Зээлийн төлөлт" },
      { icon: <Filter16Regular />, label: "PS Зээлийн зориулалт, хугацаа" },
      { icon: <Filter16Regular />, label: "Топ 40 зээлийн тайлан" },
      //{ icon: <Filter16Regular />, label: "Өгөгдөл оруулах" },
    ],
  },
];

const CustomTools = ({ isSidebarOpen }) => {
  const { setLoading, showMessage } = useAppContext();
  const [activeModal, setActiveModal] = useState(null);
  const [isNarrowScreen, setIsNarrowScreen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsNarrowScreen(window.innerWidth < 500);
    };
    handleResize(); // Initial check
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const actions = {
    "Тоо руу хөрвүүлэх": () => fns.handleNumberConversion(showMessage, setLoading),
    "Текст рүү хөрвүүлэх": () => fns.handleTextConversion(showMessage, setLoading),
    "Тоог сөрөг болгох": () => fns.handleNegativeConversion(showMessage, setLoading),
    "Динамик хүснэгт": () => setActiveModal("searchTableSheet"),
    "Албан ханш татах": () => efns.fetchCurrencyRatesByAPI(showMessage, setLoading),
    "Машины мэдээлэл татах": () => efns.fetchVehicleInfoByPlate(showMessage, setLoading),
    "Хааны token татах": () => efns.getKhanbankToken(showMessage, setLoading),
    "Хааны хуулга татах": () => efns.fetchKhanbankReceiptFromSheet(showMessage, setLoading),
    "Хааны данс лавлах": () => efns.fetchKhanbankAccountInfo(showMessage, setLoading),
    "РД-аар ҮА лавлах": () => bFns.getMerchantCategoryById(showMessage, setLoading),
    "Идэвхитэй нүдээр шүүлт хийх": () => fns.filterByActiveCellValue(showMessage, setLoading),
    "Шүүлт арилгах": () => fns.clearAutoFilter(showMessage, setLoading),
    // "Өнгөөр ялгах": () => fns.highlightCellsByColor(showMessage, setLoading),
    //"Paste value": () => fns.pasteValuesOnly(showMessage, setLoading),
    "Сонгосон мужийг экпорт хийх": () => fns.exportSelectedRangesToXLSX(showMessage, setLoading),
    "Идэвхитэй нүдэнд огноо оруулах": () => setActiveModal("calendar"),
    "PS Зээлийн баланс": () => pfns.runLoanReportProcessor(showMessage, setLoading),
    "PS Зээлийн олголт": () => pfns.processLoanPrepData(showMessage, setLoading),
    "PS Зээлийн төлөлт": () => pfns.loanpaymentData(showMessage, setLoading),
    "PS Зээлийн зориулалт, хугацаа": () => pfns.extractLoanPurposeAndTerm(showMessage, setLoading),
    "Топ 40 зээлийн тайлан": () => pfns.processTop40LoanReport(showMessage, setLoading),

    "ЕДД данс үүсгэх": () => setActiveModal("createGL"),
    "Данс үүсгэх": () => setActiveModal("createAccount"),
    "Харилцагч үүсгэх": () => setActiveModal("createCustomer"),
  };

  const handleClick = async (label) => {
    await withLoading(setLoading, showMessage, async () => {
      await actions[label]?.();
    });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isNarrowScreen ? "column" : "row",
        alignItems: "stretch",
        justifyContent: "flex-start",
        minHeight: "100vh",
        backgroundColor: "#f3f4f6",
        padding: "12px",
        width: isSidebarOpen ? "calc(100% - 250px)" : "calc(85% - 50px)",
        marginLeft: isSidebarOpen ? "250px" : "50px",
        transition: "margin-left 0.3s ease-in-out, width 0.3s ease-in-out",
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          padding: "10px",
          borderRadius: "4px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          width: isNarrowScreen ? "100%" : "400px",
          textAlign: "center",
          borderRight: isNarrowScreen ? "none" : "2px solid #ccc",
          minHeight: "calc(100vh - 20px)",
          marginBottom: isNarrowScreen ? "0" : "0",
          marginRight: isNarrowScreen ? "0" : "20px",
          order: isNarrowScreen ? 2 : 0, // ⭐️ ЭНЭ ШИНЭ ЗУРААС!
        }}
      >
        <Calculator />
      </div>

      <div
        style={{
          backgroundColor: "#e5e7eb",
          padding: "20px",
          borderRadius: "4px",
          minHeight: "calc(100vh - 20px)",
          width: "100%",
          maxWidth: isNarrowScreen ? "100%" : "320px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          order: isNarrowScreen ? 1 : 0, // ⭐️ ЭНЭ ШИНЭ ЗУРААС!
        }}
      >
        {groupedTools.map((group, groupIndex) => (
          <div
            key={groupIndex}
            style={{
              width: "100%",
              backgroundColor: "#fff",
              padding: "6px",
              borderRadius: "4px",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              marginBottom: "10px",
            }}
          >
            <h3
              style={{
                textAlign: "left",
                padding: "4px 0",
                fontSize: "12px",
                fontWeight: "bold",
                color: "#333",
                marginBottom: "4px",
                borderBottom: "1px solid #ccc",
              }}
            >
              {group.title}
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                gap: "4px",
                padding: "4px",
                textAlign: "center",
              }}
            >
              {group.tools.map((tool, index) => (
                <div key={index}>
                  <Tooltip content={tool.label} relationship="label">
                    <Button
                      icon={tool.icon}
                      appearance="secondary"
                      onClick={() => handleClick(tool.label)}
                      style={{ width: "32px", height: "32px" }}
                    />
                  </Tooltip>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <CreateGL isOpen={activeModal === "createGL"} onClose={() => setActiveModal(null)} />
      <CreateAccount isOpen={activeModal === "createAccount"} onClose={() => setActiveModal(null)} />
      <CreateCustomer isOpen={activeModal === "createCustomer"} onClose={() => setActiveModal(null)} />
      <SearchTableSheet isOpen={activeModal === "searchTableSheet"} onClose={() => setActiveModal(null)} />
      {activeModal === "calendar" && (
        <div
          style={{
            position: "fixed",
            top: "10%",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            background: "#fff",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: "0px 4px 10px rgba(0,0,0,0.2)",
          }}
        >
          <Button
            icon={<Dismiss24Regular />}
            appearance="subtle"
            onClick={() => setActiveModal(null)}
            style={{ position: "absolute", top: "8px", right: "8px" }}
            aria-label="Close"
          />
          <CalendarDateBoundaries />
        </div>
      )}
    </div>
  );
};

export default CustomTools;
