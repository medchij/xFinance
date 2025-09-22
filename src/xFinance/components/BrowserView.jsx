import React, { useState, useEffect, useRef } from "react";
import { Input, Button, Field, tokens } from "@fluentui/react-components";

const BrowserView = ({ isSidebarOpen }) => {
  const [url, setUrl] = useState("https://wikipedia.org");
  const [iframeUrl, setIframeUrl] = useState("");
  const containerRef = useRef(null);

  const handleOpen = () => {
    if (!url.startsWith("http")) {
      alert("URL нь http эсвэл https протоколтой эхлэх ёстой");
      return;
    }

    const apiUrl = `http://localhost:4002/api/render?url=${encodeURIComponent(url)}`;
    setIframeUrl(apiUrl);
  };

  useEffect(() => {
    const resizeHandler = () => {
      if (containerRef.current) {
        const topOffset = containerRef.current.getBoundingClientRect().top;
        const availableHeight = window.innerHeight - topOffset - 20;
        containerRef.current.style.height = `${availableHeight}px`;
      }
    };

    resizeHandler();
    window.addEventListener("resize", resizeHandler);
    return () => window.removeEventListener("resize", resizeHandler);
  }, [iframeUrl]);

  return (
    <div
      style={{
        flexGrow: 1,
        padding: "30px",
        backgroundColor: tokens.colorNeutralBackground1,
        minHeight: "100vh",
        marginLeft: isSidebarOpen ? 250 : 50,
        transition: "margin-left 0.3s ease-in-out",
        position: "relative",
        zIndex: 1,
        maxWidth: "600px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Field label="🔗 URL оруулна уу">
        <Input
          placeholder="https://wikipedia.org"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </Field>

      <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
        <Button appearance="primary" onClick={handleOpen}>
          API-р нээх
        </Button>
        <Button appearance="secondary" onClick={() => window.open(url, "_blank")}> 
          Шинэ цонхонд нээх
        </Button>
      </div>

      {iframeUrl && (
        <div ref={containerRef} style={{ marginTop: "10px", flexGrow: 1 }}>
          <iframe
            title="BrowserPreview"
            src={iframeUrl}
            style={{ width: "100%", height: "100%", border: "none" }}
          />
        </div>
      )}
    </div>
  );
};

export default BrowserView;