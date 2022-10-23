import React, { useMemo } from "react";
import { brilEntity } from "../store/ParseState";
import Tree from "rc-tree";
import "rc-tree/assets/index.css";

import { Icon } from "@chakra-ui/react";
import { VscSymbolClass } from "react-icons/vsc";
import { formatWithOptions } from "util";

export const BrilView: React.FC = () => {
  const bril = brilEntity.use();

  const keyValue = (key: string, value: any) => (
    <div>
      <span style={{ color: "green" }}>{key}</span>: <span style={{ color: "blue" }}>{`${value}`}</span>
    </div>
  );

  const brilTreeData = useMemo(() => {
    let i = 0;
    const dumpInstruction = (ins: any) => {
      let title;
      if (ins.op)
        title = (
          <span>
            {ins.op} <strong>[{ins.dest}]</strong>
          </span>
        );
      else title = ins.label;
      return {
        title,
        key: `${i++}`,
        children: Object.entries(ins).map(([key, value]) => ({
          title: keyValue(key, value),
          key: i++,
        })),
      };
    };
    const root = {
      title: `functions[${bril.functions.length}]`,
      key: `${i++}`,
      children: bril.functions.map((fn) => {
        return {
          title: fn.name,
          key: `${i++}`,
          children: [
            { title: keyValue("type", fn.type), key: `${i++}` },
            { title: keyValue("args", fn.args || "[]"), key: `${i++}` },
            { title: `instrs[${fn.instrs.length}]`, key: `${i++}`, children: fn.instrs.map((ins) => dumpInstruction(ins)) },
          ],
        };
      }),
    };
    return root;
  }, [bril]);

  return (
    <div>
      <Tree treeData={[brilTreeData]} defaultExpandedKeys={["0"]} autoExpandParent></Tree>
    </div>
  );
};
