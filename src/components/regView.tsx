import { useEffect, useMemo, useRef } from "react";
import { Options, Network } from "vis-network";
import { DataSet } from "vis-data";
import { Box } from "@chakra-ui/react";

import "./cfgView.css";
import { ParseState, SettingsState, useParseStore, useSettingsStore } from "../store/zustore";
import { registerAllocation } from "../languages/bril/registers";

export const RegView = () => {
  const brilOptim = useParseStore((state: ParseState) => state.brilOptim);
  const functionName = useSettingsStore((state: SettingsState) => state.cfg.functionName);
  const nodeName = useSettingsStore((state: SettingsState) => state.cfg.nodeName);
  const setSettings = useSettingsStore((state: SettingsState) => state.set);

  const visJsRef = useRef<HTMLDivElement>(null);
  let network: Network;

  const visData = useMemo(() => {
    console.log(brilOptim);
    const { nodes, edges } = Object.keys(brilOptim.functions).length ? registerAllocation(brilOptim).graph.plot({}) : { nodes: [], edges: [] };
    console.log(nodes, edges);
    return { nodes: new DataSet(nodes), edges: new DataSet(edges) };
  }, [brilOptim, functionName]);

  useEffect(() => {
    const options: Options = {
      // autoResize: true,
      // height: "90%",
      width: "100%",
      // interaction: { hover: true, dragNodes: true },
      // layout: {
      //   hierarchical: {
      //     enabled: true,
      //     levelSeparation: 100,
      //     nodeSpacing: 200,
      //     parentCentralization: true,
      //     edgeMinimization: true,
      //   },
      // },
      // physics: false,
      // // physics: {
      // //   hierarchicalRepulsion: {
      // //     nodeDistance: 70,
      // //     avoidOverlap: 0.5,
      // //   },
      // // },
      // nodes: {
      //   shape: "box",
      // },
      // edges: {
      //   arrows: "to",
      // },
    };
    if (visJsRef.current) {
      network = new Network(visJsRef.current, visData, options);
    }
  }, [visJsRef, visData]);

  const brilFunctionNames = useMemo(() => {
    return Object.keys(brilOptim.functions);
  }, [brilOptim]);

  useEffect(() => {
    if (network) network.setSize("1fr", "4fr");
  });

  return <Box height="100%" ref={visJsRef} overflow="hidden"></Box>;
};
