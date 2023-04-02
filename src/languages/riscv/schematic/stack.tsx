import { Table, TableContainer, Td, Th, Tr, Tbody, Thead, HStack, Button } from "@chakra-ui/react";
import { useContext, useState } from "react";
import { ComputerContext } from "../../App";
import { memSize } from "../../simulator/System";
import { getBytes } from "../../utils/bits";
import { useFormat } from "../../utils/useFormat";

export const Stack = (props: { highlightRange?: [number, number] }) => {
  const style = (i) => {
    if (i === computer.cpu.getX(8)) return { backgroundColor: "#A5D6A7" };
    return props.highlightRange && i >= props.highlightRange[0] && i <= props.highlightRange[1]
      ? { backgroundColor: "#d4fafa" }
      : {};
  };

  const { computer } = useContext(ComputerContext);
  const memory = computer.mem;

  // const [memFormat, setMemFormat] = useState("bytes");
  const { FormatSelector, format } = useFormat("8", "8DUS");

  const formatMem = (i: number) => {
    switch (format) {
      case "8":
        return (
          <Td>
            <HStack>
              <span>
                {memory
                  .localRead(i + 3, 1)
                  .toString(16)
                  .padStart(2, "0")}
              </span>
              <span>
                {memory
                  .localRead(i + 2, 1)
                  .toString(16)
                  .padStart(2, "0")}
              </span>
              <span>
                {memory
                  .localRead(i + 1, 1)
                  .toString(16)
                  .padStart(2, "0")}
              </span>
              <span>{memory.localRead(i, 1).toString(16).padStart(2, "0")}</span>
            </HStack>
          </Td>
        );
      case "D":
        return <Td>{memory.localRead(i, 4)}</Td>;
      case "U":
        return <Td>{memory.localRead(i * 4, 4) >>> 0}</Td>;
      case "S":
        return (
          <Td>
            {getBytes(memory.localRead(i * 4, 4)).reduce((prev, cur) => {
              prev += String.fromCharCode(cur);
              return prev;
            }, "")}
          </Td>
        );
    }
  };

  const stackSizeWords = (memSize - computer.cpu.getX(2)) / 4 + 1;
  const stackAddresses = [...Array(stackSizeWords)].map((_, i) => memSize - i * 4);

  const [addressFormat, setAddressFormat] = useState("H");
  const formatAddress = (addr: number) => {
    switch (addressFormat) {
      case "H":
        return addr.toString(16).padStart(8, "0");
      case "D":
        return addr.toString(10).padStart(8, "0");
      case "F":
        return (addr - computer.cpu.getX(8)).toString(10).padStart(8);
    }
  };
  const toggleAddressFormat = () => {
    switch (addressFormat) {
      case "H":
        setAddressFormat("D");
        break;
      case "D":
        setAddressFormat("F");
        break;
      case "F":
        setAddressFormat("H");
        break;
    }
  };

  return (
    <TableContainer className="ramTable">
      <Table size="sm">
        <Thead>
          <Tr>
            <Th>
              <Button size="xs" variant="ghost" onClick={toggleAddressFormat}>
                <span style={{ fontWeight: 700 }}>STACK</span>
              </Button>
            </Th>
            <Th>
              <FormatSelector />
            </Th>
          </Tr>
        </Thead>
        <Tbody fontFamily="monospace">
          {stackAddresses.map((addr) => (
            <Tr key={addr} style={style(addr)}>
              <Td style={{ textAlign: "end" }}>{formatAddress(addr)}</Td>
              {formatMem(addr)}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  );
};
