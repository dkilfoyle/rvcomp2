import { HStack, Spacer, Table, TableContainer, Tbody, Td, Th, Thead, Tr } from "@chakra-ui/react";
import { useContext } from "react";
import { ComputerContext } from "../../App";
import { registerNames } from "../../languages/riv32asm/parser/astBuilder";
import { useFormat } from "../../utils/useFormat";

export const Regs = () => {
  const { FormatSelector, formatFn } = useFormat();
  const { computer } = useContext(ComputerContext);
  const cpu = computer.cpu;

  const regColor = (i) => {
    switch (true) {
      case "RIUJ".includes(cpu.instr.iType) && i === cpu.instr.params.rd:
        return "#ffb7b7";
      case "RISB".includes(cpu.instr.iType) && i === cpu.instr.params.rs1:
        return "#ddffdd";
      case "RUSB".includes(cpu.instr.iType) && i === cpu.instr.params.rs2:
        return "#c2f7c2";
      case i <= 4:
        return "#e8e8e8";
      case i <= 7:
        return "#f8f8f8";
      case i <= 9:
        return "#e8e8e8";
      case i <= 17:
        return "#f8f8f8";
      case i <= 27:
        return "#e8e8e8";
      default:
        return "#f8f8f8";
    }
  };

  return (
    <TableContainer className="regTable">
      <Table size="sm">
        <Thead>
          <Tr>
            <Th colSpan={3}>
              <HStack>
                <span>Regs</span> <Spacer></Spacer>
                <FormatSelector />
              </HStack>
            </Th>
          </Tr>
        </Thead>
        <Tbody fontFamily="monospace">
          {cpu.x.map((r, i) => (
            <Tr key={i} style={{ background: regColor(i) }}>
              <Td>x{i}</Td>
              <Td>{formatFn(cpu.x[i])}</Td>
              <Td>{registerNames[i]}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  );
};
