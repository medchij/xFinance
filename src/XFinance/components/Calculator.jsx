import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from "./AppContext";
import { CopyRegular } from "@fluentui/react-icons";
const Calculator = () => {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState(null);
  const [operation, setOperation] = useState(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [history, setHistory] = useState([]);
  const [showCopy, setShowCopy] = useState(false);
  const [copied, setCopied] = useState(false);
  const {showMessage } = useAppContext();
  const containerRef = useRef(null);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setDisplay(text);
      
      setTimeout(() => {
        const numbers = extractNumbers(text);
        
        if (numbers.length > 0) {
          if (isMathExpression(text)) {
            try {
              const result = evaluateExpression(text);
              setDisplay(formatNumber(result));
              setHistory(prev => [text + ' = ' + formatNumber(result), ...prev.slice(0, 9)]);
            } catch (err) {
              setDisplay(formatNumber(numbers[0]));
              setHistory(prev => ['Тоо олдсон: ' + formatNumber(numbers[0]), ...prev.slice(0, 9)]);
            }
          } else {
            setDisplay(formatNumber(numbers[0]));
            setHistory(prev => ['Clipboard: "' + text + '"  ' + formatNumber(numbers[0]), ...prev.slice(0, 9)]);
          }
        } else {
          setDisplay('Тоо олдсонгүй');
          setHistory(prev => ['Тоо олдсонгүй: "' + text + '"', ...prev.slice(0, 9)]);
        }
      }, 500);
    } catch (err) {
      console.error('Paste error:', err);
    }
  };

  const extractNumbers = (text) => {
    const cleaned = text.replace(/,/g, '');
    const regex = /-?\d+\.?\d*/g;
    const matches = cleaned.match(regex);
    return matches ? matches.map(parseFloat).filter(n => !isNaN(n)) : [];
  };

  const formatNumber = (num) => {
    const str = String(num);
    const [integer, decimal] = str.split('.');
    const isNegative = integer.startsWith('-');
    const absInteger = isNegative ? integer.slice(1) : integer;
    const formatted = absInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const result = (isNegative ? '-' : '') + formatted + (decimal ? '.' + decimal : '');
    return result;
  };

  const isMathExpression = (text) => {
    return /[\+\-\*\/\(\)=]/.test(text);
  };

  const evaluateExpression = (expression) => {
    let expr = expression.split('=')[0].trim();
    expr = expr.replace(/,/g, '');
    expr = expr.replace(/×/g, '*').replace(/÷/g, '/');
    
    if (!/^[\d\+\-\*\/\.\(\)\s]+$/.test(expr)) {
      throw new Error('Invalid format');
    }
    
    return Function('"use strict"; return (' + expr + ')')();
  };

  const inputNumber = (num) => {
    if (waitingForOperand) {
      setDisplay(String(num));
      setWaitingForOperand(false);
    } else {
      const currentDisplay = display === '0' || display === '' ? '' : display.replace(/,/g, '');
      const newDisplay = currentDisplay + num;
      setDisplay(formatNumber(parseFloat(newDisplay)));
    }
  };

  const inputDot = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const performOperation = (nextOperation) => {
    const inputValue = parseFloat(display.replace(/,/g, ''));

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);
      
      if (nextOperation === '=') {
        setDisplay(formatNumber(newValue));
        setHistory(prev => [formatNumber(currentValue) + ' ' + operation + ' ' + formatNumber(inputValue) + ' = ' + formatNumber(newValue), ...prev.slice(0, 9)]);
      } else {
        setDisplay('');
      }
      
      setPreviousValue(newValue);
    }

    if (nextOperation !== '=') {
      setDisplay('');
    }
    
    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = (firstValue, secondValue, operation) => {
    switch (operation) {
      case '+':
        return firstValue + secondValue;
      case '-':
        return firstValue - secondValue;
      case '*':
        return firstValue * secondValue;
      case '/':
        return firstValue / secondValue;
      case '=':
        return secondValue;
      default:
        return secondValue;
    }
  };

  const buttonStyle = {
    padding: '0',
    fontSize: '14px',
    fontWeight: '500',
    border: '1px solid #ddd',
    borderRadius: '5px',
    cursor: 'pointer',
    backgroundColor: '#fff',
    minHeight: '50px',
    maxHeight: '50px',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    aspectRatio: '1'
  };

  const operatorStyle = {
    ...buttonStyle,
    backgroundColor: '#ff9500',
    color: 'white'
  };

  return (
    <div ref={containerRef} style={{ padding: '15px', maxWidth: '250px', margin: '0 auto' }}>
      <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>
         Smart Calculator
      </h3>
      
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '8px', gap: '8px' }}>
        <div style={{ flex: 1 }}>
          <input 
            type="text"
            value={display}
            onChange={(e) => setDisplay(e.target.value)}
            onPaste={(e) => {
              e.preventDefault();
              handlePaste();
            }}
            style={{
              width: '100%',
              backgroundColor: '#000',
              color: '#00ff00',
              padding: '10px',
              textAlign: 'right',
              fontSize: '18px',
              fontFamily: 'monospace',
              border: '2px solid #333',
              borderRadius: '5px',
              minHeight: '35px',
              boxSizing: 'border-box'
            }}
          />
        </div>
        {/* removed header copy button; kept single grid copy button below */}
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginTop: '8px' }}>
        <div style={{ flex: '1 1 auto' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)', 
            gap: '3px', 
            gridAutoRows: 'minmax(50px, auto)'
          }}>
            <button style={buttonStyle} onClick={clear}>C</button>
            <button style={buttonStyle} onClick={() => setDisplay(display.slice(0, -1) || '0')}>←</button>
            {/* Copy button placed under the backspace (grid column 2, row 2) */}
                                             <button
                        style={buttonStyle}
                        onClick={() => {
                          console.log('Copy button clicked. Display value:', display); // Debugging log
                          navigator.clipboard.writeText(display)
                            .then(() => {
                              console.log('Text copied successfully:', display); // Debugging log
                              setCopied(true);
                              showMessage('✅Хуулагдлаа!'); // Show success message
                              setTimeout(() => setCopied(false), 1200);
                            })
                            .catch((err) => {
                              console.error('Failed to copy text to clipboard:', err); // Debugging log
                              showMessage('❌Clipboard-д хуулах боломжгүй байна: ' + err);
                            });
                        }}
                        title="Copy"
                        >
                        <span style={{ marginRight: '4px', display: 'inline-flex', alignItems: 'center' }}>
                          <CopyRegular style={{ fontSize: '18px' }} />
                        </span>
                    
                        </button>
                  <button style={operatorStyle} onClick={() => performOperation('/')}>÷</button>
                   

                  <button style={buttonStyle} onClick={() => inputNumber(7)}>7</button>
                  <button style={buttonStyle} onClick={() => inputNumber(8)}>8</button>
                  <button style={buttonStyle} onClick={() => inputNumber(9)}>9</button>
                   <button style={operatorStyle} onClick={() => performOperation('*')}>×</button>
                  

                  <button style={buttonStyle} onClick={() => inputNumber(4)}>4</button>
                  <button style={buttonStyle} onClick={() => inputNumber(5)}>5</button>
                  <button style={buttonStyle} onClick={() => inputNumber(6)}>6</button>
                    <button style={operatorStyle} onClick={() => performOperation('-')}>-</button>
                   

                  <button style={buttonStyle} onClick={() => inputNumber(1)}>1</button>
                  <button style={buttonStyle} onClick={() => inputNumber(2)}>2</button>
                  <button style={buttonStyle} onClick={() => inputNumber(3)}>3</button>
                   <button style={operatorStyle} onClick={() => performOperation('+')}>+</button>
                 

                  <button style={{ ...buttonStyle, gridColumn: 'span 2', aspectRatio: '2/1' }} onClick={() => inputNumber(0)}>0</button>
                  <button style={buttonStyle} onClick={inputDot}>.</button>
                  <button style={{ ...operatorStyle, gridRow: 'span 2', aspectRatio: '1/2' }} onClick={() => performOperation('=')}>=</button>
                  </div>
                </div>

                {/* removed duplicate right-side copy column; single grid copy remains */}
      </div>

      {history.length > 0 && (
        <div style={{
          marginTop: '15px',
          backgroundColor: '#f9fafb',
          border: '1px solid #ddd',
          borderRadius: '5px',
          padding: '10px',
          maxHeight: '150px',
          overflowY: 'auto'
        }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#666' }}>Түүх:</h4>
          {history.map((entry, index) => (
            <div key={index} style={{ fontSize: '11px', marginBottom: '3px', fontFamily: 'monospace' }}>
              {entry}
            </div>
          ))}
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '11px', color: '#666' }}>
         Ctrl+V дараад юу ч хуулаарай  Тоо олж бодоод харуулна! 
      </div>
    </div>
  );
};

export default Calculator;
