import React, { useEffect, useMemo, useRef, useState } from "react";

import { Console, Hook } from "console-feed";
import "overlayscrollbars/overlayscrollbars.css";
import { OverlayScrollbarsComponent, OverlayScrollbarsComponentRef } from "overlayscrollbars-react";
import {
  Box,
  Button,
  ButtonGroup,
  Divider,
  Flex,
  Grid,
  HStack,
  Icon,
  IconButton,
  Tab,
  Table,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import { useParseStore, ParseState, useSettingsStore, SettingsState } from "../store/zustore";
import { Env, IHeapVar, Pointer, runInterpretor } from "../languages/bril/interp";
import { emitWasm } from "../languages/wasm/brilToWasm";
import { MemView } from "./memView";
import { IRuntimeOptions, runWasm } from "../languages/wasm/runWasm";

import "./output.css";
import { GiSlowBlob } from "react-icons/gi";
import { FaRunning, FaShippingFast } from "react-icons/fa";
import { BsCpu } from "react-icons/bs";
import { SiWebassembly } from "react-icons/si";
import { VscDebugRerun, VscDebugStepOver } from "react-icons/vsc";
import { BrilTypeByteSize, IBrilDataSegment, IBrilPrimType } from "../languages/bril/BrilInterface";
import _ from "lodash";
import { riscvCodeGenerator } from "../languages/riscv/brilToRiscV";
import { Computer } from "../languages/riscv/simulator/System";
import { regNum } from "../languages/riscv/emitter";

window.conout1 = { ...window.console };
window.conout2 = { ...window.console };
window.conout3 = { ...window.console };
window.conout4 = { ...window.console };

const fullHeight = { maxHeight: "100%" };

const segments: Record<string, Record<string, number[]>> = {
  bril: { screen: [0, 100 * 100 * 4], data: [40960, 40960], heap: [40960, 40960], text: [0, 0] },
  brilOptim: { screen: [0, 100 * 100 * 4], data: [40960, 40960], heap: [40960, 40960], text: [0, 0] },
  wasm: { screen: [0, 100 * 100 * 4], data: [40960, 40960], heap: [40960, 40960], text: [0, 0] },
  riscv: { screen: [0, 100 * 100 * 4], data: [40960, 40960], heap: [40960, 40960], text: [0, 0] },
};

const paintScreen = (canvasId: string, mem: Uint8ClampedArray) => {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  const context = canvas.getContext("2d");
  const imgData = context!.createImageData(100, 100);
  // for (let i = 0; i < 100 * 100; i++) {
  //   imgData.data[i * 4] = mem[i * 4];
  //   imgData.data[i * 4 + 1] = mem[i * 4 + 1];
  //   imgData.data[i * 4 + 2] = mem[i * 4 + 2];
  //   imgData.data[i * 4 + 3] = 255;
  // }
  imgData.data.set(mem.slice(0, imgData.data.length));
  context!.putImageData(imgData, 0, 0);
};

let brilHeapVars: IHeapVar[] = [];
let optimHeapVars: IHeapVar[] = [];
let brilData: IBrilDataSegment;
let optimData: IBrilDataSegment;

export const Output: React.FC = () => {
  const [bril, brilOptim, riscv] = useParseStore((state: ParseState) => [state.bril, state.brilOptim, state.riscv]);
  const [isRunOptim, isRunUnoptim, isRunWasm, isRunRiscv, isRunAuto] = useSettingsStore((state: SettingsState) => [
    state.interp.isRunOptim,
    state.interp.isRunUnoptim,
    state.interp.isRunWasm,
    state.interp.isRunRiscv,
    state.interp.isRunAuto,
  ]);

  const [brilMemory, setBrilMemory] = useState<Uint8ClampedArray>(new Uint8ClampedArray(64 * 1024));
  const [optimMemory, setOptimMemory] = useState<Uint8ClampedArray>(new Uint8ClampedArray(64 * 1024));
  const [wasmMemory, setWasmMemory] = useState<Uint8ClampedArray>(new Uint8ClampedArray(64 * 1024));
  const [riscvMemory, setRiscvMemory] = useState<Uint8ClampedArray>(new Uint8ClampedArray(64 * 1024));

  const [riscvRegisters, setRiscvRegisters] = useState<number[]>([]);

  const [unoptimlogs, setUnoptimLogs] = useState<any[]>([]);
  const [optimlogs, setOptimLogs] = useState<any[]>([]);
  const [wasmlogs, setWasmLogs] = useState<any[]>([]);
  const [riscvlogs, setRiscvLogs] = useState<any[]>([]);

  const [showScreen, setShowScreen] = useState<boolean>(true);
  const [showMem, setShowMem] = useState<boolean>(true);

  const unoptimOutputRef = useRef<OverlayScrollbarsComponentRef>(null);
  const optimOutputRef = useRef<OverlayScrollbarsComponentRef>(null);
  const wasmOutputRef = useRef<OverlayScrollbarsComponentRef>(null);
  const riscvOutputRef = useRef<OverlayScrollbarsComponentRef>(null);

  const [mainName, loopName] = useSettingsStore((state: SettingsState) => [state.interp.mainName, state.interp.loopName]);
  const mainArgs = useSettingsStore((state: SettingsState) => state.interp.mainArgs);
  const [loopDelay, loopTimes] = useSettingsStore((state: SettingsState) => [state.interp.loopDelay, state.interp.loopTimes]);

  useEffect(() => {
    Hook((window as any).conout1, (log) => setUnoptimLogs((currLogs) => [...currLogs, log]), false);
    Hook((window as any).conout2, (log) => setOptimLogs((currLogs) => [...currLogs, log]), false);
    Hook((window as any).conout3, (log) => setWasmLogs((currLogs) => [...currLogs, log]), false);
    Hook((window as any).conout4, (log) => setRiscvLogs((currLogs) => [...currLogs, log]), false);
    // return () => Unhook((window as any).console);
  }, []);

  const brilInterpWorker: Worker = useMemo(() => {
    return new Worker(new URL("../languages/bril/interp.ts", import.meta.url), { type: "module" });
  }, []);

  const riscvInterpWorker: Worker = useMemo(() => {
    return new Worker(new URL("../languages/riscv/simulator/System.ts", import.meta.url), { type: "module" });
  }, []);

  const run = (runMain: boolean = true, optimLevel: string, loops: number | undefined = undefined) => {
    if (optimLevel == "optim" && isRunWasm && Object.keys(brilOptim.functions).length && wasmByteCode) {
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
        setWasmMemory(new Uint8ClampedArray(res.memory.buffer, 0, res.heap_pointer));
        segments.wasm.data[1] = 40960 + Math.max(0, brilOptim.dataSize - 1);
        segments.wasm.heatp = [40960 + brilOptim.dataSize, res.heap_pointer - 1];
      });
    }

    if (optimLevel == "unoptim" && isRunUnoptim && Object.keys(bril.functions).length) {
      setUnoptimLogs([]);
      brilInterpWorker.postMessage({
        action: "main",
        payload: { prog: bril, args: [], optimLevel: "un-optimised" },
      });
    }

    if (optimLevel == "optim" && isRunOptim && Object.keys(brilOptim.functions).length) {
      setOptimLogs([]);
      brilInterpWorker.postMessage({
        action: "main",
        payload: { prog: brilOptim, args: [], optimLevel: "optimised" },
      });
    }

    if (optimLevel == "optim" && isRunRiscv && riscv.memWords.length && Object.keys(brilOptim.functions).length) {
      setRiscvLogs([]);
      riscvInterpWorker.postMessage({
        action: "main",
        payload: { memWords: riscv.memWords, metas: riscv.metas, optimLevel: "optimised" },
      });
    }
  };

  useEffect(() => {
    brilInterpWorker.onmessage = ({ data }) => {
      const { action, payload } = data;
      switch (action) {
        case "done":
          const { res, optimLevel } = payload;
          // console.log("done", res);
          if (optimLevel == "optimised") {
            setOptimMemory(new Uint8ClampedArray(res.memory.buffer));
            optimHeapVars = res.heap;
            optimData = res.data;
            segments.brilOptim.data[1] = res.heap_start - 1; // Math.max(0, bril.dataSize - 1);
            segments.brilOptim.heap = [res.heap_start, res.heap_pointer - 1]; // 40960 + bril.dataSize;
          } else if (optimLevel == "un-optimised") {
            setBrilMemory(new Uint8ClampedArray(res.memory.buffer));
            brilHeapVars = res.heap;
            brilData = res.data;
            segments.bril.data[1] = res.heap_start - 1; // Math.max(0, bril.dataSize - 1);
            segments.bril.heap = [res.heap_start, res.heap_pointer - 1]; // 40960 + bril.dataSize;
          }
          break;
        case "render": {
          const { memory, optimLevel } = payload;
          switch (optimLevel) {
            case "optimised":
              setOptimMemory(new Uint8ClampedArray(memory.buffer));
              break;
            case "un-optimised":
              setBrilMemory(new Uint8ClampedArray(memory.buffer));
              break;
          }
          break;
        }
        case "log":
          const { id, level, logmsg, dump } = payload;
          const con = id == "console" ? window.conout0 : window.conout2;
          const logger = con[level as "warn" | "info" | "log" | "error"];
          if (logmsg != "") {
            if (!_.isUndefined(dump)) logger(logmsg, dump);
            else logger(logmsg);
          } else {
            logger(dump);
          }
          break;
      }
    };
  }, [brilInterpWorker]);

  useEffect(() => {
    riscvInterpWorker.onmessage = ({ data }) => {
      const { action, payload } = data;
      switch (action) {
        case "done":
          const computer: Computer = payload.computer;
          console.log("riscv done", computer);
          setRiscvMemory(new Uint8ClampedArray(computer.mem.data));
          setRiscvRegisters(computer.cpu.x);

          segments.riscv.screen = [0, 0];
          segments.riscv.text = [riscv.textStart, riscv.dataStart - 4];
          segments.riscv.data = [riscv.dataStart, riscv.heapStart - 4];
          segments.riscv.heap = [riscv.heapStart, 4096]; // todo: extra heap pointer from cpu register
          break;
        case "render": {
          // const { memory, optimLevel } = payload;
          // switch (optimLevel) {
          //   case "optimised":
          //     setOptimMemory(new Uint8ClampedArray(memory.buffer));
          //     break;
          //   case "un-optimised":
          //     setBrilMemory(new Uint8ClampedArray(memory.buffer));
          //     break;
          // }
          break;
        }
        case "log":
          const { id, level, logmsg, dump } = payload;
          const con = id == "console" ? window.conout0 : window.conout4;
          const logger = con[level as "warn" | "info" | "log" | "error"];
          if (logmsg != "") {
            if (!_.isUndefined(dump)) logger(logmsg, dump);
            else logger(logmsg);
          } else {
            logger(dump);
          }
          break;
      }
    };
  }, [riscvInterpWorker, riscv]);

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
      run(true, "unoptim");
    }
  }, [bril, isRunAuto, isRunUnoptim]);

  useEffect(() => {
    if (isRunAuto) {
      run(true, "optim");
    }
  }, [brilOptim, isRunAuto, isRunWasm, isRunOptim, riscv]);

  useEffect(() => {
    if (showScreen && brilMemory.byteLength > 0) paintScreen("brilCanvas", brilMemory);
  }, [brilMemory, showScreen]);

  useEffect(() => {
    if (showScreen && optimMemory.byteLength > 0) paintScreen("optimCanvas", optimMemory);
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

  useEffect(() => {
    if (riscvOutputRef.current && riscvOutputRef.current.osInstance()) {
      const { viewport } = riscvOutputRef.current.osInstance()!.elements();
      const { scrollLeft, scrollTop } = viewport; // get scroll offset
      const lc = viewport.lastChild as HTMLElement;
      const lc2 = lc.lastChild as HTMLElement;
      if (lc2) lc2.scrollIntoView();
    }
  }, [riscvlogs, riscvOutputRef.current]);

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

  const registerTable = useMemo(() => {
    const regNames = Object.keys(regNum);
    return riscvRegisters.map((x, i) => {
      return (
        <Tr key={"x" + i}>
          <Th>{regNames[i]}</Th>
          <Td>{x}</Td>
        </Tr>
      );
    });
  }, [riscvRegisters]);

  return (
    <Tabs defaultIndex={3} size="sm" orientation="vertical" padding="4px" height="100%" overflow="hidden" borderColor="whitesmoke">
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
        <Tab>
          <Icon as={BsCpu} />
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
            {showMem ? <MemView mem={brilMemory} segments={segments.bril} heapVars={brilHeapVars}></MemView> : memButton}
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
            {showMem ? (
              <MemView mem={optimMemory} segments={segments.brilOptim} heapVars={optimHeapVars} dataSegment={optimData}></MemView>
            ) : (
              memButton
            )}
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
            {showMem ? <MemView mem={wasmMemory} segments={segments.wasm}></MemView> : memButton}
            <Divider orientation="vertical" size="sm"></Divider>
            <Grid templateRows="auto auto 1fr" gap="2" height="100%">
              <HStack>
                <IconButton size="xs" aria-label="main" icon={<VscDebugRerun />} onClick={() => run(true, "optim", 0)} />
                <IconButton size="xs" aria-label="loop" icon={<VscDebugStepOver />} onClick={() => run(false, "optim", 1)} />
              </HStack>
              <Divider></Divider>
              {showScreen ? <canvas id="wasmCanvas" width="100" height="100" style={{ margin: "auto" }}></canvas> : screenButton}
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel height="100%" padding="4px">
          <Grid templateColumns="minmax(100px,1fr) auto 80px auto auto auto auto" gap="2" height="100%">
            <OverlayScrollbarsComponent style={fullHeight} ref={riscvOutputRef}>
              <Console
                logs={riscvlogs}
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
            <OverlayScrollbarsComponent style={fullHeight} ref={riscvOutputRef}>
              <Table id="registerTable" size="xs">
                <Tbody>{registerTable}</Tbody>
              </Table>
            </OverlayScrollbarsComponent>
            <Divider orientation="vertical" size="sm"></Divider>
            {showMem ? <MemView mem={riscvMemory} segments={segments.riscv}></MemView> : memButton}
            <Divider orientation="vertical" size="sm"></Divider>
            <Grid templateRows="auto auto 1fr" gap="2" height="100%">
              <HStack>
                <IconButton size="xs" aria-label="main" icon={<VscDebugRerun />} onClick={() => run(true, "optim", 0)} />
                <IconButton size="xs" aria-label="loop" icon={<VscDebugStepOver />} onClick={() => run(false, "optim", 1)} />
              </HStack>
              <Divider></Divider>
              {showScreen ? <canvas id="riscvCanvas" width="100" height="100" style={{ margin: "auto" }}></canvas> : screenButton}
            </Grid>
          </Grid>
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
};
