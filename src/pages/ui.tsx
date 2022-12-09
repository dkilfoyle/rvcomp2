import { Editor } from "../components/simpleCEditor/Editor";
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./ui.css";
import { Sidebar } from "../components/SideBar";
import { ChakraProvider } from "@chakra-ui/react";
import "rc-tree/assets/index.css";

import { CstView } from "../components/cst";
import { AstView } from "../components/ast";
import { BrilView } from "../components/bril";
import { BrilEditor } from "../components/brilEditor/BrilEditor";
import { CfgView } from "../components/cfg";
import { Consoler } from "../components/console";

import DockLayout, { DividerBox } from "rc-dock";
import "rc-dock/dist/rc-dock.css";

// const fullHeight = { maxHeight: "100%" };
// const fullHeight2 = { height: "100%", display: "flex", flexDirection: "column" };
// const fullHeightNoMargin = { height: "100%", margin: "0px", padding: "0px" };
const fullWindow = { height: "100vh", width: "100vw", backgroundColor: "aliceblue" };

const groups = {
  card: {
    floatable: false,
    maximizable: true,
  },
};

const layout = {
  dockbox: {
    mode: "vertical",
    children: [
      {
        size: 1000,
        mode: "horizontal",
        children: [
          {
            mode: "vertical",
            children: [
              {
                tabs: [
                  {
                    id: "code",
                    title: "SimpleC",
                    content: <Editor></Editor>,
                    group: "card",
                  },
                ],
              },
              {
                tabs: [
                  {
                    id: "bril",
                    title: "Bril",
                    content: <BrilEditor></BrilEditor>,
                    group: "card",
                  },
                ],
              },
            ],
          },
          {
            children: [
              {
                tabs: [
                  {
                    id: "cfg",
                    title: "CFG",
                    content: <CfgView></CfgView>,
                    group: "card",
                  },
                  {
                    id: "cst",
                    title: "CST",
                    content: <CstView></CstView>,
                  },
                  {
                    id: "ast",
                    title: "AST",
                    content: <AstView></AstView>,
                  },
                  {
                    id: "ir",
                    title: "IR",
                    content: <BrilView></BrilView>,
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        tabs: [{ id: "console", title: "Console", group: "card", content: <Consoler></Consoler> }],
      },
    ],
  },
};

export const UI: React.FC = () => {
  return (
    <ChakraProvider>
      <div style={fullWindow}>
        <DividerBox style={{ position: "absolute", left: 5, top: 5, right: 5, bottom: 5 }}>
          <DividerBox mode="vertical" style={{ width: "10%", minWidth: 100, border: "1px solid #ccc" }}>
            <Sidebar></Sidebar>
          </DividerBox>
          <DockLayout dropMode="edge" defaultLayout={layout} groups={groups} style={{ width: "60%" }} />
        </DividerBox>
      </div>
    </ChakraProvider>
  );
};
