import React, { useState, useEffect } from "react";

const Calculator = () => {
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState(null);
  const [operation, setOperation] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [memory, setMemory] = useState(0);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const handleKeyPress = (event) => {
      const { key } = event;

      if (key >= "0" && key <= "9") {
        inputNumber(parseInt(key));
      } else if (key === ".") {
        inputDot();
      } else if (key === "+") {
        performOperation("+");
      } else if (key === "-") {
        performOperation("-");
      } else if (key === "*") {
        performOperation("*");
      } else if (key === "/") {
        event.preventDefault();
        performOperation("/");
      } else if (key === "Enter" || key === "=") {
        performOperation("=");
      } else if (key === "Escape" || key.toLowerCase() === "c") {
        clear();
      } else if (key === "Backspace") {
        setDisplay(display.slice(0, -1) || "0");
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [display]);

  const inputNumber = (num) => {
    if (waitingForOperand) {
      setDisplay(String(num));
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? String(num) : display + num);
    }
  };

  const inputDot = () => {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
    } else if (display.indexOf(".") === -1) {
      setDisplay(display + ".");
    }
  };

  const clear = () => {
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    if (/^[0-9]*\.?[0-9]*$/.test(value) || value === "") {
      setDisplay(value || "0");
      setWaitingForOperand(false);
    }
  };

  const handlePaste = async (e) => {
    e.preventDefault();
    try {
      let pastedText = "";
      if (navigator?.clipboard && window?.isSecureContext) {
        pastedText = await navigator.clipboard.readText();
      } else {
        pastedText = (e.clipboardData || window?.clipboardData)?.getData("text") || "";
      }

      const cleanText = String(pastedText).trim();
      if (/^-?[0-9]*\.?[0-9]+$/.test(cleanText)) {
        setDisplay(cleanText);
        setWaitingForOperand(false);
      }
    } catch (err) {
      console.error("Paste алдаа:", err);
    }
  };

  const handleInputFocus = (e) => {
    e.target.select();
  };

  const copyToClipboard = async (text = display) => {
    try {
      const textToCopy = typeof text === "string" ? text : String(text);

      if (navigator?.clipboard && window?.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      const originalBg = "#f3f4f6";
      const successBg = "#10b981";
      const inputElement = document.querySelector("input");
      if (inputElement) {
        inputElement.style.backgroundColor = successBg;
        setTimeout(() => {
          inputElement.style.backgroundColor = originalBg;
        }, 200);
      }
    } catch (err) {
      console.error("Хуулах алдаа:", err);
      const textToCopy = typeof text === "string" ? text : String(text);
      alert("Хуулахад алдаа: " + textToCopy);
    }
  };

  const copyAsNumber = async () => {
    try {
      const numValue = parseFloat(display);
      await copyToClipboard(String(numValue));
    } catch (err) {
      console.error("Хуулах алдаа:", err);
    }
  };

  const copyLastResult = async () => {
    if (history.length > 0) {
      const lastHistory = history[history.length - 1];
      const result = lastHistory.split(" = ")[1];
      await copyToClipboard(result);
    }
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const memoryStore = () => {
    setMemory(parseFloat(display));
  };

  const memoryRecall = () => {
    setDisplay(String(memory));
    setWaitingForOperand(true);
  };

  const memoryClear = () => {
    setMemory(0);
  };

  const memoryAdd = () => {
    setMemory(memory + parseFloat(display));
  };

  const memorySubtract = () => {
    setMemory(memory - parseFloat(display));
  };

  const sqrt = () => {
    const result = Math.sqrt(parseFloat(display));
    setDisplay(String(result));
    setWaitingForOperand(true);
  };

  const percent = () => {
    const result = parseFloat(display) / 100;
    setDisplay(String(result));
    setWaitingForOperand(true);
  };

  const toggleSign = () => {
    if (display !== "0") {
      setDisplay(display.startsWith("-") ? display.slice(1) : "-" + display);
    }
  };

  const performOperation = (nextOperation) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);

      const historyEntry = currentValue + " " + operation + " " + inputValue + " = " + newValue;
      setHistory((prev) => [...prev, historyEntry]);

      setDisplay(String(newValue));
      setPreviousValue(newValue);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = (firstValue, secondValue, operation) => {
    switch (operation) {
      case "+":
        return firstValue + secondValue;
      case "-":
        return firstValue - secondValue;
      case "*":
        return firstValue * secondValue;
      case "/":
        return firstValue / secondValue;
      case "=":
        return secondValue;
      default:
        return secondValue;
    }
  };

  const buttonStyle = {
    width: "50px",
    height: "40px",
    margin: "1px",
    fontSize: "14px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    cursor: "pointer",
    backgroundColor: "#f9fafb",
    fontWeight: "bold",
  };

  const operatorStyle = {
    ...buttonStyle,
    backgroundColor: "#3b82f6",
    color: "white",
  };

  const memoryStyle = {
    ...buttonStyle,
    backgroundColor: "#10b981",
    color: "white",
    fontSize: "12px",
  };

  const functionStyle = {
    ...buttonStyle,
    backgroundColor: "#f59e0b",
    color: "white",
    fontSize: "12px",
  };

  return (
    <div style={{ padding: "15px", maxWidth: "320px", margin: "0 auto" }}>
      <h3 style={{ textAlign: "center", marginBottom: "15px", fontSize: "16px" }}>
        Тооны машин {memory !== 0 && <span style={{ color: "#10b981" }}>(M: {memory})</span>}
      </h3>

      <input
        type="text"
        value={display}
        onChange={handleInputChange}
        onPaste={handlePaste}
        onFocus={handleInputFocus}
        onClick={copyToClipboard}
        style={{
          width: "100%",
          backgroundColor: "#f3f4f6",
          padding: "12px",
          borderRadius: "6px",
          marginBottom: "15px",
          textAlign: "right",
          fontSize: "20px",
          fontWeight: "bold",
          minHeight: "35px",
          border: "2px solid #e5e7eb",
          cursor: "pointer",
          boxSizing: "border-box",
        }}
        placeholder="0"
        title="Ctrl+V: Paste | Click: Хуулах"
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "2px", marginBottom: "8px" }}>
        <button style={memoryStyle} onClick={memoryClear} title="Memory Clear">
          MC
        </button>
        <button style={memoryStyle} onClick={memoryRecall} title="Memory Recall">
          MR
        </button>
        <button style={memoryStyle} onClick={memoryStore} title="Memory Store">
          MS
        </button>
        <button style={memoryStyle} onClick={memoryAdd} title="Memory Add">
          M+
        </button>
        <button style={memoryStyle} onClick={memorySubtract} title="Memory Subtract">
          M-
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "2px", marginBottom: "8px" }}>
        <button style={functionStyle} onClick={percent} title="Процент">
          %
        </button>
        <button style={functionStyle} onClick={sqrt} title="Квадрат язгуур">
          √
        </button>
        <button style={functionStyle} onClick={toggleSign} title="Тэмдэг солих">
          ±
        </button>
        <button style={buttonStyle} onClick={clear} title="Clear">
          C
        </button>
        <button style={buttonStyle} onClick={() => setDisplay(display.slice(0, -1) || "0")} title="Backspace">
          ⌫
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "2px", marginBottom: "8px" }}>
        <button
          style={{ ...buttonStyle, backgroundColor: "#10b981", color: "white", fontSize: "11px" }}
          onClick={copyAsNumber}
          title="Тоог Excel-д хуулах"
        >
          📊 Тоо
        </button>
        <button
          style={{ ...buttonStyle, backgroundColor: "#10b981", color: "white", fontSize: "11px" }}
          onClick={copyLastResult}
          title="Сүүлийн хариуг хуулах"
        >
          📋 Хариу
        </button>
        <button
          style={{ ...buttonStyle, backgroundColor: "#ef4444", color: "white", fontSize: "11px" }}
          onClick={clearHistory}
          title="Түүх арилгах"
        >
          🗑️ Түүх
        </button>
        <button
          style={{ ...buttonStyle, backgroundColor: "#3b82f6", color: "white", fontSize: "11px" }}
          onClick={() => setShowHistory(!showHistory)}
          title="Түүх харах"
        >
          📜 {showHistory ? "Нууцлах" : "Түүх"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "2px" }}>
        <button style={buttonStyle} onClick={() => inputNumber(7)} title="7">
          7
        </button>
        <button style={buttonStyle} onClick={() => inputNumber(8)} title="8">
          8
        </button>
        <button style={buttonStyle} onClick={() => inputNumber(9)} title="9">
          9
        </button>
        <button style={operatorStyle} onClick={() => performOperation("/")} title="Хуваах">
          /
        </button>

        <button style={buttonStyle} onClick={() => inputNumber(4)} title="4">
          4
        </button>
        <button style={buttonStyle} onClick={() => inputNumber(5)} title="5">
          5
        </button>
        <button style={buttonStyle} onClick={() => inputNumber(6)} title="6">
          6
        </button>
        <button style={operatorStyle} onClick={() => performOperation("*")} title="Үржүүлэх">
          *
        </button>

        <button style={buttonStyle} onClick={() => inputNumber(1)} title="1">
          1
        </button>
        <button style={buttonStyle} onClick={() => inputNumber(2)} title="2">
          2
        </button>
        <button style={buttonStyle} onClick={() => inputNumber(3)} title="3">
          3
        </button>
        <button style={operatorStyle} onClick={() => performOperation("-")} title="Хасах">
          -
        </button>

        <button style={{ ...buttonStyle, gridColumn: "span 2" }} onClick={() => inputNumber(0)} title="0">
          0
        </button>
        <button style={buttonStyle} onClick={inputDot} title="Цэг">
          .
        </button>
        <button style={operatorStyle} onClick={() => performOperation("+")} title="Нэмэх">
          +
        </button>

        <button style={buttonStyle} onClick={copyToClipboard} title="Хуулах">
          📋
        </button>
        <button style={{ ...operatorStyle, gridColumn: "span 3" }} onClick={() => performOperation("=")} title="Тэнцэх">
          =
        </button>
      </div>

      {showHistory && (
        <div
          style={{
            marginTop: "10px",
            backgroundColor: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            padding: "10px",
            maxHeight: "150px",
            overflowY: "auto",
          }}
        >
          <h4 style={{ margin: "0 0 8px 0", fontSize: "12px", color: "#6b7280" }}>Тооцооллын түүх:</h4>
          {history.length === 0 ? (
            <p style={{ margin: 0, fontSize: "11px", color: "#9ca3af" }}>Түүх хоосон</p>
          ) : (
            history.slice(-10).map((entry, index) => (
              <div
                key={index}
                style={{
                  fontSize: "11px",
                  padding: "2px 4px",
                  cursor: "pointer",
                  borderRadius: "3px",
                  marginBottom: "2px",
                }}
                onClick={() => {
                  const result = entry.split(" = ")[1];
                  copyToClipboard(result);
                }}
                title="Дарж хуулах"
              >
                {entry}
              </div>
            ))
          )}
        </div>
      )}

      <div style={{ marginTop: "10px", fontSize: "11px", color: "#666", textAlign: "center" }}>
        Excel-friendly: 📊 Тоо хуулах | 📋 Хариу хуулах | 📜 Түүх
        <br />
        Keyboard: 0-9, +, -, *, /, Enter, Esc, Backspace
      </div>
    </div>
  );
};

export default Calculator;
