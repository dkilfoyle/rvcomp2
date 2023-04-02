import { Flex, Box, VStack } from "@chakra-ui/react";
import { CodeHighlightInfo } from "../../utils/antlr";
import { Ram } from "./ram";
import { Regs } from "./regs";
import { Stack } from "./stack";

export const Mem = (props: { memoryHighlightRanges: CodeHighlightInfo }) => {
  return (
    <Flex
      gap={4}
      flex="0 0 auto"
      style={{ height: "100%", overflow: "hidden", justifyContent: "center", padding: "8px" }}>
      <Box className="ramBox">
        <Ram highlightRanges={props.memoryHighlightRanges}></Ram>
      </Box>
      <VStack style={{ overflow: "hidden" }}>
        <Box className="ramBox">
          <Stack></Stack>
        </Box>
      </VStack>
      <Box className="regBox">
        <Regs></Regs>
      </Box>
    </Flex>
  );
};
