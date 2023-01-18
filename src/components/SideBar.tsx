import { Accordion, AccordionButton, AccordionIcon, AccordionItem, AccordionPanel, Box, Button, Checkbox, VStack } from "@chakra-ui/react";
import Tree from "rc-tree";
import "rc-tree/assets/index.css";
import { examples } from "../examples/examples";
import { useSettingsStore, SettingsState } from "../store/zustore";
import shallow from "zustand/shallow";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import { useStore } from "zustand";

// const fileTreeData = [
//   {
//     title: "Files",
//     children: [
//       { title: "helloint.sc" },
//       { title: "fib.tc" },
//       { title: "sum.tc" },
//       { title: "mul.tc" },
//       { title: "sqrt.tc" },
//       { title: "blank.tc" },
//       { title: "Parser", children: [{ title: "syntax.sc" }, { title: "semanticerrors.sc" }] },
//       {
//         title: "Tests",
//         children: [
//           {
//             title: "math.tc",
//           },
//           {
//             title: "array.tc",
//           },
//         ],
//       },
//       {
//         title: "Optimisation",
//         children: [
//           {
//             title: "dce.tc",
//           },
//           {
//             title: "lvn.tc",
//           },
//           {
//             title: "df.tc",
//           },
//           {
//             title: "dom.tc",
//           },
//           {
//             title: "ssaif.tc",
//           },
//         ],
//       },
//     ],
//   },
// ];

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
  // const filename = useSettingsStore((state: SettingsState) => state.filename);
  // const keepPhis = useSettingsStore((state: SettingsState) => state.optim.keepPhis);
  // const isSSA = useSettingsStore((state: SettingsState) => state.optim.isSSA);
  const [filename, keepPhis, isSSA, isFoldExprs] = useSettingsStore(
    (state: SettingsState) => [state.filename, state.optim.keepPhis, state.optim.isSSA, state.wasm.foldExprs],
    shallow
  );
  const brilKeepPhis = useSettingsStore((state: SettingsState) => state.bril.keepPhis);
  const brilIsSSA = useSettingsStore((state: SettingsState) => state.bril.isSSA);
  const doLVN = useSettingsStore((state: SettingsState) => state.optim.doLVN);
  const doGVN = useSettingsStore((state: SettingsState) => state.optim.doGVN);
  const doDCE = useSettingsStore((state: SettingsState) => state.optim.doDCE);
  const isRunOptim = useSettingsStore((state: SettingsState) => state.interp.isRunOptim);
  const isRunUnoptim = useSettingsStore((state: SettingsState) => state.interp.isRunUnoptim);
  const isRunWasm = useSettingsStore((state: SettingsState) => state.interp.isRunWasm);
  const isRunAuto = useSettingsStore((state: SettingsState) => state.interp.isRunAuto);
  const setSettings = useSettingsStore((state: SettingsState) => state.set);

  return (
    <OverlayScrollbarsComponent defer style={fullHeight}>
      <div style={{ backgroundColor: "whitesmoke", height: "100%" }}>
        <Box p={2} fontWeight="bold" textAlign="center">
          RVComp2
        </Box>
        <Accordion defaultIndex={[0, 2]} allowMultiple size="sm">
          <AccordionItem>
            <h2>
              <AccordionButton>
                <Box flex="1" textAlign="left">
                  Source Files
                </Box>
                <AccordionIcon />
              </AccordionButton>
            </h2>
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
            <h2>
              <AccordionButton>
                <Box flex="1" textAlign="left">
                  Bril
                </Box>
                <AccordionIcon />
              </AccordionButton>
            </h2>
            <AccordionPanel pb={4}>
              <VStack alignItems="start">
                <Checkbox
                  isChecked={brilIsSSA}
                  onChange={(e) => {
                    setSettings((state: SettingsState) => {
                      state.bril.isSSA = e.target.checked;
                    });
                    if (e.target.checked)
                      setSettings((state: SettingsState) => {
                        state.optim.isSSA = true;
                      });
                    // dispatch(setBrilIsSSA(e.target.checked));
                    // if (e.target.checked) dispatch(setIsSSA(true));
                  }}>
                  SSA
                </Checkbox>
                <Checkbox
                  isChecked={brilKeepPhis}
                  onChange={(e) =>
                    setSettings((state: SettingsState) => {
                      state.bril.keepPhis = e.target.checked;
                    })
                  }>
                  KeepPhis
                </Checkbox>
              </VStack>
            </AccordionPanel>
          </AccordionItem>

          <AccordionItem>
            <h2>
              <AccordionButton>
                <Box flex="1" textAlign="left">
                  Optimisations
                </Box>
                <AccordionIcon />
              </AccordionButton>
            </h2>
            <AccordionPanel pb={4}>
              <VStack alignItems="start">
                <Checkbox
                  isChecked={isSSA}
                  onChange={(e) =>
                    setSettings((state: SettingsState) => {
                      state.optim.isSSA = e.target.checked;
                    })
                  }>
                  SSA
                </Checkbox>
                <Checkbox
                  isChecked={keepPhis}
                  onChange={(e) =>
                    setSettings((state: SettingsState) => {
                      state.optim.keepPhis = e.target.checked;
                    })
                  }>
                  KeepPhis
                </Checkbox>
                <Checkbox
                  isChecked={doLVN}
                  onChange={(e) =>
                    setSettings((state: SettingsState) => {
                      state.optim.doLVN = e.target.checked;
                    })
                  }>
                  LVN
                </Checkbox>
                <Checkbox
                  isChecked={doGVN}
                  onChange={(e) =>
                    setSettings((state: SettingsState) => {
                      state.optim.doGVN = e.target.checked;
                      if (e.target.checked) {
                        state.optim.isSSA = true;
                        state.optim.keepPhis = true;
                        state.bril.isSSA = true;
                        state.optim.doLVN = false;
                      }
                    })
                  }>
                  GVN
                </Checkbox>
                <Checkbox
                  isChecked={doDCE}
                  onChange={(e) =>
                    setSettings((state: SettingsState) => {
                      state.optim.doDCE = e.target.checked;
                    })
                  }>
                  DCE
                </Checkbox>
              </VStack>
            </AccordionPanel>
          </AccordionItem>

          <AccordionItem>
            <h2>
              <AccordionButton>
                <Box flex="1" textAlign="left">
                  Interpreter
                </Box>
                <AccordionIcon />
              </AccordionButton>
            </h2>
            <AccordionPanel pb={4}>
              <VStack alignItems="start">
                <Checkbox
                  isChecked={isRunUnoptim}
                  onChange={(e) =>
                    setSettings((state: SettingsState) => {
                      state.interp.isRunUnoptim = e.target.checked;
                    })
                  }>
                  Run Un-optimised
                </Checkbox>
                <Checkbox
                  isChecked={isRunOptim}
                  onChange={(e) =>
                    setSettings((state: SettingsState) => {
                      state.interp.isRunOptim = e.target.checked;
                    })
                  }>
                  Run Optimised
                </Checkbox>
                <Checkbox
                  isChecked={isRunWasm}
                  onChange={(e) =>
                    setSettings((state: SettingsState) => {
                      state.interp.isRunWasm = e.target.checked;
                    })
                  }>
                  Run Wasm
                </Checkbox>
                <Checkbox
                  isChecked={isRunAuto}
                  onChange={(e) =>
                    setSettings((state: SettingsState) => {
                      state.interp.isRunAuto = e.target.checked;
                    })
                  }>
                  Auto Run
                </Checkbox>
                <Button>Run</Button>
              </VStack>
            </AccordionPanel>
          </AccordionItem>

          <AccordionItem>
            <h2>
              <AccordionButton>
                <Box flex="1" textAlign="left">
                  Wasm
                </Box>
                <AccordionIcon />
              </AccordionButton>
            </h2>
            <AccordionPanel pb={4}>
              <VStack alignItems="start">
                <Checkbox
                  isChecked={isFoldExprs}
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
