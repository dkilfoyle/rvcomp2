import React, { useEffect, useMemo, useRef } from "react";
import { DataSet, Options } from "vis-network";
// import { brilIR, cfg, selectedFunctionName, setSelectedCfgNodeName } from "../store/ParseState";
import { Network } from "vis-network";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import { setCfgNodeName } from "../store/settingsSlice";
import { useAppDispatch } from "../store/hooks";

export const CfgView: React.FC = () => {
  // const _cfg = cfg.use();
  // const _selectedFunctionName = selectedFunctionName.use();
  const cfg = useSelector((state: RootState) => state.parse.cfg);
  const functionName = useSelector((state: RootState) => state.settings.cfg.functionName);
  const dispatch = useAppDispatch();

  const visJsRef = useRef<HTMLDivElement>(null);
  let network: Network;

  const cfgData = useMemo(() => {
    const fn = cfg[functionName];
    if (!fn)
      return {
        nodes: [{ id: 1, label: "No Main Fn" }],
        edges: [],
      };

    const nodes: { id: string; label: string }[] = [];
    const edges: any[] = [];

    fn.forEach((node) => {
      nodes.push({
        id: node.name,
        label: node.name,
      });
      node.out.forEach((out) => {
        edges.push({ from: node.name, to: out, smooth: { type: "cubicBezier" } });
      });
    });

    console.log(cfg, nodes, edges);

    return { nodes, edges };
  }, [cfg, functionName]);

  useEffect(() => {
    const options: Options = {
      // height: "400px",
      // width: "400px",
      layout: {
        hierarchical: {
          enabled: true,
          direction: "UD",
        },
      },
      physics: false,
      nodes: {
        shape: "box",
      },
      edges: {
        arrows: "to",
      },
    };
    if (visJsRef.current) network = new Network(visJsRef.current, cfgData, options);
    network.on("selectNode", (params) => {
      dispatch(setCfgNodeName(params.nodes[0]));
      console.log(cfg[functionName].find((n) => n.name == params.nodes[0]));
      // console.log("selectNode", params);
    });
    network?.fit();
  }, [visJsRef, cfgData]);

  return <div ref={visJsRef} style={{ height: "100%", width: "100%", padding: "10px", paddingBottom: "40px" }} />;
};
