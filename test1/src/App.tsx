import React from "react";
import { Route, Routes } from "react-router-dom";
import { HelloWorld } from "./views";
import Sketch from "./views/Sketch";

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Sketch />} />
      <Route path="/hello" element={<HelloWorld />} />
    </Routes>
  );
};

export default App;
