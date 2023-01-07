import React, { useEffect, useRef, useState } from "react";

import { Console, Hook } from "console-feed";
import "overlayscrollbars/overlayscrollbars.css";
import { OverlayScrollbarsComponent, OverlayScrollbarsComponentRef } from "overlayscrollbars-react";
import { Flex, Grid } from "@chakra-ui/react";
import { useParseStore, ParseState } from "../store/zustore";
import { runInterpretor } from "../languages/bril/interp";

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

window.conout1 = { ...window.console };
window.conout2 = { ...window.console };

const fullHeight = { maxHeight: "100%" };

export const Output: React.FC = () => {
  const bril = useParseStore((state: ParseState) => state.bril);
  const brilOptim = useParseStore((state: ParseState) => state.brilOptim);

  const [unoptimlogs, setUnoptimLogs] = useState<any[]>([]);
  const [optimlogs, setOptimLogs] = useState<any[]>([]);

  const unoptimOutputRef = useRef<OverlayScrollbarsComponentRef>(null);
  const optimOutputRef = useRef<OverlayScrollbarsComponentRef>(null);

  useEffect(() => {
    Hook((window as any).conout1, (log) => setUnoptimLogs((currLogs) => [...currLogs, log]), false);
    Hook((window as any).conout2, (log) => setOptimLogs((currLogs) => [...currLogs, log]), false);
    // return () => Unhook((window as any).console);
  }, []);

  useEffect(() => {
    setOptimLogs([]);
    setUnoptimLogs([]);
    runInterpretor(bril, [], window.conout1);
    const display = runInterpretor(brilOptim, [], window.conout2);
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    const context = canvas.getContext("2d");
    const imgData = context!.createImageData(100, 100);
    for (let i = 0; i < 100 * 100; i++) {
      imgData.data[i * 4] = display[i];
      imgData.data[i * 4 + 1] = display[i];
      imgData.data[i * 4 + 2] = display[i];
      imgData.data[i * 4 + 3] = 255;
    }
    // const data = scaleImageData(imgData, 3, context);
    context!.putImageData(imgData, 0, 0);
  }, [bril, brilOptim]);

  return (
    <Grid templateColumns="1fr 1fr 150px" gap={6} height="100%">
      <OverlayScrollbarsComponent defer style={fullHeight}>
        <Console
          logs={unoptimlogs}
          variant="light"
          // filter={["info"]}
          styles={{
            BASE_FONT_SIZE: 10,
            BASE_LINE_HEIGHT: 0.8,
            LOG_INFO_ICON: "",
            // LOG_ICON_WIDTH: "8px",
            // LOG_ICON_HEIGHT: "8px",
            TREENODE_FONT_SIZE: 8,
            BASE_BACKGROUND_COLOR: "white",
            LOG_BACKGROUND: "white",
          }}></Console>
      </OverlayScrollbarsComponent>

      <OverlayScrollbarsComponent defer style={fullHeight}>
        <Console
          logs={optimlogs}
          variant="light"
          // filter={["info"]}
          styles={{
            BASE_FONT_SIZE: 10,
            BASE_LINE_HEIGHT: 0.8,
            LOG_INFO_ICON: "",
            // LOG_ICON_WIDTH: 2,
            // LOG_ICON_HEIGHT: 2,
            TREENODE_FONT_SIZE: 8,
            BASE_BACKGROUND_COLOR: "white",
            LOG_BACKGROUND: "white",
          }}></Console>
      </OverlayScrollbarsComponent>
      <Grid borderLeft="1px solid lightgrey">
        <canvas id="canvas" width="100" height="100" style={{ margin: "auto" }}></canvas>
      </Grid>
    </Grid>
  );
};
