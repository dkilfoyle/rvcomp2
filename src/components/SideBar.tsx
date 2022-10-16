import { Accordion, AccordionButton, AccordionIcon, AccordionItem, AccordionPanel, Box, Checkbox, VStack } from "@chakra-ui/react";
import Tree from "rc-tree";
import "rc-tree/assets/index.css";
import * as Settings from "../store/Settings";

const fileTreeData = [
  {
    title: "Files",
    children: [
      { title: "helloint.sc" },
      { title: "fib.tc" },
      { title: "sum.tc" },
      { title: "mul.tc" },
      { title: "sqrt.tc" },
      { title: "blank.tc" },
      { title: "Parser", children: [{ title: "syntax.sc" }, { title: "semanticerrors.sc" }] },
      {
        title: "Tests",
        children: [
          {
            title: "math.tc",
          },
          {
            title: "array.tc",
          },
        ],
      },
    ],
  },
];

export const Sidebar = () => {
  const filename = Settings.filename.use();

  return (
    <Accordion defaultIndex={[0]} allowMultiple size="sm">
      <AccordionItem>
        <h2>
          <AccordionButton>
            <Box flex="1" textAlign="left">
              Source Files
            </Box>
            <AccordionIcon />
          </AccordionButton>
        </h2>
        <AccordionPanel pb={4}>
          <Tree
            treeData={fileTreeData as any}
            autoExpandParent
            defaultExpandedKeys={["Files", "Tests"]}
            defaultSelectedKeys={[filename]}
            expandAction="click"
            fieldNames={{ key: "title" }}
            showLine
            onSelect={(keys, info) => {
              if (!info.node.children) Settings.filename.set(keys[0].toString());
            }}></Tree>
        </AccordionPanel>
      </AccordionItem>

      <AccordionItem>
        <h2>
          <AccordionButton>
            <Box flex="1" textAlign="left">
              Settings
            </Box>
            <AccordionIcon />
          </AccordionButton>
        </h2>
        <AccordionPanel pb={4}>
          <VStack alignItems="start">
            <h2>Highlight</h2>
          </VStack>
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
};
