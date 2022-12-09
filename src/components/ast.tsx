import React, { useMemo } from "react";
// import { astEntity, cstEntity } from "../store/ParseState";
import Tree from "rc-tree";
import "rc-tree/assets/index.css";

import { Icon } from "@chakra-ui/react";
import { VscSymbolClass } from "react-icons/vsc";
import { RootState } from "../store/store";
import { useSelector } from "react-redux";

import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import "overlayscrollbars/overlayscrollbars.css";

const fullHeight = { maxHeight: "100%" };

export const AstView: React.FC = () => {
  // const ast = astEntity.use();
  const ast = useSelector((state: RootState) => state.parse.ast);

  const astTreeData = useMemo(() => {
    let i = 0;
    const loop = (node: any, objName: string = ""): any => {
      let title: React.ReactElement = <span>Unknown Node</span>;
      let objDisplayName = objName !== "" ? `(${objName})` : "";
      let children;
      if (node._name)
        switch (node._name) {
          case "functionDeclaration":
            title = (
              <span>
                {objDisplayName} funDecl: <strong>{node.id}</strong>
              </span>
            );
            break;
          case "variableDeclaration":
            title = (
              <span>
                {objDisplayName} varDecl: <strong>{node.id}</strong>:{node.type}
              </span>
            );
            break;
          case "identifierExpression":
            title = (
              <span>
                {objDisplayName} idExpression: <strong>{node.id}</strong>
              </span>
            );
            break;
          case "binaryExpression":
            title = (
              <span>
                {objDisplayName} binaryExpression: <strong>{node.op}</strong>
              </span>
            );
            break;
          case "integerLiteralExpression":
            title = (
              <span>
                {objDisplayName} integerLiteralExpression: <strong>{node.value}</strong>
              </span>
            );
            break;
          default:
            title = (
              <span>
                {objDisplayName}&nbsp;
                {node._name}
              </span>
            );
            break;
        }
      else {
        // node does not have _name and is not an ast node
        // it might be array of nodes or a non-ast object
        if (node instanceof Array)
          title = (
            <span style={{ color: "green" }}>
              {objName}[{node.length}]
            </span>
          );
        else title = <span>{objName}</span>;
      }

      const res: any = { key: i++, title, icon: node._name ? <Icon as={VscSymbolClass}></Icon> : undefined };

      const getPosStr = (pos: any) => (
        <div>
          <span style={{ color: "green" }}>pos: </span>
          <span style={{ color: "blue" }}>{`${pos.startLineNumber},${pos.startColumn}->${pos.endLineNumber},${pos.endColumn}`}</span>
        </div>
      );

      res.children = Object.entries(node)
        .filter(([key, value]) => key !== "_name")
        .map(([key, value]) => {
          if (typeof node[key] === "object") {
            if (key == "pos") return { key: i++, title: getPosStr(value) };
            else return loop(node[key], key);
          }
          return {
            key: i++,
            title: (
              <div>
                <span style={{ color: "green" }}>{key}</span>: <span style={{ color: "blue" }}>{`${value}`}</span>
              </div>
            ),
          };
        });
      return res;
    };
    return loop(ast, "root");
  }, [ast]);

  return (
    <OverlayScrollbarsComponent defer style={fullHeight}>
      <Tree treeData={[astTreeData]} defaultExpandParent defaultExpandedKeys={[1]}></Tree>
      {/* <JSONTree data={ast} theme={theme} invertTheme></JSONTree> */}
    </OverlayScrollbarsComponent>
  );
};
