import { Editor } from "../components/simpleCEditor/Editor";
import React, { useCallback, useState } from "react";
import "./ui.css";
import { Sidebar } from "../components/SideBar";
import { ChakraProvider } from "@chakra-ui/react";
import "rc-tree/assets/index.css";

import { CstView } from "../components/cstView";
import { AstView } from "../components/astView";
import { BrilView } from "../components/brilView";
import { BrilEditor } from "../components/brilEditor/BrilEditor";
import { CfgView } from "../components/cfgView";
import { Consoler } from "../components/console";

import DockLayout, { DividerBox, DockContext, DropDirection, LayoutBase, LayoutData, PanelData, TabData } from "rc-dock";
import "rc-dock/dist/rc-dock.css";
import { Output } from "../components/output";

// const fullHeight = { maxHeight: "100%" };
// const fullHeight2 = { height: "100%", display: "flex", flexDirection: "column" };
// const fullHeightNoMargin = { height: "100%", margin: "0px", padding: "0px" };
const fullWindow = { height: "100vh", width: "100vw", backgroundColor: "#E2E8F0" };

const layout: LayoutData = {
  dockbox: {
    mode: "vertical",
    size: 1000,
    children: [
      {
        size: 800,
        mode: "horizontal",
        children: [
          {
            size: 900,
            mode: "vertical",
            children: [
              {
                size: 500,
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
                size: 500,
                tabs: [
                  {
                    id: "bril",
                    title: "Bril",
                    content: <BrilEditor></BrilEditor>,
                    group: "card",
                    cached: true,
                  },
                ],
              },
            ],
          },
          {
            size: 100,
            tabs: [
              {
                id: "hello",
                title: "Hello",
                content: <div>Hello there</div>,
                minWidth: 30,
                group: "card",
              },
              // {
              //   id: "cfg",
              //   title: "CFG",
              //   content: <CfgView></CfgView>,
              //   // minWidth: 30,
              // },
              // {
              //   id: "cst",
              //   title: "CST",
              //   content: <CstView></CstView>,
              // },
              // {
              //   id: "ast",
              //   title: "AST",
              //   content: <AstView></AstView>,
              // },
              // {
              //   id: "ir",
              //   title: "IR",
              //   content: <BrilView></BrilView>,
              // },
            ],
          },
        ],
      },
      {
        size: 200,
        group: "card",
        tabs: [
          { id: "console", title: "Console", content: <Consoler></Consoler> },
          { id: "output", title: "Output", content: <Output></Output> },
        ],
      },
    ],
  },
};

const groups = {
  card: {
    floatable: false,
    maximizable: true,
    panelExtra: (panel: PanelData, context: DockContext) => {
      let buttons = [];
      buttons.push(
        <span
          key="collapse"
          onClick={() => {
            console.log(panel.size, panel.parent!.size);
            panel.parent!.size = 990;
            panel.size = 10;
            context.dockMove(panel, panel.parent!, "right");
            // context.dockMove(panel, panel.parent!, "right");

            // layout.dockbox.children[0].children[1].size = 0;
            // setLayout({ ...layout });
            // pandelData.parent.size = 34;
            // context.dockMove(panelData, panelData.parent, "bottom");
          }}>
          ff-ff
        </span>
      );
      return <div>{buttons}</div>;
    },
  },
};

export const UI: React.FC = () => {
  return (
    <ChakraProvider>
      <div style={fullWindow}>
        <DividerBox style={{ position: "absolute", left: 5, top: 5, right: 5, bottom: 5 }}>
          <DividerBox mode="vertical" style={{ width: 150, minWidth: 10, maxWidth: 200, border: "1px solid #ccc" }}>
            <Sidebar></Sidebar>
          </DividerBox>
          <DockLayout defaultLayout={layout} groups={groups} dropMode="edge" style={{ width: "60%" }} />
        </DividerBox>
      </div>
    </ChakraProvider>
  );
};
