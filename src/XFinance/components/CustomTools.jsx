import React, { useRef, useState, useEffect } from "react";
import { useActivityTracking } from "../hooks/useActivityTracking";
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
import AccountDateDialog from "./AccountDateDialog";
import BankSelectDialog from "./BankSelectDialog";
import {
  NumberSymbol16Regular,
  TextField16Regular,
  ArrowSwap16Regular,
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
  GlobeSearchRegular,
  SearchSparkleFilled,
  DocumentBulletListMultiple20Regular,
  DocumentData20Regular,
  Payment20Regular,
  DocumentArrowLeft20Regular,
  PeopleList20Regular,
  ArrowSync20Regular,
  DocumentSettings20Regular,
  Calculator20Regular,
  DocumentCheckmark20Regular,
  TextWordCountRegular,
} from "@fluentui/react-icons";
import CalendarDateBoundaries from "./CalendarDateBoundaries";
import { ExcelIcon, KhanbankIcon } from "../../icons";
import SearchTableSheet from "./SearchTableSheet";
import activityTracker from "../utils/activityTracker";

const groupedTools = [
  {
    title: "Хөрвүүлэх хэрэгсэл",
    tools: [
      { icon: <NumberSymbol16Regular />, label: "Тоо руу хөрвүүлэх" },
      { icon: <TextField16Regular />, label: "Текст рүү хөрвүүлэх" },
      { icon: <CalendarLtr16Regular />, label: "Date convert" },
      { icon: <ArrowSwap16Regular />, label: "Тоог сөрөг болгох" },
      { icon: <TextWordCountRegular />, label: "Тоог текст болгох" },
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
      { icon: <TargetArrow16Regular />, label: "Goal seek" },
      { icon: <TargetArrow16Regular />, label: "Multi Goal seek" },
      { icon: <TableCalculatorRegular />, label: "Динамик хүснэгт" },
      { icon: <ArrowSort16Regular />, label: "Хааны хуулга янзлах" },
      { icon: <ExcelIcon />, label: "Сонгосон мужийг экпорт хийх" },
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
      { icon: <GlobeSearchRegular />, label: "Ибан лавлах" },
    ],
  },
  {
    title: "Ebarimt хэрэгслүүд",
    tools: [{ icon: <DocumentTableSearchRegular />, label: "РД-аар ҮА лавлах" },
            { icon: <SearchSparkleFilled />, label: "РД-аар Нэр лавлах" },
    ],
    
  },
  {
    title: "Дансны удирдлага",
    tools: [
      { icon: <Add16Regular />, label: "ЕДД данс үүсгэх" },
      { icon: <AddCircle16Regular />, label: "Данс үүсгэх" },
      { icon: <AddSquare16Regular />, label: "Харилцагч үүсгэх" },
      { icon: <DocumentTableSearchRegular />, label: "Дансны мэдээлэл бичих" },

    ],
  },
  {
    title: "Поларис автоматжуулалт",
    tools: [
      { icon: <DocumentBulletListMultiple20Regular />, label: "PS Зээлийн баланс" },
      { icon: <DocumentData20Regular />, label: "PS Зээлийн олголт" },
      { icon: <Payment20Regular />, label: "PS Зээлийн төлөлт" },
      { icon: <DocumentArrowLeft20Regular />, label: "PS Зээлийн зориулалт, хугацаа" },
      { icon: <PeopleList20Regular />, label: "Топ 40 зээлийн тайлан" },
      { icon: <ArrowSync20Regular />, label: "Зээлийн данс лавлах" },
      { icon: <DocumentTableSearchRegular />, label: "Зээлийн жагсаалт татах" },
      { icon: <DocumentTableSearchRegular />, label: "Харилцагчийн жагсаалт татах" },
     
    ],
  },
  {
    title: "Өдрийн мэдээ автоматжуулалт",
    tools: [
      { icon: <DocumentSettings20Regular />, label: "Daily бэлтгэл" },
      { icon: <Calculator20Regular />, label: "GI Daily тооцоолол" },
      { icon: <DocumentCheckmark20Regular />, label: "AP Daily тооцоолол" },
      
    ],
  },
];

