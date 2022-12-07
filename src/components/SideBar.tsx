import { Accordion, AccordionButton, AccordionIcon, AccordionItem, AccordionPanel, Box, Checkbox, VStack } from "@chakra-ui/react";
import Tree from "rc-tree";
import "rc-tree/assets/index.css";
// import * as Settings from "../store/Settings";
import type { RootState } from "../store/store";
import { useAppDispatch } from "../store/hooks";
import { useSelector, useDispatch } from "react-redux";
import { setFilename } from "../store/settingsSlice";

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
      {
        title: "Optimisation",
        children: [
          {
            title: "dce.tc",
          },
          {
            title: "lvn.tc",
          },
          {
            title: "df.tc",
          },
          {
            title: "dom.tc",
          },
        ],
      },
    ],
  },
];

export const Sidebar = () => {
  // const filename = Settings.filename.use();
  const filename = useSelector((state: RootState) => state.settings.filename);
  const dispatch = useAppDispatch();

  return (
    <Accordion defaultIndex={[0]} allowMultiple size="sm" backgroundColor="whitesmoke">
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
              if (!info.node.children && keys.length) dispatch(setFilename(keys[0].toString()));
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
