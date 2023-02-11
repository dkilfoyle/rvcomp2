import React, { useEffect, useMemo, useRef, useState } from "react";

import { Console, Hook } from "console-feed";
import "overlayscrollbars/overlayscrollbars.css";
import { OverlayScrollbarsComponent, OverlayScrollbarsComponentRef } from "overlayscrollbars-react";
import { Grid, Tag, TagLabel, TagLeftIcon, VStack } from "@chakra-ui/react";
import { CheckCircleIcon, CloseIcon, QuestionIcon, WarningIcon } from "@chakra-ui/icons";
import { useParseStore, ParseState } from "../store/zustore";
import { IBrilProgram } from "../languages/bril/BrilInterface";
import { brilBuilder } from "../languages/bril/BrilBuilder";

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

const statusLookup = {
  good: {
    color: "green",
    icon: CheckCircleIcon,
  },
  bad: { color: "red", icon: WarningIcon },
  na: { color: "gray", icon: QuestionIcon },
};

const makeTag = (item: string, data: string, status: "good" | "bad" | "na") => {
  return (
    <Tag size="sm" borderRadius="full" colorScheme={statusLookup[status].color} key={item} width="100%" height="30px" fontSize="8pt">
      <TagLeftIcon boxSize="12px" as={statusLookup[status].icon}></TagLeftIcon>
      <TagLabel width="100%">
        <Grid templateColumns="auto 1fr" width="100%">
          <span>{item}:</span>
          <span style={{ textAlign: "right", fontWeight: "bolder" }}>{data}</span>
        </Grid>
      </TagLabel>
    </Tag>
  );
};
const countInstructions = (bril: IBrilProgram) => {
  return Object.values(bril.functions).reduce((accum, curFn) => (accum += curFn.instrs.length), 0);
};

window.conout0 = { ...window.console };

export const Consoler: React.FC = () => {
  const { cst, ast, bril, brilOptim, errors, wasm } = useParseStore((state: ParseState) => ({
    cst: state.cst,
    ast: state.ast,
    bril: state.bril,
    brilOptim: state.brilOptim,
    errors: state.errors,
    wasm: state.wasm,
  }));
  // const ast = useParseStore((state: ParseState) => state.ast);
  // const bril = useParseStore((state: ParseState) => state.bril);
  // const wasm = useParseStore((state: ParseState) => state.bril);
  // const brilOptim = useParseStore((state: ParseState) => state.brilOptim);
  // const errors = useParseStore((state: ParseState) => state.errors);
  const [logs, setLogs] = useState<any[]>([]);

  const consoleScollRef = useRef<OverlayScrollbarsComponentRef>(null);

  useEffect(() => {
    Hook((window as any).conout0, (log) => setLogs((currLogs) => [...currLogs, log]), false);
    // return () => Unhook((window as any).console);
  }, []);

  const statusTags = useMemo(() => {
    const tags = [];
    if (errors.length == 0) {
      tags.push(makeTag("Parser", `${ast.functionDeclarations.length} funs`, "good"));
      if (Object.keys(bril.functions).length > 0) {
        tags.push(makeTag("Compiler", `${countInstructions(bril)} instr`, "good"));
        if (Object.keys(brilOptim.functions).length > 0) {
          tags.push(makeTag("Optimiser", `${countInstructions(brilOptim)} instr`, "good"));
          if (wasm.length > 0) {
            tags.push(makeTag("CodeGen", `${wasm.length} bytes`, "good"));
          } else {
            tags.push(makeTag("CodeGen", `error(s)`, "bad"));
          }
        } else {
          tags.push(makeTag("Optimiser", `error(s)`, "bad"));
          tags.push(makeTag("CodeGen", `NA`, "na"));
        }
      } else {
        tags.push(makeTag("Compiler", `${errors.length} instr`, "bad"));
        tags.push(makeTag("Optimiser", `NA`, "na"));
        tags.push(makeTag("CodeGen", `NA`, "na"));
      }
    } else {
      tags.push(makeTag("Parser", `${errors.length} errors`, "bad"));
      tags.push(makeTag("Compiler", `NA`, "na"));
      tags.push(makeTag("Optimiser", `NA`, "na"));
      tags.push(makeTag("CodeGen", `NA`, "na"));
    }
    return tags;
  }, [ast, cst, bril, brilOptim, wasm, errors]);

  return (
    <Grid templateColumns="auto 1fr" height="100%" gap={2}>
      {/* <Grid gap={0.5} p={2} borderRight="1px solid lightgrey" minWidth="180px"> */}
      <VStack p="5px">{statusTags.map((tag) => tag)}</VStack>
      {/* </Grid> */}
      <OverlayScrollbarsComponent defer style={{ height: "100%", marginTop: "3px", marginBottom: "3px" }}>
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
    </Grid>
  );
};
