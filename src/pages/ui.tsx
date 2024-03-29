import { Editor } from "../components/simpleCEditor/Editor";
import React, { useCallback, useMemo, useRef, useState } from "react";
import "./ui.css";
import { Sidebar } from "../components/sidebar/SideBar";
import { Box, ChakraProvider, extendTheme, HStack, Icon, Tab, TabList, Tabs } from "@chakra-ui/react";
import "rc-tree/assets/index.css";

import { CstView } from "../components/cstView";
import { AstView } from "../components/astView";
import { BrilView } from "../components/brilView";
import { BrilEditor } from "../components/brilEditor/BrilEditor";
import { CfgView } from "../components/cfgView";
import { Consoler } from "../components/console";

import {
  TbArrowBarDown,
  TbArrowBarLeft,
  TbArrowBarRight,
  TbArrowBarToDown,
  TbArrowBarToLeft,
  TbArrowBarToRight,
  TbArrowBarToUp,
  TbArrowBarUp,
  TbTerminal2,
} from "react-icons/tb";
import { BiCollapse, BiExpand } from "react-icons/bi";
import { BsCpu } from "react-icons/bs";

import DockLayout, {
  BoxBase,
  DividerBox,
  DockContext,
  DropDirection,
  LayoutBase,
  LayoutData,
  PanelBase,
  PanelData,
  TabBase,
  TabData,
  TabGroup,
} from "rc-dock";
import "rc-dock/dist/rc-dock.css";
import { Output } from "../components/output";
import _ from "lodash";
import { WasmEditor } from "../components/wasmEditor/WasmEditor";
import { accordionTheme } from "./theme";
import { FaRunning } from "react-icons/fa";
import { SiCodecademy, SiWebassembly } from "react-icons/si";
import { GiSlowBlob } from "react-icons/gi";
import { RiscVEditor } from "../components/riscvEditor/RiscVEditor";
import { RegView } from "../components/regView";

export const theme = extendTheme({
  components: { Accordion: accordionTheme },
});

// const fullHeight = { maxHeight: "100%" };
// const fullHeight2 = { height: "100%", display: "flex", flexDirection: "column" };
// const fullHeightNoMargin = { height: "100%", margin: "0px", padding: "0px" };
const fullWindow = { height: "100vh", width: "100vw", backgroundColor: "#E2E8F0" };

const defaultlayout: LayoutBase = {
  dockbox: {
    mode: "vertical",
    id: "mainVerticalBox",
    children: [
      {
        mode: "horizontal",
        id: "mainHorizontalBox",
        size: 700,
        children: [
          {
            id: "codeBox",
            size: 1000,
            mode: "vertical",
            children: [
              { id: "codePanel", size: 400, group: "card", tabs: [{ id: "code" }] },
              {
                id: "compiledPanel",
                size: 600,
                mode: "horizontal",
                children: [
                  { id: "irPanel", group: "card", tabs: [{ id: "bril" }] },
                  { id: "asmPanel", group: "card", tabs: [{ id: "riscv" }, { id: "wasm" }] },
                ],
              },
            ],
          },
          {
            id: "graphPanel",
            size: 500,
            mode: "vertical",
            group: "card",
            tabs: [{ id: "reg" }, { id: "cfg" }, { id: "cst" }, { id: "ast" }, { id: "ir" }],
          },
        ],
      },
      {
        id: "outputPanel",
        size: 300,
        mode: "horizontal",
        children: [
          { id: "consolePanel", size: 300, group: "card", tabs: [{ id: "console" }] },
          { id: "outputPanel", size: 700, group: "card", tabs: [{ id: "output" }] },
        ],
      },
    ],
  },
};

