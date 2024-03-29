// import React from "react";
// import ReactDOM from "react-dom";
// import { UI } from "./pages/ui";
// import "./useWorker";

// ReactDOM.render(
//   <React.StrictMode>
//     <UI></UI>
//   </React.StrictMode>,
//   document.getElementById("root")
// );

import React from "react";
import { createRoot } from "react-dom/client";
import { UI } from "./pages/ui";
import "./useWorker";

const container = document.getElementById("root");
const root = createRoot(container!); // createRoot(container!) if you use TypeScript
root.render(
  // <React.StrictMode>
  <UI></UI>
  // </React.StrictMode>
);
