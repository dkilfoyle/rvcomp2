import React, { useMemo } from "react";
// import { cstEntity } from "../store/ParseState";
import Tree from "rc-tree";
import "rc-tree/assets/index.css";

import { Icon } from "@chakra-ui/react";
import { VscListOrdered, VscSymbolArray, VscSymbolClass } from "react-icons/vsc";

import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import "overlayscrollbars/overlayscrollbars.css";
import { ParseState, useParseStore } from "../store/zustore";
import {
  FunctionDeclarationCstNode,
  IdentifierExpressionCstNode,
  TypeSpecifierCstNode,
  VariableDeclarationCstNode,
} from "../languages/simpleC/simpleC";
import { CstElement, CstNode, IToken, tokenLabel } from "chevrotain";
import { BiText } from "react-icons/bi";

const fullHeight = { height: "100%" };

export const CstView: React.FC = () => {
  const cst = useParseStore((state: ParseState) => state.cst);

  const cstTreeData = useMemo(() => {
    let i = 0;
    const loop = (nodeAny: any, objName: string = ""): any => {
      let title: React.ReactElement = <span>Unknown Node</span>;
      let objDisplayName = objName !== "" ? `(${objName})` : "";
      let children;
      let icon;

      if (nodeAny.name) {
        const cstNode = nodeAny as CstNode;
        icon = <Icon as={VscSymbolClass}></Icon>;
        console.log(cstNode);
        switch (cstNode.name) {
          case "functionDeclaration":
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
          case "typeSpecifier":
            const tnode = nodeAny as TypeSpecifierCstNode;
            title = (
              <span>
                typeSpecifier: <strong>{Object.values(tnode.children)[0][0].image}</strong>
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

        children = Object.entries(cstNode.children).map(([key, value]) => {
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
      } else if (nodeAny instanceof Array) {
        const nodeArray = nodeAny as CstElement[];
        if (nodeArray.length == 1) return loop(nodeArray[0]);
        title = (
          <span style={{ color: "green" }}>
            {objName}[{nodeArray.length}]
          </span>
        );
        children = nodeArray.map((n) => loop(n));
      } else if ("image" in nodeAny) {
        const nodeToken = nodeAny as IToken;
        title = (
          <div>
            <span style={{ color: "blue" }}>{tokenLabel(nodeToken.tokenType)}: </span>
            <span> "{nodeToken.image}"</span>
          </div>
        );
        icon = <Icon as={BiText}></Icon>;
      } else title = <span>{objName}</span>;

      const res: any = { key: i++, title, children, icon };

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
