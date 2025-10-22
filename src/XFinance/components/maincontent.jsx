import React, { useEffect } from "react";
import PropTypes from "prop-types";
import Header from "./Header";
import HeroList from "./HeroList";
import TextInsertion from "./TextInsertion";
import { Ribbon24Regular, LockOpen24Regular, DesignIdeas24Regular } from "@fluentui/react-icons";
import { insertText } from "../xFinance";
import { useActivityTracking } from "../hooks/useActivityTracking";

const MainContent = ({ title, isSidebarOpen, isPublic = false, onNavigateToLogin, currentUser, onNavigateToProfile }) => {
  const { trackPageView } = useActivityTracking("MainContent");

  useEffect(() => {
    trackPageView("MainContent", {
      isPublic,
      isSidebarOpen,
      title,
    });
  }, [isPublic, isSidebarOpen, title, trackPageView]);
  const rootStyle = {
    flexGrow: 1,
    transition: "margin-left 0.3s ease-in-out",
    // The margin-left transition is now handled by the parent AuthenticatedApp.jsx
  };

  // If it's not a public page, calculate the margin for the sidebar
  if (!isPublic) {
    rootStyle.marginLeft = isSidebarOpen ? "180px" : "50px";
    rootStyle.width = isSidebarOpen ? "calc(100% - 180px)" : "calc(100% - 50px)";
  }
  // The margin and width calculations are removed from here to prevent double-spacing.
  // The parent component (`AuthenticatedApp`) is now responsible for this layout.

  return (
    <div style={rootStyle}>
      <Header
        logo="assets/logo-filled.png"
        title={title}
        message="Тавтай морил"
        isPublic={isPublic}
        onNavigateToLogin={onNavigateToLogin}
        currentUser={currentUser}
        onNavigateToProfile={onNavigateToProfile}
      />
      <HeroList
        message="Энэ нэмэлт хэрэгсэл нь таны ажиллагааг хялбарчлах болно"
        items={[
          { icon: <Ribbon24Regular />, primaryText: "Office интеграцчлалаар ажлаа илүү үр дүнтэй болгоорой!" },
          { icon: <LockOpen24Regular />, primaryText: "Илүү олон үйлдэл, боломжийг идэвхжүүлээрэй!" },
          { icon: <DesignIdeas24Regular />, primaryText: "Тайлан мэдээгээ илүү мэргэжлийн түвшинд тайлагнаарай!" },
        ]}
      />
      <TextInsertion insertText={insertText} />
    </div>
  );
};

MainContent.propTypes = {
  title: PropTypes.string,
  isSidebarOpen: PropTypes.bool,
  isPublic: PropTypes.bool,
  onNavigateToLogin: PropTypes.func,
  currentUser: PropTypes.object,
  onNavigateToProfile: PropTypes.func,
};

export default MainContent;
