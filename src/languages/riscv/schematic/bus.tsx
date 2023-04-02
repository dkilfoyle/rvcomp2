import { HStack, Spacer, Table, TableContainer, Tbody, Th, Thead, Tr } from "@chakra-ui/react";
import { useContext } from "react";
import { ComputerContext } from "../../App";
import { useFormat } from "../../utils/useFormat";

export const Bus = (props) => {
  const { FormatSelector, formatFn } = useFormat("H");
  const { computer } = useContext(ComputerContext);
  return (
    <TableContainer>
      <Table size="sm">
        <Thead>
          <Tr>
            <Th colSpan={3}>
              <HStack>
                <span>Bus</span>
                <Spacer></Spacer>
                <FormatSelector />
              </HStack>
            </Th>
          </Tr>
        </Thead>
        <Tbody fontFamily="monospace">
          <Tr>
            <td>addr</td>
            <td></td>
            <td className="value">{formatFn(computer.bus.lastAddress)}</td>
          </Tr>
          <Tr>
            <td>data</td>
            <td></td>
            <td className="value">{formatFn(computer.cpu.loadData)}</td>
          </Tr>
        </Tbody>
      </Table>
    </TableContainer>
  );
};
