import React, { useMemo } from "react";
// import { cstEntity } from "../store/ParseState";
import Tree from "rc-tree";
import "rc-tree/assets/index.css";

import { Icon } from "@chakra-ui/react";
import { VscSymbolClass } from "react-icons/vsc";

import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import "overlayscrollbars/overlayscrollbars.css";
import { ParseState, useParseStore } from "../store/zustore";

const fullHeight = { height: "100%" };

export const CstView: React.FC = () => {
  const cst = useParseStore((state: ParseState) => state.cst);

  const cstTreeData = useMemo(() => {
    let i = 0;
    const loop = (node: any, objName: string = ""): any => {
      let title: React.ReactElement = <span>{objName}</span>;
      let children;

      const res: any = { key: i++, title, icon: node._name ? <Icon as={VscSymbolClass}></Icon> : undefined };

      res.children = Object.entries(node).map(([key, value]) => {
        if (typeof node[key] === "object") {
          return loop(node[key], key);
        }
        return { key: i++, title: `${key}: ${value}` };
      });
      return res;
    };
    return loop(cst, "root");
  }, [cst]);

  return (
    <div style={fullHeight}>
      <OverlayScrollbarsComponent defer style={fullHeight}>
        <Tree treeData={[cstTreeData]} autoExpandParent style={fullHeight}></Tree>
        {/* <JSONTree data={ast} theme={theme} invertTheme></JSONTree> */}
      </OverlayScrollbarsComponent>
    </div>
  );
};
