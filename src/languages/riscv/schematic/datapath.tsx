import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Flex,
  Textarea,
} from "@chakra-ui/react";
import { useContext } from "react";
// import { useEffect, useState } from "react";
import { ComputerContext } from "../../App";
import { ALU } from "./alu";
import { Bus } from "./bus";
import { Comparator } from "./comparator";
import { PC } from "./pc";
import "./schematic.css";

// const duration = 300;

export const DataPath = () => {
  const { computer } = useContext(ComputerContext);

  // const [inProp, setInProp] = useState(false);
  // useEffect(() => {
  //   setInProp(true);
  // }, [computer.cpu.pc]);

  return (
    <Box className="datapathBox" flex="1">
      <Accordion defaultIndex={[0, 1]} allowMultiple>
        <AccordionItem>
          <AccordionButton flex="1">
            <Flex gap={4} flex="1">
              <span style={{ fontWeight: "bold" }}>DATAPATH</span>
              <span>
                PC = {computer.cpu.pcLast}/{computer.cpu.pc}
              </span>
              <span>BUS = {computer.bus.lastAddress}</span>
              <span>ALU = {computer.cpu.aluResult}</span>
            </Flex>
            <AccordionIcon></AccordionIcon>
          </AccordionButton>
          <AccordionPanel pb={2} pt={2}>
            <Flex gap={4} style={{ overflow: "overlay" }}>
              <Box bg="#ede7f6" className="componentBox">
                <PC></PC>
              </Box>
              <Box bg="#fff8e1" className="componentBox">
                <Bus></Bus>
              </Box>
              <Box bg="#e1f5fe" className="componentBox">
                <ALU></ALU>
              </Box>
              <Box bg="#fbe9e7" className="componentBox">
                <Comparator></Comparator>
              </Box>
            </Flex>
          </AccordionPanel>
        </AccordionItem>
        <AccordionItem>
          <AccordionButton flex="1">
            <Flex gap={4} flex="1">
              <span style={{ fontWeight: "bold" }}>CONSOLE</span>
              <span>{computer.cpu.console[computer.cpu.console.length - 1]}</span>
            </Flex>
            <AccordionIcon></AccordionIcon>
          </AccordionButton>
          <AccordionPanel pb={2} pt={2}>
            <Flex gap={4} style={{ overflow: "overlay" }}>
              <Textarea isReadOnly fontSize={10} value={computer.cpu.console.join("\n")}></Textarea>
            </Flex>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </Box>
  );
};
