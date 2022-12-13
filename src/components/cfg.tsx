import React, { useEffect, useMemo, useRef } from "react";
import { DataSet, Options } from "vis-network";
// import { brilIR, cfg, selectedFunctionName, setSelectedCfgNodeName } from "../store/ParseState";
import { Network } from "vis-network";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import { setCfgNodeName } from "../store/settingsSlice";
import { useAppDispatch } from "../store/hooks";
import { getDominanceFrontierMap, getDominanceTree, getDominatorMap } from "../languages/bril/dom";
import { addCfgEntry, addCfgTerminators, cfgBuilder, getCfgBlockMap, getCfgEdges } from "../languages/bril/cfgBuilder";

export const CfgView: React.FC = () => {
  // const _cfg = cfg.use();
  // const _selectedFunctionName = selectedFunctionName.use();
  const bril = useSelector((state: RootState) => state.parse.bril);
  const functionName = useSelector((state: RootState) => state.settings.cfg.functionName);
  const nodeName = useSelector((state: RootState) => state.settings.cfg.nodeName);
  const dispatch = useAppDispatch();

  const visJsRef = useRef<HTMLDivElement>(null);
  let network: Network;

  const cfg = useMemo(() => {
    const cfg = cfgBuilder.buildProgram(bril);
    const fn = cfg[functionName];
    if (!fn) return undefined;

    let blockMap = getCfgBlockMap(cfg[functionName]);
    blockMap = addCfgEntry(blockMap);
    addCfgTerminators(blockMap);
    const { predecessorsMap, successorsMap } = getCfgEdges(blockMap);
    const dom = getDominatorMap(successorsMap, fn[0].name);
    const frontier = getDominanceFrontierMap(dom, successorsMap);
    const domtree = getDominanceTree(dom);
    return { blockMap, successorsMap, dom, frontier, domtree };
  }, [bril, functionName]);

  const cfgVisData = useMemo(() => {
    const nodes: { id: string; label: string; color?: string; borderWidth?: any; shapeProperties?: any }[] = [];
    const edges: any[] = [];

    if (cfg) {
      Object.values(cfg.blockMap).forEach((node) => {
        nodes.push({
          id: node.name,
          label: node.name,
          color: cfg.dom[nodeName]?.includes(node.name) ? "#FB7E81" : cfg.domtree[nodeName]?.includes(node.name) ? "#7BE141" : "#97C2FC",
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
      // height: "400px",
      // width: "400px",
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
    network.on("selectNode", (params) => {
      dispatch(setCfgNodeName(params.nodes[0]));
      console.log(cfg?.blockMap[params.nodes[0]]);
      // console.log("selectNode", params);
      // todo: show the dominators of this node in a different color or the dominance frontier
    });
    network?.fit();
  }, [visJsRef, cfgVisData]);

  return <div ref={visJsRef} style={{ height: "100%", width: "100%", padding: "10px", paddingBottom: "40px" }} />;
};
