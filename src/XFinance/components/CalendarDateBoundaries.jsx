import * as React from "react";
import { Calendar } from "@fluentui/react-calendar-compat";
import { setActiveCellValue2 } from "../xFinance";
import { useAppContext } from "./AppContext";
//import Notification from "./Notification";

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const addMonths = (date, months) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

const addYears = (date, years) => {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
};

const CalendarDateBoundaries = () => {
  const today = new Date();
  const minDate = addMonths(today, -1);
  const maxDate = addYears(today, 1);
  const restrictedDates = [
    addDays(today, -2),
    addDays(today, -8),
    addDays(today, 2),
    addDays(today, 8),
  ];

 const [selectedDate, setSelectedDate] = React.useState(new Date()); // always defined
  const { setLoading, showMessage } = useAppContext();

  const onSelectDate = React.useCallback(async (date) => {
    setSelectedDate(date);

    if (!(date instanceof Date) || isNaN(date.getTime())) {
      showMessage("❌ Огноо буруу байна.");
      return;
    }

    const formatted = date.toLocaleDateString("en-CA");
    await setActiveCellValue2(formatted, showMessage, setLoading);
  }, [setLoading, showMessage]);

  return (
    <div style={{ padding: "20px" }}>
      <Calendar
        highlightSelectedMonth
        //showGoToToday={false}
        //minDate={minDate}
        //maxDate={maxDate}
        //restrictedDates={restrictedDates}
        onSelectDate={onSelectDate}
        value={selectedDate || undefined}
      />

 
    </div>
  );
};

export default CalendarDateBoundaries;
