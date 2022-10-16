import React, { useMemo } from "react";
import { astEntity, cstEntity } from "../store/ParseState";
import Tree from "rc-tree";
import "rc-tree/assets/index.css";

import { Icon } from "@chakra-ui/react";
import { VscSymbolClass } from "react-icons/vsc";

export const AstView: React.FC = () => {
  const cst = cstEntity.use();
  const ast = astEntity.use();

  const astTreeData = useMemo(() => {
    let i = 0;
    const loop = (node: any, objName: string = ""): any => {
      let title: React.ReactElement = <span>Unknown Node</span>;
      let children;
      if (node._name)
        switch (node._name) {
          case "functionDeclaration":
            title = (
              <span>
                funDecl: <strong>{node.id}</strong>
              </span>
            );
            break;
          case "variableDeclaration":
            title = (
              <span>
                varDecl: <strong>{node.id}</strong>:{node.type}
              </span>
            );
            break;
          default:
            title = <span>{node._name}</span>;
            break;
        }
      else {
        // node does not have _name and is not an ast node
        // it might be array of nodes or a non-ast object
        if (node instanceof Array)
          title = (
            <span>
              {objName}[{node.length}]
            </span>
          );
        else title = <span>{objName}</span>;
      }

      const res: any = { key: i++, title, icon: node._name ? <Icon as={VscSymbolClass}></Icon> : undefined };

      const getPosStr = (pos: any) => `pos ${pos.startLineNumber},${pos.startColumn} : ${pos.endLineNumber},${pos.endColumn}`;

      res.children = Object.entries(node)
        .filter(([key, value]) => key !== "_name")
        .map(([key, value]) => {
          if (typeof node[key] === "object") {
            if (key == "pos") return { key: i++, title: getPosStr(value) };
            else return loop(node[key], key);
          }
          return { key: i++, title: `${key}: ${value}` };
        });
      return res;
    };
    return loop(ast, "root");
  }, [ast]);

  return (
    <div>
      <Tree treeData={[astTreeData]}></Tree>
      {/* <JSONTree data={ast} theme={theme} invertTheme></JSONTree> */}
    </div>
  );
};
