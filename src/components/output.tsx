import React, { useEffect, useRef, useState } from "react";

import { Console, Hook } from "console-feed";
import "overlayscrollbars/overlayscrollbars.css";
import { OverlayScrollbarsComponent, OverlayScrollbarsComponentRef } from "overlayscrollbars-react";
import { Flex, Grid, Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react";
import { useParseStore, ParseState, useSettingsStore, SettingsState } from "../store/zustore";
import { runInterpretor } from "../languages/bril/interp";
import { emitWasm } from "../languages/wasm/brilToWasm";
import { MemView } from "./memView";
import { runWasm } from "../languages/wasm/runWasm";
// import wabt from "wabt";
// const wabt = require("wabt")();

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

let display = new Uint8Array(10000);

window.conout1 = { ...window.console };
window.conout2 = { ...window.console };
window.conout3 = { ...window.console };

const fullHeight = { maxHeight: "100%" };

export const Output: React.FC = () => {
  const bril = useParseStore((state: ParseState) => state.bril);
  const brilOptim = useParseStore((state: ParseState) => state.brilOptim);
  const [isRunOptim, isRunUnoptim, isRunWasm, isRunAuto] = useSettingsStore((state: SettingsState) => [
    state.interp.isRunOptim,
    state.interp.isRunUnoptim,
    state.interp.isRunWasm,
    state.interp.isRunAuto,
  ]);

  const [unoptimlogs, setUnoptimLogs] = useState<any[]>([]);
  const [optimlogs, setOptimLogs] = useState<any[]>([]);
  const [wasmlogs, setWasmLogs] = useState<any[]>([]);

  const unoptimOutputRef = useRef<OverlayScrollbarsComponentRef>(null);
  const optimOutputRef = useRef<OverlayScrollbarsComponentRef>(null);
  const wasmOutputRef = useRef<OverlayScrollbarsComponentRef>(null);

  useEffect(() => {
    Hook((window as any).conout1, (log) => setUnoptimLogs((currLogs) => [...currLogs, log]), false);
    Hook((window as any).conout2, (log) => setOptimLogs((currLogs) => [...currLogs, log]), false);
    Hook((window as any).conout3, (log) => setWasmLogs((currLogs) => [...currLogs, log]), false);
    // return () => Unhook((window as any).console);
  }, []);

  useEffect(() => {
    setOptimLogs([]);
    setUnoptimLogs([]);
    if (isRunAuto) {
      if (isRunWasm && Object.keys(brilOptim.functions).length) {
        runWasm(bril).then((res) => {
          const canvas = document.getElementById("canvas") as HTMLCanvasElement;
          const context = canvas.getContext("2d");
          const imgData = context!.createImageData(100, 100);
          for (let i = 0; i < 100 * 100; i++) {
            imgData.data[i * 4] = res.screen[i];
            imgData.data[i * 4 + 1] = res.screen[i];
            imgData.data[i * 4 + 2] = res.screen[i];
            imgData.data[i * 4 + 3] = 255;
          }
          // const data = scaleImageData(imgData, 3, context);
          context!.putImageData(imgData, 0, 0);
        });
      }

      if (isRunUnoptim) runInterpretor(bril, [], window.conout1, "un-optimised");
      if (isRunOptim) {
        const display = runInterpretor(brilOptim, [], window.conout2, "optimised");
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
      }
    }
  }, [bril, brilOptim]);

  useEffect(() => {
    if (optimOutputRef.current && optimOutputRef.current.osInstance()) {
      const { viewport } = optimOutputRef.current.osInstance()!.elements();
      const { scrollLeft, scrollTop } = viewport; // get scroll offset
      const lc = viewport.lastChild as HTMLElement;
      const lc2 = lc.lastChild as HTMLElement;
      if (lc2) lc2.scrollIntoView();
    }
  }, [optimlogs, optimOutputRef.current]);

  useEffect(() => {
    if (unoptimOutputRef.current && unoptimOutputRef.current.osInstance()) {
      const { viewport } = unoptimOutputRef.current.osInstance()!.elements();
      const { scrollLeft, scrollTop } = viewport; // get scroll offset
      const lc = viewport.lastChild as HTMLElement;
      const lc2 = lc.lastChild as HTMLElement;
      if (lc2) lc2.scrollIntoView();
    }
  }, [unoptimlogs, unoptimOutputRef.current]);

  useEffect(() => {
    if (wasmOutputRef.current && wasmOutputRef.current.osInstance()) {
      const { viewport } = wasmOutputRef.current.osInstance()!.elements();
      const { scrollLeft, scrollTop } = viewport; // get scroll offset
      const lc = viewport.lastChild as HTMLElement;
      const lc2 = lc.lastChild as HTMLElement;
      if (lc2) lc2.scrollIntoView();
    }
  }, [wasmlogs, wasmOutputRef.current]);

  return (
    <Tabs size="sm" orientation="vertical" variant="soft-rounded" align="start" padding="4px" height="100%" overflow="hidden">
      <TabList justifyContent="start" backgroundColor="blue.50" padding="5px">
        <Tab>Bril</Tab>
        <Tab>Optimised</Tab>
        <Tab>Wasm</Tab>
      </TabList>
      <TabPanels height="100%">
        <TabPanel height="100%">
          <Grid templateColumns="1fr auto 120px" gap={6} height="100%">
            <OverlayScrollbarsComponent style={fullHeight} ref={unoptimOutputRef}>
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
          </Grid>
        </TabPanel>
        <TabPanel>
          <Grid templateColumns="1fr auto 120px" gap={6} height="100%">
            <OverlayScrollbarsComponent style={fullHeight} ref={optimOutputRef}>
              <Console
                logs={optimlogs}
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
          </Grid>
        </TabPanel>
        <TabPanel height="100%" padding="4px">
          <Grid templateColumns="1fr auto 120px" gap={6} height="100%">
            <OverlayScrollbarsComponent style={fullHeight} ref={wasmOutputRef}>
              <Console
                logs={wasmlogs}
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
            <MemView mem={display}></MemView>
            <Grid borderLeft="1px solid lightgrey">
              <canvas id="canvas" width="100" height="100" style={{ margin: "auto" }}></canvas>
            </Grid>
          </Grid>
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
};
