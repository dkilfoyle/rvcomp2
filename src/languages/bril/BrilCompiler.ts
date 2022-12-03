import { setAst, setBril, setCfg } from "../../store/parseSlice";
import store from "../../store/store";
import { IAstProgram } from "../simpleC/ast";
import { astToBrilVisitor } from "./astToBrilVisitor";
import { cfgBuilder } from "./cfgBuilder";

type IValidSimpleCCompilers = "bril";

export const compileSimpleC = (ast: IAstProgram, compiler: IValidSimpleCCompilers) => {
  switch (compiler) {
    case "bril":
      const bril = astToBrilVisitor.visit(ast);
      const cfg = cfgBuilder.buildProgram(bril);
      store.dispatch(setAst(ast));
      store.dispatch(setBril(bril));
      store.dispatch(setCfg(cfg));
      break;
    default:
      throw new Error();
  }
};
