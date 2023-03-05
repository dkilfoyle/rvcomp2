import { Accordion, AccordionButton, AccordionIcon, AccordionItem, AccordionPanel, Box, Checkbox, Icon, VStack } from "@chakra-ui/react";
import Tree from "rc-tree";
import "rc-tree/assets/index.css";
import { examples } from "../../examples/examples";
import { useSettingsStore, SettingsState } from "../../store/zustore";
import shallow from "zustand/shallow";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";

import { GiSlowBlob } from "react-icons/gi";
import { GoFileDirectory } from "react-icons/go";
import { FaRunning, FaShippingFast } from "react-icons/fa";
import { SiWebassembly } from "react-icons/si";
import { OptimList } from "./OptimList";
import { InterpreterSettings } from "./interpreterSettings";

interface dirTreeNode {
  key: string;
  title: string;
  code?: string;
  path: string;
  children?: dirTreeNode[];
}

const dirTree: dirTreeNode[] = [{ key: "./", title: "Files", children: [], path: "./" }];
Object.keys(examples).forEach((key) => {
  const stripkey = key.slice(2); // remove the "./"
  const path = stripkey.split("/"); // nodes = [dir1, dir2, file.sc]
  const filename = path[path.length - 1];
  const dirs = path.slice(0, -1);

  let curParent = dirTree[0];
  let curPath = "./";
  dirs.forEach((dir) => {
    if (!curParent.children) throw new Error();
    curPath = curPath + dir + "/";
    const existingNode = curParent.children.find((node) => node.key == curPath);
    if (existingNode) curParent = existingNode;
    else {
      curParent.children.push({ title: dir, children: [], key: curPath, path: curPath });
      curParent = curParent.children[curParent.children.length - 1];
    }
  });

  if (!curParent.children) throw new Error();

  curParent.children.push({
    title: filename,
    code: examples[curPath + filename],
    key: curPath + filename,
    path: curPath + filename,
  });
});

const fullHeight = { maxHeight: "100%", height: "100%" };

export const Sidebar = () => {
  const [filename, isFoldExprs] = useSettingsStore((state: SettingsState) => [state.filename, state.wasm.foldExprs], shallow);
  const brilremovePhis = useSettingsStore((state: SettingsState) => state.bril.removePhis);
  const brilIsSSA = useSettingsStore((state: SettingsState) => state.bril.isSSA);
  const setSettings = useSettingsStore((state: SettingsState) => state.set);

  return (
    <OverlayScrollbarsComponent defer style={fullHeight}>
      <div style={{ backgroundColor: "whitesmoke", height: "100%", fontSize: "10pt" }}>
        <Box p={2} fontWeight="bold" textAlign="center">
          RVComp2
        </Box>
        <Accordion defaultIndex={[0, 2]} allowMultiple variant="custom">
          <AccordionItem>
            <AccordionButton>
              <Icon as={GoFileDirectory} />
              <Box flex="1" textAlign="left" paddingLeft="6px">
                <span>Source Files</span>
              </Box>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel p={2}>
              <Tree
                treeData={dirTree as any}
                autoExpandParent
                defaultExpandedKeys={[filename]}
                defaultSelectedKeys={[filename]}
                expandAction="click"
                showLine
                onSelect={(keys, info) => {
                  if (!info.node.children && keys.length)
                    setSettings((state: SettingsState) => {
                      // state.filename = keys[0].toString();
                      // console.log(info.node);
                      state.filename = info.node.key as string;
                    });
                }}></Tree>
            </AccordionPanel>
          </AccordionItem>

          <AccordionItem>
            <AccordionButton>
              <Icon as={GiSlowBlob} />
              <Box flex="1" textAlign="left" pl="6px">
                Bril
              </Box>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel pb={4}>
              <VStack alignItems="start">
                <Checkbox
                  size="sm"
                  isChecked={brilIsSSA}
                  onChange={(e) => {
                    setSettings((state: SettingsState) => {
                      state.bril.isSSA = e.target.checked;
                    });
                    // if (e.target.checked)
                    //   setSettings((state: SettingsState) => {
                    //     state.optim.isSSA = true;
                    //   });
                    // dispatch(setBrilIsSSA(e.target.checked));
                    // if (e.target.checked) dispatch(setIsSSA(true));
                  }}>
                  SSA
                </Checkbox>
                <Checkbox
                  size="sm"
                  isChecked={brilremovePhis}
                  onChange={(e) =>
                    setSettings((state: SettingsState) => {
                      state.bril.removePhis = e.target.checked;
                    })
                  }>
                  removePhis
                </Checkbox>
              </VStack>
            </AccordionPanel>
          </AccordionItem>

          <AccordionItem>
            <h2>
              <AccordionButton>
                <Icon as={FaShippingFast} />
                <Box flex="1" textAlign="left" pl="6px">
                  Optimisations
                </Box>
                <AccordionIcon />
              </AccordionButton>
            </h2>

            <AccordionPanel pb={4}>
              <OptimList></OptimList>
            </AccordionPanel>
          </AccordionItem>

          <AccordionItem>
            <h2>
              <AccordionButton>
                <Icon as={FaRunning} />
                <Box flex="1" textAlign="left" pl="6px">
                  Interpreter
                </Box>
                <AccordionIcon />
              </AccordionButton>
            </h2>
            <AccordionPanel pb={4}>
              <InterpreterSettings></InterpreterSettings>
            </AccordionPanel>
          </AccordionItem>

          <AccordionItem>
            <AccordionButton>
              <Icon as={SiWebassembly}></Icon>
              <Box flex="1" textAlign="left" pl="6px">
                Wasm
              </Box>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel pb={4}>
              <VStack alignItems="start">
                <Checkbox
                  isChecked={isFoldExprs}
                  size="sm"
                  onChange={(e) =>
                    setSettings((state: SettingsState) => {
                      state.wasm.foldExprs = e.target.checked;
                    })
                  }>
                  Fold Expressions
                </Checkbox>
              </VStack>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </div>
    </OverlayScrollbarsComponent>
  );
};
