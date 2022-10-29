import { Editor } from "../components/simpleCEditor/Editor";
import { ExpandButton, Mosaic, MosaicWindow } from "react-mosaic-component";
import React, { useMemo } from "react";
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

export const UI: React.FC = () => {
  const cst = cstEntity.use();
  const ast = astEntity.use();

  const ELEMENT_MAP: { [viewId: string]: JSX.Element } = useMemo(
    () => ({
      Code: <Editor></Editor>,
      Bril: <BrilEditor></BrilEditor>,
      Menu: <Sidebar></Sidebar>,
      View: (
        <Tabs size="sm" variant="enclosed" defaultIndex={0} isLazy={false} style={{ height: "100%" }}>
          <TabList>
            <Tab>CFG</Tab>
            <Tab>CST</Tab>
            <Tab>AST</Tab>
            <Tab>IR</Tab>
          </TabList>
          <TabPanels style={{ height: "100%", margin: "0px" }}>
            <TabPanel style={{ height: "100%", padding: "0px" }}>
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
    }),
    [cst, ast]
  );

  return (
    <ChakraProvider>
      <div style={{ width: "100vw", height: "100vh" }}>
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
                splitPercentage: 70,
              },
              second: "View",
            },
          }}
          blueprintNamespace="bp4"
        />
      </div>
    </ChakraProvider>
  );
};
