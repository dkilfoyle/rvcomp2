import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DataSet, Options } from "vis-network";
// import { brilIR, cfg, selectedFunctionName, setSelectedCfgNodeName } from "../store/ParseState";
import { Network } from "vis-network";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import { setCfgFunctionName, setCfgNodeName } from "../store/settingsSlice";
import { useAppDispatch } from "../store/hooks";
import { getDominanceFrontierMap, getDominanceTree, getDominatorMap } from "../languages/bril/dom";
import { addCfgEntry, addCfgTerminators, cfgBuilder, getCfgBlockMap, getCfgEdges } from "../languages/bril/cfgBuilder";
import { getDataFlow } from "../languages/bril/df";
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  Flex,
  Grid,
  List,
  ListItem,
  Select,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  VStack,
} from "@chakra-ui/react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";

import "./cfg.css";

export const CfgView: React.FC = () => {
  // const _cfg = cfg.use();
  // const _selectedFunctionName = selectedFunctionName.use();
  const brilOptim = useSelector((state: RootState) => state.parse.brilOptim);
  const functionName = useSelector((state: RootState) => state.settings.cfg.functionName);
  const nodeName = useSelector((state: RootState) => state.settings.cfg.nodeName);
  const dispatch = useAppDispatch();

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
      dispatch(setCfgNodeName(params.node));
    });
    network?.fit();
  }, [visJsRef, cfgVisData]);

  const brilFunctionNames = useMemo(() => {
    return Object.keys(brilOptim.functions);
  }, [brilOptim]);

  const [showTable, setShowTable] = useState(0);
  const toggleShowTable = useCallback(() => {
    if (showTable == 0) setShowTable(200);
    else setShowTable(0);
  }, []);

  const renderList = (title: string, list: string[]) => {
    return (
      <VStack className="listbox">
        <div className="listTitle">{title}</div>
        <OverlayScrollbarsComponent defer style={{ marginTop: "0px" }}>
          <ul className={title + "list"}>
            {list.map((dom, i) => (
              <li key={dom}>{dom}</li>
            ))}
          </ul>
        </OverlayScrollbarsComponent>
      </VStack>
    );
  };

  return (
    <Grid templateRows="auto 1.5fr 200px" templateColumns="1fr" h="100%" w="100%">
      <Box p={2}>
        <Select size="sm" value={functionName} onChange={(e) => dispatch(setCfgFunctionName(e.target.value))}>
          {brilFunctionNames.map((n) => (
            <option value={n}>{n}</option>
          ))}
        </Select>
      </Box>
      <Box ref={visJsRef} />
      <Grid templateColumns="repeat(4, 1fr)" gap={2} mx={2}>
        {renderList("DOMATORS", (cfg && cfg.dom[nodeName]) || [])}
        {renderList("DOMTREE", (cfg && cfg.domtree[nodeName]) || [])}
        {renderList("DEFINED", (cfg && cfg.dataFlow.definedIn[nodeName]) || [])}
        {renderList("ALIVE", (cfg && cfg.dataFlow.liveOut[nodeName]) || [])}
      </Grid>
    </Grid>
  );
};
