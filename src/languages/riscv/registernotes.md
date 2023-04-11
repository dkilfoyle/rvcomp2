First, we need some supporting data structures and functions:
• A set availReg of available physical (i.e. real) registers. Initially,
this contains all physical registers available for assignment. (There
may also be some “very temporary” registers around to help with
certain instructions).
• A function dies(pc) that returns the set of virtual registers that
die in the instruction at pc.
• A mapping realReg from virtual registers to the current physical
registers that hold them (if any).
• A boolean function isReg(x) that returns true iff x is a virtual register (as opposed to an immediate or missing operand).
• A function spillReg(pc) that chooses an allocatable physical register not in availReg (that is, currently assigned to some virtual register), generates code to write its contents to the place reserved
for that virtual register on the stack, marks the spilled virtual register as dying at pc, returns the physical register.

# Allocate registers to an instruction x := y op z or x := op y

# [Adopted from Aho, Sethi, Ullman]

def regAlloc(pc, x, y, z):
if realReg[x] != None or dies(x, pc):
"No new allocation needed"
elif isReg(y) and y in dies(pc):
realReg[x] = realReg[y];
elif isReg(z) and z in dies(pc):
realReg[x] = realReg[z];
elif len(availReg) != 0:
realReg[x] = availReg.pop()
else:
realReg[x] = spillReg(pc)
• After generating code for the instruction at pc,
for r in dies(pc):
if realReg[r] != realReg[x]:
availReg.add(realReg[r])
realReg[r] = None

This describes the algorithm as first proposed by Poletto et al.,[32] where:

R is the number of available registers.
active is the list, sorted in order of increasing end point, of live intervals overlapping the current point and placed in registers.
LinearScanRegisterAllocation
active ← {}
for each live interval i, in order of increasing start point do
ExpireOldIntervals(i)
if length(active) = R then
SpillAtInterval(i)
else
register[i] ← a register removed from pool of free registers
add i to active, sorted by increasing end point

ExpireOldIntervals(i)
for each interval j in active, in order of increasing end point do
if endpoint[j] ≥ startpoint[i] then
return
remove j from active
add register[j] to pool of free registers

SpillAtInterval(i)
spill ← last interval in active
if endpoint[spill] > endpoint[i] then
register[i] ← register[spill]
location[spill] ← new stack location
remove spill from active
add i to active, sorted by increasing end point
else
location[i] ← new stack location

When a live interval begins, give that variable a
free register.
• When a live interval ends, the register is once
again free.
