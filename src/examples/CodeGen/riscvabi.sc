// caller saved
// ra, a0-a7, t0-t6

// callee saved
// sp, fp/s0, s1-s11


int nocalls(int x) {
  // prolog
  // no need to save ra as it will not be changed by any jal/jalr
  // try to use only t registers, if success then no stack needed
  // could potentially also use a registers > max num of arguments
  // eg if no functions with > 5 arguments then A5, A6, A7 can be t registers
  // if necessary to use s registers then push/pop to stack
  return x*x;
  // epilog
  // no stack to pop, sp remains unchanged, ra has not been altered
  // mv A0, res
}

int makescall(int x, int y, int z) {
  // prolog
  // need a stack to save incoming callee-saved register that will be
  // overwritten in this function
  // - ra, any used s registers
  // use s registers for arguments and local variables
  // can use t registers if live range does not cross the function call

  // From Caller:
  // # a0 = x
  // # a1 = y
  // # a2 = z

  // Prolog
  // # Stack frame to save incoming callee-saved registers that will be used in func
  // # sp + 0 = ra
  // # sp + 4 = s1   => (int x)
  // # sp + 8 = s2   => (int y)
  // # sp + 12 = s3  => (int z)
  // # sp + 16 = s4  => (int i)
  // # sp + 20 = s5  => (int j)

  // save to stack any callee-saved registers used in this func
  // addi    sp, sp, -24
  // sd      ra, 0(sp)
  // sd      s1, 4(sp)
  // sd      s2, 8(sp)
  // sd      s3, 12(sp)
  // sd      s4, 16(sp)
  // sd      s5, 20(sp)

  // # register allocation
  // # s1 : x (a0)
  // # s2 : y (a1)
  // # s3 : z (a2)
  // # s4 : i (local)
  // # s5 : j (local)

  // # copy arguments to S registers and subsequently refer to Sx instead of Ax
  // # this means that eg A0 can be reassigned for function call without overwriting the **value** (stored in S1) of the parent caller's A0
  // # otherwise would need to push/pop all A registers before/after each function call  
  // mv      s1, a0
  // mv      s2, a1
  // mv      s3, a2

  int z = mycall(x, y, z, i, j);
  // mv a0, s1  # x
  // mv a1, s2  # y
  // mv a3, s3  # z
  // mv a4, s4  # I
  // mv a5. s5  # 
  int i = 2;
  int j = 3;
  return x + y + z + i + j;

  // # epilog
  // # pop the stack
  // ld      ra, 0(sp)
  // ld      s1, 4(sp)
  // ld      s2, 8(sp)
  // ld      s3, 12(sp)
  // ld      s4, 16(sp)
  // ld      s5, 20(sp)
  // addi    sp, sp, 24
  // # return result
  // mv a0, res
  // ret
}



void main() {
  // save ra to stack if any function calls

  // 
}