const findInLayout = (id: string, layout: LayoutBase) => {
  const findInBox = (id: string, box: BoxBase): BoxBase | PanelBase | TabBase | null => {
    if (box.id == id) return box;
    for (let child of box.children) {
      if ("children" in child) {
        // is box
        const result = findInBox(id, child);
        if (result) return result;
      } else {
        // is panel
        const result = findInPanel(id, child);
        if (result) return result;
      }
    }
    return null;
  };
  const findInPanel = (id: string, panel: PanelBase) => {
    if (panel.id == id) return panel;
    for (let tab of panel.tabs) {
      if (tab.id == id) return tab;
    }
    return null;
  };
  return findInBox(id, layout.dockbox);
};

const tabs: Record<string, TabData> = {
  code: {
    id: "code",
    title: (
      <HStack>
        <Icon as={SiCodecademy}></Icon>
        <span>SimpleC</span>
      </HStack>
    ),
    content: <Editor></Editor>,
  },
  bril: {
    id: "bril",
    title: (
      <HStack>
        <Icon as={GiSlowBlob}></Icon>
        <span>Bril</span>
      </HStack>
    ),
    content: <BrilEditor></BrilEditor>,
    cached: true,
  },
  wasm: {
    id: "wasm",
    title: (
      <HStack>
        <Icon as={SiWebassembly}></Icon>
        <span>Wasm</span>
      </HStack>
    ),
    content: <WasmEditor></WasmEditor>,
    cached: true,
  },
  riscv: {
    id: "riscv",
    title: (
      <HStack>
        <Icon as={BsCpu}></Icon>
        <span>RiscV</span>
      </HStack>
    ),
    content: <RiscVEditor></RiscVEditor>,
    cached: true,
  },
  cfg: {
    id: "cfg",
    title: "CFG",
    // content: <div></div>,
    content: <CfgView></CfgView>,
    minWidth: 30,
  },
  reg: {
    id: "reg",
    title: "REGs",
    content: <RegView></RegView>,
    minWidth: 30,
  },
  cst: {
    id: "cst",
    title: "CST",
    content: <CstView></CstView>,
  },
  ast: {
    id: "ast",
    title: "AST",
    content: <AstView></AstView>,
  },
  ir: {
    id: "ir",
    title: "IR",
    content: <BrilView></BrilView>,
  },
  collapsed: {
    id: "collapsed",
    title: "",
    content: <h2>Collapsed</h2>,
  },
  console: {
    id: "console",
    title: (
      <HStack>
        <Icon as={TbTerminal2}></Icon>
        <span>Console</span>
      </HStack>
    ),
    content: <Consoler></Consoler>,
  },
  output: {
    id: "output",
    title: (
      <HStack>
        <Icon as={FaRunning}></Icon>
        <span>Output</span>
      </HStack>
    ),
    content: <Output></Output>,
  },
};

const createCollapsedTab = (tabbases: TabBase[]) => {
  const lis = tabbases.map((tabbase) => <span>{tabs[tabbase.id!].title}</span>);
  return {
    id: "collapsed",
    title: "",
    content: (
      <div className="verticalTabs">
        <HStack className="verticalTabsR">{lis}</HStack>
      </div>
    ),
  };
};

const iconLookup = {
  collapsed: {
    horizontal: {
      first: TbArrowBarToRight,
      last: TbArrowBarToLeft,
      middle: BiExpand,
    },
    vertical: {
      first: TbArrowBarToDown,
      last: TbArrowBarUp,
      middle: BiExpand,
    },
  },
  expanded: {
    horizontal: {
      first: TbArrowBarLeft,
      last: TbArrowBarRight,
      middle: BiCollapse,
    },
    vertical: {
      first: TbArrowBarUp,
      last: TbArrowBarDown,
      middle: BiCollapse,
    },
  },
};

const getPanelState = (panel: PanelData) => {
  const index = panel.parent?.children!.indexOf(panel);
  let position: "first" | "last" | "middle";
  if (index == 0) position = "first";
  else if (index == panel.parent!.children!.length - 1) position = "last";
  else position = "middle";
  const mode: "horizontal" | "vertical" = panel.parent!.mode == "horizontal" ? "horizontal" : "vertical";
  const display: "collapsed" | "expanded" = panel.size! <= 30 ? "collapsed" : "expanded";
  return { position, mode, display };
};

