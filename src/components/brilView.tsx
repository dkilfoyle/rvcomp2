import React, { useMemo } from "react";
// import { brilIR } from "../store/ParseState";
import Tree from "rc-tree";
import "rc-tree/assets/index.css";
import { ParseState, useParseStore } from "../store/zustore";
import { useSelector } from "react-redux";

const keyValue = (key: string, value: any) => (
  <div>
    <span style={{ color: "green" }}>{key}</span>: <span style={{ color: "blue" }}>{`${value}`}</span>
  </div>
);

export const BrilView: React.FC = () => {
  const bril = useParseStore((state: ParseState) => state.bril);

  const brilTreeData = useMemo(() => {
    const dumpInstruction = (ins: any) => {
      let i = 0;
      let title;
      if (ins.op)
        title = (
          <span>
            {ins.op} <strong>{ins.dest ? `[${ins.dest}]` : ""}</strong>
          </span>
        );
      else title = <span style={{ color: "red" }}>{ins.label}</span>;
      return {
        title,
        key: ins.key,
        children: Object.entries(ins).map(([key, value]) => ({
          title: keyValue(key, value),
          key: `${ins.key}-${i++}`,
        })),
      };
    };
    const root = {
      title: `functions[${Object.keys(bril.functions).length}]`,
      key: `${bril.key}`,
      children: Object.values(bril.functions).map((fn) => {
        return {
          title: fn.name,
          key: `${fn.key}`,
          children: [
            { title: keyValue("type", fn.type), key: `${fn.key}-0` },
            { title: keyValue("args", fn.args || "[]"), key: `${fn.key}-1` },
            { title: `instrs[${fn.instrs.length}]`, key: `${fn.key}-2`, children: fn.instrs.map((ins) => dumpInstruction(ins)) },
          ],
        };
      }),
    };
    // console.log("brilTreeDataMemo", bril);
    return root;
  }, [bril]);

  // console.log(cfgBuilder.buildProgram(bril));

  return (
    <div>
      <Tree treeData={[brilTreeData]} defaultExpandedKeys={["0"]} autoExpandParent></Tree>
    </div>
  );
};
