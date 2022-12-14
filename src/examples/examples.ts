// import semanticerrors from "./semanticerrors.sc?raw";
// import syntax from "./syntax.sc?raw";
// import helloint from "./helloint.sc?raw";
// import lvn from "./lvn.sc?raw";
// import gvn from "./gvn.sc?raw";
// import dce from "./dce.sc?raw";
// import df from "./df.sc?raw";
// import dom from "./dom.sc?raw";
// import fib from "./fib.sc?raw";
// import ssaif from "./ssaif.sc?raw";
// import array from "./array.sc?raw";
// import sum from "./sum.sc?raw";
// import fib from "./fib.sc?raw";
// import mul from "./mul.sc?raw";
// import sqrt from "./sqrt.sc?raw";

// export const examples: Record<string, string> = {
//   semanticerrors,
//   syntax,
//   helloint,
//   lvn,
//   gvn,
//   dce,
//   df,
//   dom,
//   ssaif,
//   fib,
//   array,
//   // sum,
//   // fib,
//   // mul,
//   // sqrt,
// };

// The Vite way

export const examples = import.meta.glob("./**/*.sc", { as: "raw", eager: true });
