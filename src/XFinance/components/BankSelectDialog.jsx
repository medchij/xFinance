import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  Button,
  Field,
  Dropdown,
  Option,
  Input,
  tokens,
} from "@fluentui/react-components";
import { Dismiss24Regular } from "@fluentui/react-icons";
import { generateMongoliaIban } from "../externalAPI";

const banks = [
  { name: "Хаан банк", code: "0005" },
  { name: "ХХБанк", code: "0004" },
  { name: "Голомт банк", code: "0150" },
  { name: "Төрийн банк", code: "0001" },
  { name: "Капитрон банк", code: "0047" },
  { name: "Ариг банк", code: "0043" },
  { name: "Богд банк", code: "0020" },
  { name: "M банк", code: "0340" },
  { name: "Чингис хаан банк", code: "0190" },
  { name: "Үндэсний хөрөнгө оруулалтын банк", code: "0210" },
];

const BankSelectDialog = ({ isOpen, onClose, onSubmit }) => {
  const [selectedBank, setSelectedBank] = useState("0005");
  const [accountNumber, setAccountNumber] = useState("");
  const [generatedIban, setGeneratedIban] = useState("");

  // Дансны дугаар эсвэл банк солигдох бүрд IBAN автоматаар үүсгэх
  useEffect(() => {
    if (accountNumber && accountNumber.trim().length >= 9) {
      try {
        // Branch код "00" ашиглах (default)
        const iban = generateMongoliaIban(accountNumber.trim(), selectedBank, "00");
        setGeneratedIban(iban);
      } catch (error) {
        setGeneratedIban("");
      }
    } else {
      setGeneratedIban("");
    }
  }, [accountNumber, selectedBank]);

  const handleSubmit = async () => {
    if (generatedIban) {
      try {
        // Clipboard-д хуулах
        await navigator.clipboard.writeText(generatedIban);
        console.log('✅ IBAN хуулагдлаа:', generatedIban);
      } catch (error) {
        console.error('❌ Clipboard алдаа:', error);
      }
      onSubmit(selectedBank, accountNumber.trim(), generatedIban);
      // Reset
      setAccountNumber("");
      setGeneratedIban("");
      onClose();
    }
  };

  const handleClose = () => {
    setAccountNumber("");
    setGeneratedIban("");
    setSelectedBank("0005");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(_, data) => !data.open && handleClose()}>
      <DialogSurface style={{ maxWidth: "600px" }}>
        <DialogBody>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <DialogTitle>IBAN лавлах</DialogTitle>
            <Button
              icon={<Dismiss24Regular />}
              appearance="subtle"
              onClick={handleClose}
              aria-label="Хаах"
            />
          </div>
          <DialogContent>
            <Field label="Банк сонгоно уу" required style={{ marginBottom: "16px" }}>
              <Dropdown
                placeholder="Банк сонгох"
                value={banks.find(b => b.code === selectedBank)?.name || "Хаан банк"}
                onOptionSelect={(_, data) => setSelectedBank(data.optionValue)}
                style={{ width: "100%" }}
              >
                {banks.map((bank) => (
                  <Option key={bank.code} value={bank.code}>
                    {bank.name}
                  </Option>
                ))}
              </Dropdown>
            </Field>

            <Field label="Дансны дугаар" required style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <Input
                  placeholder="Дансны дугаар оруулна уу"
                  value={accountNumber}
                  onChange={(_, data) => setAccountNumber(data.value)}
                  style={{ flex: 1 }}
                />
                <Button appearance="secondary">Лавлах</Button>
              </div>
            </Field>

            <Field label="IBAN код автоматаар үүсэх болно" style={{ marginBottom: "16px" }}>
              <Input
                value={generatedIban || "MN"}
                readOnly
                contentBefore={
                  <span style={{ 
                    fontSize: "20px", 
                    display: "flex", 
                    alignItems: "center",
                    color: tokens.colorNeutralForeground3 
                  }}>
                    
                  </span>
                }
                style={{ 
                  width: "100%",
                  backgroundColor: tokens.colorNeutralBackground2,
                  fontFamily: "monospace",
                  fontSize: "16px",
                  fontWeight: "600"
                }}
              />
            </Field>

            <Button 
              appearance="primary" 
              onClick={handleSubmit}
              disabled={!generatedIban}
              style={{ width: "100%" }}
            >
              IBAN хуулах
            </Button>
          </DialogContent>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};

export default BankSelectDialog;
