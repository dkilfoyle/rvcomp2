// example of function declaration with params and return value
int doublesum(int x, int y) {
  return (x+y) * 2;
}

void main() {
  int a = 2;    // declaration and initiation
  int b;        // declaration without initiation
  b = 3;        // assignment

  // expression as param
  print_int(2 + 3 * doublesum(a,b));

  // for loop
  for (int i = 0; i < 10; i++) {
    print_int(i);
  } 
}