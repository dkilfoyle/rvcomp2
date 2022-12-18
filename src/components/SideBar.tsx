import { Accordion, AccordionButton, AccordionIcon, AccordionItem, AccordionPanel, Box, Checkbox, VStack } from "@chakra-ui/react";
import Tree from "rc-tree";
import "rc-tree/assets/index.css";
import { useSettingsStore, SettingsState } from "../store/zustore";

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
          {
            title: "ssaif.tc",
          },
        ],
      },
    ],
  },
];

export const Sidebar = () => {
  const filename = useSettingsStore((state: SettingsState) => state.filename);
  const keepPhis = useSettingsStore((state: SettingsState) => state.optim.keepPhis);
  const isSSA = useSettingsStore((state: SettingsState) => state.optim.isSSA);
  const brilKeepPhis = useSettingsStore((state: SettingsState) => state.bril.keepPhis);
  const brilIsSSA = useSettingsStore((state: SettingsState) => state.bril.isSSA);
  const doLVN = useSettingsStore((state: SettingsState) => state.optim.doLVN);
  const doDCE = useSettingsStore((state: SettingsState) => state.optim.doDCE);
  const setSettings = useSettingsStore((state: SettingsState) => state.set);

  return (
    <div style={{ backgroundColor: "whitesmoke" }}>
      <Box p={4}>RVComp2</Box>
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
                if (!info.node.children && keys.length)
                  setSettings((state: SettingsState) => {
                    state.filename = keys[0].toString();
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
      </Accordion>
    </div>
  );
};
