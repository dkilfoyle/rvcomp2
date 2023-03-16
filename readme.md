# RVComp2

A WIP learning experiment in building a very simple C-like RiscV compiler in Typescript based around Adrian Sampson's open-learning compiler course with a react-based IDE.

## Implemented

1. Chevrotain based simple C-like language parser with AST generation
   1. Basic UI for code editing, AST/IR/CFG visualisation
   2. C-like AST to Bril IR ("blang?")
2. Bril IR
   1. Control Flow Graph (CFG) visualisation with dominance highlighting
   2. Conversion to Single Static Assignment (SSA) form
   3. Data flow analysis
      1. Defined variables
      2. Live variables
   4. Optimisations
      1. Dead-code elimination
      2. Local and global value numbering
         1. Common expression evaluation
         2. Constant folding
         3. Copy propogation
      3. Loop invariant code motion
      4. Strength reduction
3. Code generation
   1. Webassmebly

## Planned

1. Expand SimpleC
   - [x] if (cond) instead of if (cond == true) where cond is boolean identifier
   - [x] uf (cond) instead of if (cond == true) where cond is boolean function call
   - [x] arrays
   - [x] stdlib (print_int, print_string)  
   - [ ] add modulo operator to SimpleC and Bril
2. Improve UI
   - [x] CFG node selection shows DFA for that node
   - [x] Bril IR diffeditor - plain vs SSA and SSA vs optimisations
   - [ ] Use ReactFlow and Elk.js instead of vis.js?
3. Refactor
   - [x] Switch from redux-toolkit to zustand
   - [x] Move interp.ts into a webworker so ui doesn't stall
4. Optimisations
   1. CFG optimisations
      - [ ] Branch removal
      - [ ] Unreachable code elimination
      - [ ] CFG cleaning
      - [ ] Tail merging
      - [ ] Remove top label and any unnecessary terminator instructions
   2. Loop optimisation
      - [ ] Unrolling
      - [x] Loop-invariant computation hoisting
      - [x] Strength reduction 
5. Many more examples
   - [x] Mandelbrot
   - [ ] Color Mandelbrot
   - [x] Game of Life
6. Code generators
   - [ ] IR to RiscV
   - [x] IR to WebAssembly
7. Add LLVM mid-end?

### Tools

1. Chevrotain parser
2. rc-dock
3. rc-tree
4. vis.js
5. monaco-editor
6. wabt.js
   - Does not work with import wabt from "wabt". Use these steps instead
     1. Add <script src="https://unpkg.com/wabt/index.js"></script> to index.html
     2. Make file wabt.d.ts and move index.d.ts from wabt.js
     3. To use wabt:
        - Wabt().then((wabtModule) => wabtModule.parseWat....)

### Acknowledgements

1. Adrian Sampson's self-guided CS6120 https://www.cs.cornell.edu/courses/cs6120/2020fa/
2. WASM binary structure and code generation
   1. https://coinexsmartchain.medium.com/wasm-introduction-part-1-binary-format-57895d851580
   2. https://blog.scottlogic.com/2019/05/17/webassembly-compiler.html
