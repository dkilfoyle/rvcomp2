import { useEffect, useMemo, useRef, useState } from "react";
import { Options, Network } from "vis-network";
import { DataSet } from "vis-data";
import { Box, Grid, Select, Table, Tbody, Td, Th, Thead, Tr } from "@chakra-ui/react";

import "./regView.css";
import { ParseState, SettingsState, useParseStore, useSettingsStore } from "../store/zustore";
import { registerAllocation } from "../languages/bril/registers";
import _ from "lodash";

// const palette: Record<string, string> = {
//   S1: "#a6cee3",
//   S2: "#1f78b4",
//   S3: "#b2df8a",
//   S4: "#33a02c",
//   S5: "#fb9a99",
//   S6: "#e31a1c",
//   S7: "#fdbf6f",
//   S8: "#ff7f00",
//   S9: "#cab2d6",
//   S10: "#6a3d9a",
//   S11: "#ffff99",
//   // S0:"#b15928",
// };
const palette: Record<string, string> = {
  S1: "#8dd3c7",
  S2: "#ffffb3",
  S3: "#bebada",
  S4: "#fb8072",
  S5: "#80b1d3",
  S6: "#fdb462",
  S7: "#b3de69",
  S8: "#fccde5",
  S9: "#d9d9d9",
  S10: "#bc80bd",
  S11: "#ccebc5",
  // S7: "#ffed6f",
};

export const RegView = () => {
  const brilOptim = useParseStore((state: ParseState) => state.brilOptim);
  const functionName = useSettingsStore((state: SettingsState) => state.cfg.functionName);
  const [nodeName, setNodeName] = useState("None");
  const setSettings = useSettingsStore((state: SettingsState) => state.set);

  const visJsRef = useRef<HTMLDivElement>(null);
  let network: Network;

  const regAllo = useMemo(() => {
    const regAllo = registerAllocation(brilOptim, Object.keys(palette));
    console.log(regAllo);
    return regAllo;
  }, [brilOptim]);

  const visData = useMemo(() => {
    const { nodes, edges } = Object.keys(brilOptim.functions).length
      ? regAllo.graph[functionName].plot(regAllo.coloring[functionName] || {})
      : { nodes: [], edges: [] };
    const visEdges = edges.map((edge) => ({ ...edge, color: "black" }));
    const visNodes = nodes.map((node) => ({ ...node, color: palette[node.color] }));
    return { nodes: new DataSet(visNodes), edges: new DataSet(visEdges) };
  }, [brilOptim, functionName]);

  useEffect(() => {
    const options: Options = {
      // autoResize: true,
      // height: "90%",
      width: "100%",
      interaction: { hover: true },
    };
    if (visJsRef.current) {
      network = new Network(visJsRef.current, visData, options);
      network.on("hoverNode", (params) => {
        setNodeName(params.node);
      });
    }
  }, [visJsRef, visData]);

  const brilFunctionNames = useMemo(() => {
    return Object.keys(brilOptim.functions);
  }, [brilOptim]);

  useEffect(() => {
    if (network) network.setSize("1fr", "4fr");
  });

  const nodeInfo = useMemo(() => {
    const node = regAllo.coloring[functionName]![nodeName]!;
    if (_.isUndefined(node))
      return {
        variableName: "None",
        registerName: "",
        shared: "[]",
      };
    else
      return {
        variableName: nodeName,
        registerName: regAllo.coloring[functionName]![nodeName],
        shared: Object.entries(regAllo.coloring[functionName]!)
          .filter(([varName, regName]) => regName == node && varName != nodeName)
          .map(([varName, regName]) => varName)
          .join(", "),
      };
  }, [functionName, nodeName, regAllo]);

  return (
    <Grid templateRows="min-content 1fr min-content" h="100%">
      <Box p={2}>
        <Select
          size="sm"
          value={functionName}
          onChange={(e) => {
            setSettings((state: SettingsState) => {
              state.cfg.functionName = e.target.value;
            });
          }}>
          {brilFunctionNames.map((n, i) => (
            <option key={i} value={n}>
              {n}
            </option>
          ))}
        </Select>
      </Box>
      <Box ref={visJsRef} overflow="hidden"></Box>
      <Box p={2}>
        <Table id="regTable" w="100%" size="xs">
          <Thead>
            <Tr>
              <Th>Variable</Th>
              <Th>Register</Th>
              <Th>Shared</Th>
            </Tr>
          </Thead>
          <Tbody>
            <Tr>
              <Td>{nodeInfo.variableName}</Td>
              <Td>{nodeInfo.registerName}</Td>
              <Td>{nodeInfo.shared}</Td>
            </Tr>
          </Tbody>
        </Table>
      </Box>
    </Grid>
  );
};
