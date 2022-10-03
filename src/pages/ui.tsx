import { Editor } from "../components/simpleCEditor/Editor";
import { ExpandButton, Mosaic, MosaicWindow } from "react-mosaic-component";
import React from "react";
import "react-mosaic-component/react-mosaic-component.css";
import "./ui.css";

export const UI: React.FC = () => {
  const ELEMENT_MAP: { [viewId: string]: JSX.Element } = {
    Code: <Editor></Editor>,
    Menu: <div>Menu</div>,
    CST: <div>CST</div>,
    AST: <div>AST</div>,
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
