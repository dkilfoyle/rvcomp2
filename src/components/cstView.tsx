import React, { useMemo } from "react";
// import { cstEntity } from "../store/ParseState";
import Tree from "rc-tree";
import "rc-tree/assets/index.css";

import { Icon } from "@chakra-ui/react";
import { VscSymbolClass } from "react-icons/vsc";

import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import "overlayscrollbars/overlayscrollbars.css";
import { ParseState, useParseStore } from "../store/zustore";
import { FunctionDeclarationCstNode, IdentifierExpressionCstNode, VariableDeclarationCstNode } from "../languages/simpleC/simpleC";
import { CstElement, CstNode, IToken, tokenLabel } from "chevrotain";

const fullHeight = { height: "100%" };

export const CstView: React.FC = () => {
  const cst = useParseStore((state: ParseState) => state.cst);

  const cstTreeData = useMemo(() => {
    let i = 0;
    const loop = (nodeAny: any, objName: string = ""): any => {
      let title: React.ReactElement = <span>Unknown Node</span>;
      let objDisplayName = objName !== "" ? `(${objName})` : "";
      let children;

      debugger;

      if (nodeAny.name) {
        const cstNode = nodeAny as CstNode;
        console.log(cstNode);
        switch (cstNode.name) {
          case "functionDeclaration":
            debugger;
            const fdnode = nodeAny as FunctionDeclarationCstNode;
            title = (
              <span>
                FunctionDeclaration: <strong>{fdnode.children.variableDeclaration[0].children.ID[0].image}</strong>
              </span>
            );
            break;
          case "variableDeclaration":
            const vdnode = nodeAny as VariableDeclarationCstNode;
            title = (
              <span>
                VariableDeclaration: <strong>{vdnode.children.ID[0].image}</strong>
              </span>
            );
            break;
          case "identifierExpression":
            const idnode = nodeAny as IdentifierExpressionCstNode;
            title = (
              <span>
                IdentifierExpression: <strong>{idnode.children.ID[0].image}</strong>
              </span>
            );
            break;
          case "binaryExpression":
            title = (
              <span>
                BinaryExpression: <strong>{nodeAny.op}</strong>
              </span>
            );
            break;
          case "integerLiteralExpression":
            title = (
              <span>
                {objDisplayName} integerLiteralExpression: <strong>{nodeAny.value}</strong>
              </span>
            );
            break;
          default:
            title = (
              <span>
                {objDisplayName}&nbsp;
                {nodeAny.name}
              </span>
            );
            break;
        }
      } else {
        // node does not have _name and is not an ast node
        // it might be array of nodes or a non-ast object
        if (nodeAny instanceof Array) {
          const nodeArray = nodeAny as CstElement[];
          title = (
            <span style={{ color: "green" }}>
              {objName}[{nodeArray.length}]
            </span>
          );
        } else if ("image" in nodeAny) {
          const nodeToken = nodeAny as IToken;
          title = <span style={{ color: "red" }}>{tokenLabel(nodeToken.tokenType)}</span>;
        } else title = <span>{objName}</span>;
      }

      const res: any = { key: i++, title, icon: nodeAny.name ? <Icon as={VscSymbolClass}></Icon> : undefined };

      if (nodeAny.children) {
        const node = nodeAny as CstNode;
        res.children = Object.entries(node.children).map(([key, value]) => {
          return loop(value, key);
          // return {
          //   key: i++,
          //   title: (
          //     <div>
          //       <span style={{ color: "green" }}>{key}</span>: <span style={{ color: "blue" }}>{`${value}`}</span>
          //     </div>
          //   ),
          // };
        });
      }
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
