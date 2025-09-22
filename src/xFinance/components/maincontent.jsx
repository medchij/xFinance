import React from "react";
import PropTypes from "prop-types";
import Header from "./Header";
import HeroList from "./HeroList";
import TextInsertion from "./TextInsertion";
import { Ribbon24Regular, LockOpen24Regular, DesignIdeas24Regular } from "@fluentui/react-icons";
import { insertText } from "../xFinance";

const MainContent = ({ title, isSidebarOpen, loading, errorMessage, importStatus }) => {
  return (
    <div
      style={{
        flexGrow: 1,
        padding: "0",
        marginLeft: isSidebarOpen ? "250px" : "50px",
        transition: "margin-left 0.3s ease-in-out",
        width: isSidebarOpen ? "calc(100% - 250px)" : "calc(100% - 50px)",
      }}
    >
      <Header logo="assets/logo-filled.png" title={title} message="Тавтай морил" />
      <HeroList
        message="Энэ нэмэлт хэрэгсэл нь таны ажиллагааг хялбарчлах болно"
        items={[
          { icon: <Ribbon24Regular />, primaryText: "Office интеграцчлалаар ажлаа илүү үр дүнтэй болго" },
          { icon: <LockOpen24Regular />, primaryText: "Илүү олон үйлдэл, боломжийг идэвхжүүл" },
          { icon: <DesignIdeas24Regular />, primaryText: "Мэргэжлийн түвшинд бүтээж, мэдээллээ харагдуулах" },
        ]}
      />
      <TextInsertion insertText={insertText} />
    </div>
  );
};

MainContent.propTypes = {
  title: PropTypes.string,
  isSidebarOpen: PropTypes.bool,
  loading: PropTypes.bool,
  errorMessage: PropTypes.string,
  importStatus: PropTypes.bool,
};

export default MainContent;