const CustomTools = ({ isSidebarOpen }) => {
  const { setLoading, showMessage, searchData, fetchSearchData } = useAppContext();
  const [activeModal, setActiveModal] = useState(null);
  const [isNarrowScreen, setIsNarrowScreen] = useState(false);
  const [dialogResult, setDialogResult] = useState(null);
  // Хайх товч дарахад дуудагдана
  const handleDialogSearch = async ({ account, fromDate, toDate }) => {
    try {
      return await efns.fetchKhanbankReceiptFromSheet(showMessage, setLoading, { account, fromDate, toDate });
    } catch (e) {
      showMessage(e.message || "Алдаа гарлаа.");
    }
    // setActiveModal(null) устгав: dialog-ыг шууд хаахгүй
  };
  const activity = useActivityTracking();
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
    "Date convert": () => fns.handleDateConversion(showMessage, setLoading),
    "Тоог сөрөг болгох": () => fns.handleNegativeConversion(showMessage, setLoading),
    "Тоог текст болгох": () => fns.handleNumberToWordsConversion(showMessage, setLoading),
    "Динамик хүснэгт": () => setActiveModal("searchTableSheet"),
    "Албан ханш татах": () => efns.fetchCurrencyRatesByAPI(showMessage, setLoading),
    "Машины мэдээлэл татах": () => efns.fetchVehicleInfoByPlate(showMessage, setLoading),
    "Хааны token татах": () => efns.getKhanbankToken(showMessage, setLoading),
    "Хааны хуулга татах": () => setActiveModal("AccountDateDialog"),
    "Хааны данс лавлах": () => efns.fetchKhanbankAccountInfo(showMessage, setLoading),
    "Ибан лавлах": () => setActiveModal("generateIban"),
    "РД-аар ҮА лавлах": () => bFns.getMerchantCategoryById(showMessage, setLoading),
    "РД-аар Нэр лавлах": () => bFns.getMerchantInfoBatch(showMessage, setLoading),
    "Идэвхитэй нүдээр шүүлт хийх": () => fns.filterByActiveCellValue(showMessage, setLoading),
    "Шүүлт арилгах": () => fns.clearAutoFilter(showMessage, setLoading),
    // "Өнгөөр ялгах": () => fns.highlightCellsByColor(showMessage, setLoading),
    "Paste value": () => fns.pasteValuesOnly(showMessage, setLoading),
    "Сонгосон мужийг экпорт хийх": () => fns.exportSelectedRangesToXLSX(showMessage, setLoading),
    "Идэвхитэй нүдэнд огноо оруулах": () => setActiveModal("calendar"),
    "PS Зээлийн баланс": () => pfns.runLoanReportProcessor(showMessage, setLoading),
    "PS Зээлийн олголт": () => pfns.processLoanPrepData(showMessage, setLoading),
    "PS Зээлийн төлөлт": () => pfns.loanpaymentData(showMessage, setLoading),
    "PS Зээлийн зориулалт, хугацаа": () => pfns.extractLoanPurposeAndTerm(showMessage, setLoading),
    "Топ 40 зээлийн тайлан": () => pfns.processTop40LoanReport(showMessage, setLoading),
    "Daily бэлтгэл": () => pfns.processBalanceReconciliation(showMessage, setLoading),
    "GI Daily тооцоолол": () => pfns.GIprocessFinancialReport(showMessage, setLoading),
    "AP Daily тооцоолол": () => pfns.APprocessFinancialReport(showMessage, setLoading),
    "Зээлийн данс лавлах": () => pfns.fetchPolarisLoanData(showMessage, setLoading),
    "Зээлийн жагсаалт татах": () => pfns.fetchPolarisLoanList(showMessage, setLoading),
    "Харилцагчийн жагсаалт татах": () => pfns.fetchPolarisCustomerList(showMessage, setLoading),
    "ЕДД данс үүсгэх": () => setActiveModal("createGL"),
    "Данс үүсгэх": () => setActiveModal("createAccount"),
    "Харилцагч үүсгэх": () => setActiveModal("createCustomer"),
    "Дансны мэдээлэл бичих": async () => {
      if (!searchData.account || searchData.account.length === 0) {
        showMessage("⏳ Дансны мэдээлэл татаж байна...");
        await fetchSearchData();
        if (!searchData.account || searchData.account.length === 0) {
          showMessage("⚠️ Дансны мэдээлэл татаж чадсангүй.");
          return;
        }
      }
      fns.writeAccountDataToSelectedRange(searchData.account, showMessage, setLoading);
    },
  };
  // Dialog-оос утга авсны дараа fetchKhanbankReceiptFromSheet-г дуудна
  useEffect(() => {
    if (dialogResult) {
      efns.fetchKhanbankReceiptFromSheet(showMessage, setLoading, dialogResult);
      setDialogResult(null);
    }
  }, [dialogResult, showMessage, setLoading]);
  const handleClick = async (label) => {
    activityTracker.trackUserAction("CustomTools", label, { type: "tool", label });
    await withLoading(setLoading, showMessage, async () => {
      await actions[label]?.();
    });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isNarrowScreen ? "column" : "row",
        alignItems: "flex-start",
        justifyContent: "center",
        gap: isNarrowScreen ? 12 : 20,
        minHeight: "100vh",
        backgroundColor: "#f3f4f6",
        maxWidth: "100%",
        overflowX: "hidden",
        boxSizing: "border-box",
        padding: "12px 16px",
        paddingLeft: isSidebarOpen ? 196 : 56,
        transition: "padding-left 0.3s ease-in-out",
      }}
    >
      {activeModal === "AccountDateDialog" && (
        <AccountDateDialog
          open={true}
          onClose={() => setActiveModal(null)}
          onSearch={handleDialogSearch}
        />
      )}
      {/* Main content starts here, no extra wrapper div */}
      <div
        style={{
          backgroundColor: "#fff",
          padding: "10px",
          borderRadius: "4px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          width: isNarrowScreen ? "100%" : "300px",
          textAlign: "center",
          borderRight: isNarrowScreen ? "none" : "2px solid #ccc",
          minHeight: "calc(100vh - 20px)",
          marginBottom: isNarrowScreen ? "0" : "0",
          marginRight: isNarrowScreen ? "0" : "0",
          order: isNarrowScreen ? 2 : 0,
          maxWidth: "100%",
          overflowX: "hidden",
          boxSizing: "border-box",
          //margin: isNarrowScreen ? "0 auto" : "0",
        }}
      >
        <Calculator />
      </div>

      <div
        style={{
          backgroundColor: "#e5e7eb",
          padding: "16px",
          borderRadius: "4px",
          minHeight: "calc(100vh - 20px)",
          width: "100%",
          maxWidth: isNarrowScreen ? "90%" : "240px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          order: isNarrowScreen ? 1 : 0,
          //margin: isNarrowScreen ? "0 auto" : "0",
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
      <BankSelectDialog
        isOpen={activeModal === "generateIban"}
        onClose={() => setActiveModal(null)}
        onSubmit={(bankCode, accountNumber, iban) => {
          setActiveModal(null);
          showMessage(`✅ IBAN хуулагдлаа: ${iban}`);
        }}
      />
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
