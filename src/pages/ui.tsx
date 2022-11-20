import { Editor } from "../components/simpleCEditor/Editor";
import { ExpandButton, Mosaic, MosaicWindow } from "react-mosaic-component";
import React, { useEffect, useMemo, useState } from "react";
import "react-mosaic-component/react-mosaic-component.css";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "./ui.css";
import { astEntity, cstEntity } from "../store/ParseState";
import { Sidebar } from "../components/SideBar";
import { ChakraProvider } from "@chakra-ui/react";
import "rc-tree/assets/index.css";

import { CstView } from "../components/cst";
import { AstView } from "../components/ast";
import { Tabs, TabList, TabPanels, Tab, TabPanel } from "@chakra-ui/react";
import { BrilView } from "../components/bril";
import { BrilEditor } from "../components/brilEditor/BrilEditor";
import { CfgView } from "../components/cfg";
import { Console, Hook, Unhook } from "console-feed";

const theme = {
  scheme: "monokai",
  author: "wimer hazenberg (http://www.monokai.nl)",
  base00: "#272822",
  base01: "#383830",
  base02: "#49483e",
  base03: "#75715e",
  base04: "#a59f85",
  base05: "#f8f8f2",
  base06: "#f5f4f1",
  base07: "#f9f8f5",
  base08: "#f92672",
  base09: "#fd971f",
  base0A: "#f4bf75",
  base0B: "#a6e22e",
  base0C: "#a1efe4",
  base0D: "#66d9ef",
  base0E: "#ae81ff",
  base0F: "#cc6633",
};

const fullHeight = { height: "100%" };
const fullHeightNoMargin = { height: "100%", margin: "0px", padding: "0px" };
const fullWindow = { height: "100vh", width: "100vw" };

export const UI: React.FC = () => {
  // const cst = cstEntity.use();
  // const ast = astEntity.use();
  const [logs, setLogs] = useState<any[]>([]);

  const ELEMENT_MAP = useMemo<{ [viewId: string]: JSX.Element }>(
    () => ({
      Code: <Editor></Editor>,
      Bril: <BrilEditor></BrilEditor>,
      Menu: <Sidebar></Sidebar>,
      View: (
        <Tabs size="sm" variant="enclosed" defaultIndex={0} isLazy={false} style={fullHeight}>
          <TabList>
            <Tab>CFG</Tab>
            <Tab>CST</Tab>
            <Tab>AST</Tab>
            <Tab>IR</Tab>
          </TabList>
          <TabPanels style={fullHeightNoMargin}>
            <TabPanel style={fullHeightNoMargin}>
              <CfgView></CfgView>
            </TabPanel>
            <TabPanel>
              <CstView></CstView>
            </TabPanel>
            <TabPanel>
              <AstView></AstView>
            </TabPanel>
            <TabPanel>
              <BrilView></BrilView>
            </TabPanel>
          </TabPanels>
        </Tabs>
      ),
      Console: <Console logs={logs} variant="light" filter={["info"]}></Console>,
    }),
    [logs]
  );

  useEffect(() => {
    Hook((window as any).console, (log) => setLogs((currLogs) => [...currLogs, log]), false);
    // return () => Unhook((window as any).console);
  }, []);

  return (
    <ChakraProvider>
      <div style={fullWindow}>
        <Mosaic<string>
          renderTile={(id, path) => (
            <MosaicWindow<string> path={path} createNode={() => "new"} title={id} toolbarControls={React.Children.toArray([<ExpandButton />])}>
              {ELEMENT_MAP[id]}
            </MosaicWindow>
          )}
          initialValue={{
            direction: "row",
            splitPercentage: 20,
            first: "Menu",
            second: {
              direction: "row",
              splitPercentage: 50,
              first: {
                direction: "column",
                first: "Code",
                second: "Bril",
                splitPercentage: 50,
              },
              second: {
                splitPercentage: 50,
                direction: "column",
                first: "View",
                second: "Console",
              },
            },
          }}
          blueprintNamespace="bp4"
        />
      </div>
    </ChakraProvider>
  );
};
