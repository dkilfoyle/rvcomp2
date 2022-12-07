import React, { useEffect, useRef, useState } from "react";

import { Console, Hook } from "console-feed";
import "overlayscrollbars/overlayscrollbars.css";
import { OverlayScrollbarsComponent, OverlayScrollbarsComponentRef } from "overlayscrollbars-react";

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

const fullHeight = { maxHeight: "100%" };
const fullHeight2 = { height: "100%", display: "flex", flexDirection: "column" };
const fullHeightNoMargin = { height: "100%", margin: "0px", padding: "0px" };
const fullWindow = { height: "100vh", width: "100vw" };

export const Consoler: React.FC = () => {
  // const cst = cstEntity.use();
  // const ast = astEntity.use();
  const [logs, setLogs] = useState<any[]>([]);

  const consoleScollRef = useRef<OverlayScrollbarsComponentRef>(null);

  useEffect(() => {
    Hook((window as any).console, (log) => setLogs((currLogs) => [...currLogs, log]), false);
    // return () => Unhook((window as any).console);
  }, []);

  return (
    <OverlayScrollbarsComponent defer style={fullHeight}>
      <Console
        logs={logs}
        variant="light"
        filter={["info"]}
        styles={{
          BASE_FONT_SIZE: 10,
          BASE_LINE_HEIGHT: 0.8,
          LOG_INFO_ICON: "",
          LOG_ICON_WIDTH: 0,
          TREENODE_FONT_SIZE: 8,
          BASE_BACKGROUND_COLOR: "white",
          LOG_BACKGROUND: "white",
        }}></Console>
    </OverlayScrollbarsComponent>
  );
};
