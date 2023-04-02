import { HStack, Spacer, Table, TableContainer, Tbody, Th, Thead, Tr } from "@chakra-ui/react";
import { useContext } from "react";
import { useEffect, useState } from "react";
// import { CSSTransition } from "react-transition-group";
import { ComputerContext } from "../../App";
import { useFormat } from "../../utils/useFormat";
import { FadeIn } from "../FadeIn";
import "./schematic.css";

const duration = 300;

export const PC = () => {
  const { FormatSelector, formatFn } = useFormat("H");
  const { computer } = useContext(ComputerContext);

  const [inProp, setInProp] = useState(false);
  useEffect(() => {
    setInProp(true);
  }, [computer.cpu.pc]);

  return (
    <TableContainer>
      <Table size="sm">
        <Thead>
          <Tr>
            <Th colSpan={2}>
              <HStack>
                <span>PC</span> <Spacer></Spacer>
                <FormatSelector />
              </HStack>
            </Th>
          </Tr>
        </Thead>
        <Tbody fontFamily="monospace">
          <Tr>
            <td>pcCur</td>
            <td>
              <FadeIn from="#ce93d8" to="#f3e5f5">
                {formatFn(computer.cpu.pcLast)}
              </FadeIn>
            </td>
          </Tr>
          <Tr>
            <td align="center">pc</td>
            <td align="right">
              <FadeIn from="#ce93d8" to="#f3e5f5">
                {formatFn(computer.cpu.pc)}
              </FadeIn>
            </td>
          </Tr>
        </Tbody>
      </Table>
    </TableContainer>
  );
};
