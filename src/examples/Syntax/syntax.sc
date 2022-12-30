// example of function declaration with params and return value
int doublesum(int x, int y) {
  return (x+y) * 2;
}

int testarray() {
  int j[5];
  j[0] = 1
  j[1] = 2;
  j[2] = 3;
  j[3] = 4;
  j[4] = 5;
  return j[3];
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

  // if/else
  if (a > 3) {
    print_int(0);
  } else {
    print_int(1);
  }

  // if no else
  if (a < 5) {
    print_int(1);
  }

  bool z = true;
  if (z) {
    print_int(1);
  }

  print_int(testarray());
}