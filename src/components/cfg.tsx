import { useEffect, useMemo, useRef } from "react";
import { Options, Network } from "vis-network";
import { getDominanceFrontierMap, getDominanceTree, getDominatorMap } from "../languages/bril/dom";
import { addCfgEntry, addCfgTerminators, cfgBuilder, getCfgBlockMap, getCfgEdges } from "../languages/bril/cfgBuilder";
import { getDataFlow } from "../languages/bril/df";
import { Box, Grid, Select, Tooltip, VStack } from "@chakra-ui/react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";

import "./cfg.css";
import { ParseState, SettingsState, useParseStore, useSettingsStore } from "../store/zustore";

export const CfgView = () => {
  const brilOptim = useParseStore((state: ParseState) => state.brilOptim);
  const functionName = useSettingsStore((state: SettingsState) => state.cfg.functionName);
  const nodeName = useSettingsStore((state: SettingsState) => state.cfg.nodeName);
  const setSettings = useSettingsStore((state: SettingsState) => state.set);

  const visJsRef = useRef<HTMLDivElement>(null);
  let network: Network;

  const cfg = useMemo(() => {
    const cfg = cfgBuilder.buildProgram(brilOptim);
    const fn = cfg[functionName];
    if (!fn) return undefined;

    let blockMap = getCfgBlockMap(cfg[functionName]);
    blockMap = addCfgEntry(blockMap);
    addCfgTerminators(blockMap);
    const dataFlow = getDataFlow(blockMap);
    const { predecessorsMap, successorsMap } = getCfgEdges(blockMap);
    const dom = getDominatorMap(successorsMap, fn[0].name);
    const frontier = getDominanceFrontierMap(dom, successorsMap);
    const domtree = getDominanceTree(dom);
    return { blockMap, successorsMap, dom, frontier, domtree, dataFlow };
  }, [brilOptim, functionName]);

  const cfgVisData = useMemo(() => {
    const nodes: { id: string; label: string; color?: string; borderWidth?: any; shapeProperties?: any }[] = [];
    const edges: any[] = [];

    if (cfg) {
      Object.values(cfg.blockMap).forEach((node) => {
        nodes.push({
          id: node.name,
          label: node.name,
          color: cfg.dom[nodeName]?.includes(node.name) ? "#FC8181" : cfg.domtree[nodeName]?.includes(node.name) ? "#68D391" : "#97C2FC",
          borderWidth: node.name == nodeName ? 3 : 1,
          shapeProperties: cfg.frontier[nodeName]?.includes(node.name) ? { borderDashes: [5, 5] } : {},
        });
        node.out.forEach((out) => {
          edges.push({ from: node.name, to: out, physics: false, smooth: { type: "cubicBezier" } });
        });
      });
    } else {
      nodes.push({ id: "cfgerror", label: "Invalid CFG" });
    }

    return { nodes, edges };
  }, [cfg, nodeName]);

  useEffect(() => {
    const options: Options = {
      autoResize: true,
      height: "100%",
      width: "100%",
      interaction: { hover: true },
      layout: {
        hierarchical: {
          enabled: true,
          levelSeparation: 50,
          sortMethod: "directed",
        },
      },
      physics: {
        hierarchicalRepulsion: {
          nodeDistance: 50,
        },
      },
      nodes: {
        shape: "box",
      },
      edges: {
        arrows: "to",
      },
    };
    if (visJsRef.current) network = new Network(visJsRef.current, cfgVisData, options);
    // network.on("selectNode", (params) => {
    //   dispatch(setCfgNodeName(params.nodes[0]));
    //   // console.log(cfg?.blockMap[params.nodes[0]]);
    // });
    network.on("hoverNode", (params) => {
      setSettings((state: SettingsState) => {
        state.cfg.nodeName = params.node;
      });
      // dispatch(setCfgNodeName(params.node));
    });
    network?.fit();
  }, [visJsRef, cfgVisData]);

  const brilFunctionNames = useMemo(() => {
    return Object.keys(brilOptim.functions);
  }, [brilOptim]);

  useEffect(() => {
    if (network) network.setSize("1fr", "4fr");
  });

  const renderList = (title: string, list: string[]) => {
    const tooltips: Record<string, string> = {
      DOMATORS: "",
      DOMTREE: "",
      DEFINED: "",
      ALIVE: "Defined and might be used along some path in future",
    };
    return (
      <VStack className="listbox">
        <Tooltip label={tooltips[title]} placement="top-end">
          <div className="listTitle">{title}</div>
        </Tooltip>
        <OverlayScrollbarsComponent defer style={{ marginTop: "0px" }}>
          <ul className={title + "list"}>
            {list.map((dom, i) => (
              <li key={i}>{dom}</li>
            ))}
          </ul>
        </OverlayScrollbarsComponent>
      </VStack>
    );
  };

  return (
    <Grid templateRows="min-content 4fr 1fr" templateColumns="1fr" h="100%" w="100%">
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
      <Box ref={visJsRef}></Box>
      <Grid templateColumns="repeat(5, 1fr)" gap={2} mx={2} minHeight="0px">
        {renderList("DOMATORS", (cfg && cfg.dom[nodeName]) || [])}
        {renderList("DOMTREE", (cfg && cfg.domtree[nodeName]) || [])}
        {renderList("DEFINED", (cfg && cfg.dataFlow.definedIn[nodeName]) || [])}
        {renderList("ALIVE", (cfg && cfg.dataFlow.liveOut[nodeName]) || [])}
        <VStack className="listbox">
          <Tooltip label="Constant Propgation" placement="top-end">
            <div className="listTitle">CPROP</div>
          </Tooltip>
          <OverlayScrollbarsComponent defer style={{ marginTop: "0px" }}>
            <ul className="CPROPlist">
              {Object.entries((cfg && cfg.dataFlow.cpropOut[nodeName]) || {})
                .filter(([varName, varValue]) => varValue != "?")
                .map(([varName, varValue], i) => (
                  <li key={i}>
                    {varName}={varValue}
                  </li>
                ))}
            </ul>
          </OverlayScrollbarsComponent>
        </VStack>
      </Grid>
    </Grid>
  );
};
