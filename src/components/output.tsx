import React, { useEffect, useMemo, useRef, useState } from "react";

import { Console, Hook } from "console-feed";
import "overlayscrollbars/overlayscrollbars.css";
import { OverlayScrollbarsComponent, OverlayScrollbarsComponentRef } from "overlayscrollbars-react";
import { Button, ButtonGroup, Divider, Flex, Grid, HStack, Icon, IconButton, Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react";
import { useParseStore, ParseState, useSettingsStore, SettingsState } from "../store/zustore";
import { runInterpretor } from "../languages/bril/interp";
import { emitWasm } from "../languages/wasm/brilToWasm";
import { MemView } from "./memView";
import { IRuntimeOptions, runWasm } from "../languages/wasm/runWasm";

import "./output.css";
import { GiSlowBlob } from "react-icons/gi";
import { FaRunning, FaShippingFast } from "react-icons/fa";
import { SiWebassembly } from "react-icons/si";
import { VscDebugRerun, VscDebugStepOver } from "react-icons/vsc";

let brilMemory = new Uint8Array();
let optimMemory = new Uint8Array();
let wasmMemory = new Uint8Array();

window.conout1 = { ...window.console };
window.conout2 = { ...window.console };
window.conout3 = { ...window.console };

const fullHeight = { maxHeight: "100%" };

const segments = [
  {
    name: "Screen",
    start: 0,
    end: 100 * 100 - 1,
  },
  { name: "Data", start: 10240, end: 10240 },
  { name: "Heap", start: 10240, end: 10240 },
];

const paintScreen = (canvasId: string, mem: Uint8Array) => {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  const context = canvas.getContext("2d");
  const imgData = context!.createImageData(100, 100);
  for (let i = 0; i < 100 * 100; i++) {
    imgData.data[i * 4] = mem[i];
    imgData.data[i * 4 + 1] = mem[i];
    imgData.data[i * 4 + 2] = mem[i];
    imgData.data[i * 4 + 3] = 255;
  }
  context!.putImageData(imgData, 0, 0);
};

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

  const [showScreen, setShowScreen] = useState<boolean>(true);
  const [showMem, setShowMem] = useState<boolean>(true);

  const unoptimOutputRef = useRef<OverlayScrollbarsComponentRef>(null);
  const optimOutputRef = useRef<OverlayScrollbarsComponentRef>(null);
  const wasmOutputRef = useRef<OverlayScrollbarsComponentRef>(null);

  const [mainName, loopName] = useSettingsStore((state: SettingsState) => [state.interp.mainName, state.interp.loopName]);
  const mainArgs = useSettingsStore((state: SettingsState) => state.interp.mainArgs);
  const [loopDelay, loopTimes] = useSettingsStore((state: SettingsState) => [state.interp.loopDelay, state.interp.loopTimes]);

  useEffect(() => {
    Hook((window as any).conout1, (log) => setUnoptimLogs((currLogs) => [...currLogs, log]), false);
    Hook((window as any).conout2, (log) => setOptimLogs((currLogs) => [...currLogs, log]), false);
    Hook((window as any).conout3, (log) => setWasmLogs((currLogs) => [...currLogs, log]), false);
    // return () => Unhook((window as any).console);
  }, []);

  const run = (runMain: boolean = true, loops: number | undefined = undefined) => {
    if (isRunWasm && Object.keys(brilOptim.functions).length && wasmByteCode) {
      setWasmLogs([]);

      const runtime: IRuntimeOptions = {
        canvasId: "wasmCanvas",
        mainFn: runMain ? mainName : "",
        mainArgs: mainArgs
          .replace(" ", "")
          .split(",")
          .map((x) => Number(x)),
        loopFn: loopName,
        loopDelay: loopDelay,
        loopTimes: typeof loops == "undefined" ? loopTimes : loops,
      };
      runWasm(wasmByteCode, runtime).then((res) => {
        wasmMemory = new Uint8Array(res.memory.buffer, 0, res.heap_pointer);
        segments[1].end = 40960 + Math.max(0, brilOptim.dataSize - 1);
        segments[2].start = 40960 + brilOptim.dataSize;
        segments[2].end = res.heap_pointer - 1;
      });
    }

    if (isRunUnoptim) {
      setUnoptimLogs([]);
      brilMemory = runInterpretor(bril, [], window.conout1, "un-optimised");
    }
    if (isRunOptim) {
      setOptimLogs([]);
      optimMemory = runInterpretor(brilOptim, [], window.conout2, "optimised");
    }
  };

  const wasmByteCode = useMemo(() => {
    if (Object.keys(brilOptim.functions).length == 0) return;
    let wasmByteCode: Uint8Array;
    try {
      wasmByteCode = emitWasm(brilOptim);
    } catch (e) {
      window.conout3.log(`emitWasm error: ${e}`);
      return;
    }
    return wasmByteCode;
  }, [brilOptim]);

  useEffect(() => {
    if (isRunAuto) {
      run(true);
    }
  }, [bril, brilOptim, isRunAuto, isRunWasm, isRunUnoptim, isRunOptim]);

  useEffect(() => {
    if (showScreen) paintScreen("brilCanvas", brilMemory);
  }, [brilMemory, showScreen]);

  useEffect(() => {
    if (showScreen) paintScreen("optimCanvas", optimMemory);
  }, [optimMemory, showScreen]);

  // useEffect(() => {
  //   if (showScreen) paintScreen("wasmCanvas", wasmMemory);
  // }, [wasmMemory, showScreen]);

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

  const screenButton = (
    <div className="verticalButton">
      <span onClick={() => setShowScreen(true)}>Screen</span>
    </div>
  );

  const memButton = (
    <div className="verticalButton">
      <span>Memory</span>
    </div>
  );

  return (
    <Tabs defaultIndex={2} size="sm" orientation="vertical" padding="4px" height="100%" overflow="hidden" borderColor="whitesmoke">
      <TabList background="whitesmoke" width="40px">
        <Tab>
          <Icon as={GiSlowBlob} />
        </Tab>
        <Tab>
          <Icon as={FaShippingFast} />
        </Tab>
        <Tab>
          <Icon as={SiWebassembly} />
        </Tab>
      </TabList>
      <TabPanels height="100%">
        <TabPanel height="100%">
          <Grid templateColumns="1fr auto auto auto auto" gap="2" height="100%">
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
            <Divider orientation="vertical" size="sm"></Divider>
            {showMem ? <MemView mem={brilMemory} segments={segments}></MemView> : memButton}
            <Divider orientation="vertical" size="sm"></Divider>
            {showScreen ? <canvas id="brilCanvas" width="100" height="100" style={{ margin: "auto" }}></canvas> : screenButton}
          </Grid>
        </TabPanel>
        <TabPanel height="100%">
          <Grid templateColumns="1fr auto auto auto auto" gap="2" height="100%">
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
            <Divider orientation="vertical" size="sm"></Divider>
            {showMem ? <MemView mem={optimMemory} segments={segments}></MemView> : memButton}
            <Divider orientation="vertical" size="sm"></Divider>
            {showScreen ? <canvas id="optimCanvas" width="100" height="100" style={{ margin: "auto" }}></canvas> : screenButton}
          </Grid>
        </TabPanel>
        <TabPanel height="100%" padding="4px">
          <Grid templateColumns="1fr auto auto auto auto" gap="2" height="100%">
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

            <Divider orientation="vertical" size="sm"></Divider>
            {showMem ? <MemView mem={wasmMemory} segments={segments}></MemView> : memButton}
            <Divider orientation="vertical" size="sm"></Divider>
            <Grid templateRows="auto auto 1fr" gap="2" height="100%">
              <HStack>
                <IconButton size="xs" aria-label="main" icon={<VscDebugRerun />} onClick={() => run(true, 0)} />
                <IconButton size="xs" aria-label="loop" icon={<VscDebugStepOver />} onClick={() => run(false, 1)} />
              </HStack>
              <Divider></Divider>
              {showScreen ? <canvas id="wasmCanvas" width="100" height="100" style={{ margin: "auto" }}></canvas> : screenButton}
            </Grid>
          </Grid>
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
};
