import { Box, Flex, VStack } from "@chakra-ui/react";
import { IR } from "./ir";
import { DataPath } from "./datapath";
import { CodeHighlightInfo } from "../../utils/antlr";

export const Schematic = () => {
  return (
    <Flex direction="column" gap={4} padding={4} className="schematic">
      <Box className="irBox">
        <IR></IR>
      </Box>
      <DataPath></DataPath>
    </Flex>
  );
};
