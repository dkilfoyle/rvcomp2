import React, { useMemo } from "react";
import { brilEntity } from "../store/ParseState";
import Tree from "rc-tree";
import "rc-tree/assets/index.css";

import { Icon } from "@chakra-ui/react";
import { VscSymbolClass } from "react-icons/vsc";
import { formatWithOptions } from "util";
import { brilPrinter } from "../languages/simpleC/astToBrilVisitor";

export const BrilView: React.FC = () => {
  const bril = brilEntity.use();

  const keyValue = (key: string, value: any) => (
    <div>
      <span style={{ color: "green" }}>{key}</span>: <span style={{ color: "blue" }}>{`${value}`}</span>
    </div>
  );

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
      title: `functions[${bril.functions.length}]`,
      key: `${bril.key}`,
      children: bril.functions.map((fn) => {
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
    return root;
  }, [bril]);

  console.log(brilPrinter.print(bril));

  return (
    <div>
      <Tree treeData={[brilTreeData]} defaultExpandedKeys={["0"]} autoExpandParent></Tree>
    </div>
  );
};
