# RVComp2

A WIP learning experiment in building a very simple C-like RiscV compiler in Typescript based around Adrian Sampson's open-learning compiler course with a react-based IDE.

## Implemented

1. Chevrotain based simple C-like parser with AST generation
2. Basic UI for code editing, AST/IR/CFG visualisation
3. C-like AST to Bril IR ("blang?")
4. Bril IR
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

## Planned

1. Expand SimpleC
   - [x] if (cond) instead of if (cond == true) where cond is boolean expression
2. Expand Bril
   - [x] Memory extension for arrays
   - [x] Display buffer
3. Improve UI
   - [x] CFG node selection shows DFA for that node
   - [x] CFG node selection highlights relevant bril code
   - [x] Bril IR diffeditor - plain vs SSA and SSA vs optimisations
4. Refactor
   - [x] Switch from redux-toolkit to zustand
   - [x] Use Map instead of Record<string,>?
5. Optimisations
   1. DFA-based
      - [x] Jump to Jump Elimination (Mogensen pg 224)
   2. CFG optimisations
      - [ ] Branch removal
      - [ ] Unreachable code elimination
      - [ ] CFG cleaning
      - [ ] Tail merging
      - [ ] Remove top label and any unnecessary terminator instructions
   3. Loop optimisation
      - [ ] Unrolling
      - [ ] Loop-invariant computation hoisting
6. Many more examples
7. Code generators
   - [ ] IR to RiscV
   - [ ] IR to WebAssembly (https://github.com/ColinEberhardt/chasm)
8. Add LLVM mid-end?

### Tools

1. Chevrotain parser
2. rc-dock
3. rc-tree
4. vis.js
5. monaco-editor

### Acknowledgements

1. Adrian Sampson's self-guided CS6120 https://www.cs.cornell.edu/courses/cs6120/2020fa/
