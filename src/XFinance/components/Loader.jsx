// Loader.js
import React from "react";

const Loader = () => {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10000,
        color: "white",
        fontSize: "1 rem",
        fontFamily: "Arial, sans-serif",  
      }}
    >
      <div className="loader"></div>
      <div>Ачааллаж байна...</div>
    </div>
  );
};

export default Loader;