const getIcon = (panel: PanelData) => {
  const { position, mode, display } = getPanelState(panel);
  return iconLookup[display][mode][position];
};

export const UI: React.FC = () => {
  const [layout, setLayout] = useState<LayoutBase>(defaultlayout);
  const dockLayoutRef = useRef<DockLayout>(null);
  const [sizes, setSizes] = useState<{ [key: string]: number }>({});

  const groups: { [key: string]: TabGroup } = useMemo(
    () => ({
      notabs: {
        floatable: false,
        maximizable: false,
        moreIcon: " ",
        panelExtra: (panel: PanelData, context: DockContext) => {
          let buttons = [];
          buttons.push(
            <Icon
              as={getIcon(panel)}
              key="collapse"
              onClick={() => {
                if (!panel.id) throw new Error("Panels must have id");
                panel.size = sizes[panel.id] || 200;
                context.onSilentChange();
              }}></Icon>
          );
          return (
            <Box display="flex" alignItems="center" pr="1.5">
              {buttons}
            </Box>
          );
        },
      },
      card: {
        floatable: false,
        maximizable: true,
        panelExtra: (panel: PanelData, context: DockContext) => {
          let buttons = [];
          buttons.push(
            <Icon
              as={getIcon(panel)}
              key="collapse"
              onClick={() => {
                if (!panel.id) throw new Error("Panels must have id");
                if (panel.size == 0) {
                  // expand
                  panel.size = sizes[panel.id] || 200;
                } else {
                  // collapse
                  setSizes({ ...sizes, [panel.id]: panel.size || 200 });
                  panel.size = 0;
                }
                context.onSilentChange();
              }}></Icon>
          );
          return (
            <Box display="flex" alignItems="center" pr="1.5">
              {buttons}
            </Box>
          );
        },
      },
    }),
    [dockLayoutRef.current]
  );

  const loadTab = useCallback((data: TabData) => {
    let { id } = data;
    if (id) return { ...tabs[id], minWidth: 35, minHeight: 38 };
    else return { title: "Undefined", content: <div>Undefined Tab</div> };
  }, []);

  const onLayoutChange = useCallback((newLayout: LayoutData, currentTabId?: string, direction?: DropDirection) => {
    // control DockLayout from state
    const graphPanel = findInLayout("graphPanel", newLayout) as PanelBase;
    if (!graphPanel || _.isUndefined(graphPanel.size)) throw new Error();

    if (graphPanel.size <= 35) {
      // graphTabs panel is collapsed
      tabs.collapsed = createCollapsedTab(graphPanel.tabs);
      graphPanel.tabs = [{ id: "collapsed" }];
      graphPanel.group = "notabs";
    } else {
      // restore tabs if size increased to > 30
      if (graphPanel.tabs[0].id == "collapsed") {
        graphPanel.tabs = [tabs.cfg, tabs.cst, tabs.ast, tabs.ir];
        graphPanel.group = "card";
      }
    }
    setLayout({ ...newLayout });
  }, []);

  return (
    <ChakraProvider theme={theme}>
      <div style={fullWindow}>
        <DividerBox style={{ position: "absolute", left: 5, top: 5, right: 5, bottom: 5 }}>
          <DividerBox mode="vertical" style={{ width: 150, minWidth: 10, maxWidth: 200, border: "1px solid #ccc" }}>
            <Sidebar></Sidebar>
          </DividerBox>
          <DockLayout
            ref={dockLayoutRef}
            layout={layout}
            // defaultLayout={defaultlayout}
            onLayoutChange={onLayoutChange}
            loadTab={loadTab}
            dropMode="edge"
            groups={groups}
            style={{ width: "60%" }}
          />
        </DividerBox>
      </div>
    </ChakraProvider>
  );
};
