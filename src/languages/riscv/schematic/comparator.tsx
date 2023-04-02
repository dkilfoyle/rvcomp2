import { HStack, Spacer, Table, TableContainer, Tbody, Th, Thead, Tr } from "@chakra-ui/react";
import { useContext } from "react";
import { ComputerContext } from "../../App";
import { useFormat } from "../../utils/useFormat";

const BRANCH_TO_OP = {
  eq: "==",
  ne: "!=",
  lt: "<",
  ltu: "<",
  ge: ">=",
  geu: ">=",
};

export const Comparator = (props) => {
  const { FormatSelector, formatFn } = useFormat();
  const { computer } = useContext(ComputerContext);
  const branch = computer.cpu.datapath.branch;

  return (
    <TableContainer>
      <Table size="sm">
        <Thead>
          <Tr>
            <Th colSpan={3}>
              <HStack>
                <span>Comp</span>
                <Spacer></Spacer>
                <FormatSelector />
              </HStack>
            </Th>
          </Tr>
        </Thead>
        <Tbody fontFamily="monospace">
          <Tr>
            <td>op</td>
            <td></td>
            <td className="value">{branch ? BRANCH_TO_OP[branch] : "-"}</td>
          </Tr>
          <Tr>
            <td>a</td>
            <td>{branch ? "x" + computer.cpu.instr.params.rs1 : ""}</td>
            <td className="value">{branch ? formatFn(computer.cpu.x1) : "-"}</td>
          </Tr>
          <Tr>
            <td>b</td>
            <td>{branch ? "x" + computer.cpu.instr.params.rs2 : ""}</td>
            <td className="value">{branch ? formatFn(computer.cpu.x2) : "-"}</td>
          </Tr>
          <Tr>
            <td>taken</td>
            <td></td>
            <td className="value">{branch ? computer.cpu.branchTaken.toString() : "-"}</td>
          </Tr>
        </Tbody>
      </Table>
    </TableContainer>
  );
};
