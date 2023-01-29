import { accordionAnatomy } from "@chakra-ui/anatomy";
import { createMultiStyleConfigHelpers, defineStyle } from "@chakra-ui/react";

const { definePartsStyle, defineMultiStyleConfig } = createMultiStyleConfigHelpers(accordionAnatomy.keys);

const custom = definePartsStyle({
  panel: {
    backgroundColor: "#fbfbfb",
  },
  button: {
    padding: 1,
    paddingLeft: 2,
    fontSize: 14,
  },
  icon: {},
});

export const accordionTheme = defineMultiStyleConfig({
  variants: { custom },
});
