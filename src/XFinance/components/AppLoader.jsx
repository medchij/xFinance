import React from "react"; // ➡️ заавал нэмэх!
import { useAppContext } from "./AppContext";
import Loader from "./Loader";

const AppLoader = () => {
  const { loading } = useAppContext();
  if (!loading) return null;
  return <Loader />;
};

export default AppLoader;
