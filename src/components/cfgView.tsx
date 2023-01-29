import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Options, Network } from "vis-network";
import { DataSet } from "vis-data";
import { getBackEdges, getDominanceFrontierMap, getDominanceTree, getDominatorMap, getNaturalLoops } from "../languages/bril/dom";
import { addCfgEntry, addCfgTerminators, cfgBuilder, getCfgBlockMap, getCfgEdges } from "../languages/bril/cfgBuilder";
import { getDataFlow } from "../languages/bril/df";
import { Box, Checkbox, Flex, Grid, Select, Table, Td, Th, Thead, Tooltip, Tr, VStack } from "@chakra-ui/react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";

import "./cfgView.css";
import { ParseState, SettingsState, useParseStore, useSettingsStore } from "../store/zustore";

interface ICfgEdge {
  from: string;
  to: string;
}

export const CfgView = () => {
  const brilOptim = useParseStore((state: ParseState) => state.brilOptim);
  const functionName = useSettingsStore((state: SettingsState) => state.cfg.functionName);
  const nodeName = useSettingsStore((state: SettingsState) => state.cfg.nodeName);
  const setSettings = useSettingsStore((state: SettingsState) => state.set);

  const [showTable, setShowTable] = useState<boolean>(true);

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
    const backEdges = getBackEdges(cfg[functionName], dom, successorsMap);
    const loops = getNaturalLoops(backEdges, predecessorsMap);
    return { blockMap, successorsMap, dom, frontier, domtree, dataFlow, backEdges, loops };
  }, [brilOptim, functionName]);

  const cfgVisData = useMemo(() => {
    const nodes: { id: string; label: string; color?: string; borderWidth?: any; shapeProperties?: any }[] = [];
    const edges: any[] = [];

    if (cfg) {
      Object.values(cfg.blockMap).forEach((node) => {
        nodes.push({
          id: node.name,
          label: node.name,
          color: "#97C2FC",
        });
        node.out.forEach((out) => {
          if (
            cfg.backEdges.find(([tail, head]) => {
              return tail == node.name && head == out;
            })
          )
            edges.push({
              from: node.name,
              to: out,
              color: "orangered",
              dashes: true,
              physics: false,
              width: 2,
              smooth: { enabled: true, type: "cubicBezier" },
            });
          else
            edges.push({
              id: `${node.name}_${out}`,
              from: node.name,
              to: out,
              width: 1,
              color: "grey",
              physics: false,
              smooth: { enabled: true, type: "cubicBezier" },
            });
        });
      });
    } else {
      nodes.push({ id: "cfgerror", label: "Invalid CFG" });
    }

    return { nodes: new DataSet(nodes), edges: new DataSet(edges) };
  }, [cfg]);

  useEffect(() => {
    const options: Options = {
      autoResize: true,
      height: "90%",
      width: "100%",
      interaction: { hover: true },
      layout: {
        hierarchical: {
          enabled: true,
          levelSeparation: 110,

          //   levelSeparation: 55,
          //   edgeMinimization: false,
          // sortMethod: "directed",
        },
      },
      physics: true,
      // physics: {
      //   hierarchicalRepulsion: {
      //     nodeDistance: 70,
      //     avoidOverlap: 0.5,
      //   },
      // },
      nodes: {
        shape: "box",
      },
      edges: {
        arrows: "to",
      },
    };
    if (visJsRef.current) {
      network = new Network(visJsRef.current, cfgVisData, options);
      // network.on("selectNode", (params) => {
      //   dispatch(setCfgNodeName(params.nodes[0]));
      //   // console.log(cfg?.blockMap[params.nodes[0]]);
      // });
      network.on("hoverNode", (params) => {
        setSettings((state: SettingsState) => {
          state.cfg.nodeName = params.node;
        });
        if (cfg) {
          // set all nodes back to default color and border
          cfgVisData.nodes.update(Object.values(cfg.blockMap).map((node) => ({ id: node.name, color: "#97C2FC" })));
          // color dolminance tree of the hovered node in green
          cfgVisData.nodes.update(cfg.domtree[params.node].map((dominator) => ({ id: dominator, color: "#68D391" })));
          // color dominators of the hovered node in red
          cfgVisData.nodes.update(cfg.dom[params.node].map((dominator) => ({ id: dominator, color: "#FC8181" })));
        }
        // dispatch(setCfgNodeName(params.node));
      });
      network.on("hoverEdge", (params) => {
        if (cfg) {
          const hoveredEdge = cfgVisData.edges.get(params.edge) as unknown as ICfgEdge;
          const backEdge = cfg.backEdges.find(([tail, head]) => tail == hoveredEdge.from && head == hoveredEdge.to);
          if (backEdge) {
            const loop = cfg.loops.find((loop) => loop.includes(hoveredEdge.from));
            // set all nodes back to default color and border
            cfgVisData.nodes.update(Object.values(cfg.blockMap).map((node) => ({ id: node.name, color: "#97C2FC" })));
            if (loop) cfgVisData.nodes.update(loop.map((node) => ({ id: node, color: "orange" })));
          }
        }
      });
      network.on("blurEdge", (params) => {
        if (cfg) {
          cfgVisData.nodes.update(Object.values(cfg.blockMap).map((node) => ({ id: node.name, color: "#97C2FC" })));
        }
      });
      network?.fit();
    }
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

  const renderRows = useMemo(() => {
    if (!cfg) return <tr></tr>;

    const maxRows = Math.max(
      cfg.dom[nodeName]?.length,
      cfg.domtree[nodeName]?.length,
      cfg.dataFlow.definedIn[nodeName]?.length,
      cfg.dataFlow.liveOut[nodeName]?.length,
      0
    );
    const rows: JSX.Element[] = [];
    for (let i = 0; i < maxRows; i++) {
      let row = (
        <tr key={i}>
          <td className={"DOMATORSlist"}>{i < cfg.dom[nodeName].length ? cfg.dom[nodeName][i] : ""}</td>
          <td className={"DOMTREElist"}>{i < cfg.domtree[nodeName].length ? cfg.domtree[nodeName][i] : ""}</td>
          <td className={"DEFINEDlist"}>{i < cfg.dataFlow.definedIn[nodeName].length ? cfg.dataFlow.definedIn[nodeName][i] : ""}</td>
          <td className={"ALIVElist"}>{i < cfg.dataFlow.liveOut[nodeName].length ? cfg.dataFlow.liveOut[nodeName][i] : ""}</td>
        </tr>
      );
      rows.push(row);
    }
    return rows;
  }, [nodeName]);

  return (
    <Grid templateRows="min-content 4fr 1fr" templateColumns="1fr" h="100%" overflow="hidden">
      <Box p={2}>
        <Grid templateColumns="1fr auto" gap={5}>
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
          <Checkbox isChecked={showTable} onChange={(e) => setShowTable(e.target.checked)}>
            Table
          </Checkbox>
        </Grid>
      </Box>

      <Box ref={visJsRef} overflow="hidden"></Box>

      {showTable && (
        <Box p={2} borderTop="1px solid lightgrey" height="250px" width="100%" fontSize="10pt">
          <OverlayScrollbarsComponent defer style={{ marginTop: "0px" }}>
            <table style={{ width: "100%" }}>
              <thead style={{ textAlign: "left" }}>
                <tr>
                  <th>Domators</th>
                  <th>DomTree</th>
                  <th>Defined</th>
                  <th>Alive</th>
                </tr>
              </thead>
              <tbody>{renderRows}</tbody>
            </table>
          </OverlayScrollbarsComponent>
        </Box>
      )}
    </Grid>
  );
};
