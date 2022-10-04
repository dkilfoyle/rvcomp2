import { Editor } from "../components/simpleCEditor/Editor";
import { ExpandButton, Mosaic, MosaicWindow } from "react-mosaic-component";
import React from "react";
import "react-mosaic-component/react-mosaic-component.css";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "./ui.css";
import { JSONTree } from "react-json-tree";
import { astEntity, cstEntity } from "../store/ParseState";

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

  const ELEMENT_MAP: { [viewId: string]: JSX.Element } = {
    Code: <Editor></Editor>,
    Menu: <div>Menu</div>,
    CST: (
      <div>
        <JSONTree data={cst} theme={theme} invertTheme></JSONTree>
      </div>
    ),
    AST: (
      <div>
        <JSONTree data={ast} theme={theme} invertTheme></JSONTree>
      </div>
    ),
  };

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Mosaic<string>
        renderTile={(id, path) => (
          <MosaicWindow<string> path={path} createNode={() => "new"} title={id} toolbarControls={React.Children.toArray([<ExpandButton />])}>
            {ELEMENT_MAP[id]}
          </MosaicWindow>
        )}
        initialValue={{
          direction: "row",
          splitPercentage: 10,
          first: "Menu",
          second: {
            direction: "row",
            splitPercentage: 30,
            first: "Code",
            second: {
              direction: "row",
              splitPercentage: 32,
              first: "CST",
              second: "AST",
            },
          },
        }}
        blueprintNamespace="bp4"
      />
    </div>
  );
};
