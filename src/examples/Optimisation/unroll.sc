void main() {
  // should unroll
  for (int i = 0; i < 2; i++;) {
    // if (i < 2)
      print_int(i);
  }
  // expect 0,1,2,3,4
}

// void bigLoop() {
//   // should not unroll
//   for (int j = 0; j < 5000; j++;) {
//     print_int(j);
//   }
// }
// 
// void innerLoop() {
//   // should not unroll
//   for (int j = 0; j < 5; j++;) {
//     for (int k = 0; k < 5; j++) {
//       print_int(k);
//     }
//   }
// }

