void myeffectonlyfunc() {
  print_int(16);
}

bool mytruefunc() {
  return 5 > 2;
}

void main() {
  // variable declaration statement
  int x = 1;
  print_int(x); // expect 1

  // assign statement
  x = 2;
  print_int(x); // expect 2

  // if/else - expect 3
  if (x > 10) {
    print_int(0);
  } else {
    print_int(3);
  }

  // if no else - expect 4
  if (x < 6) {
    print_int(4);
  }

  bool b = 3 > 2;
  // if true variable - expect 5
  if (b) {
    print_int(5);
  } else {}

  // if true expression
  if (mytruefunc()) 
    print_int(1);
  else
    print_int(0);

  // for loop
  for (int y = 6; y < 11; y = y + 1;) {
    print_int(y);
  } // expect 6 7 8 9 10

  // while statement
  int j = 0;
  while (j < 5) {
    print_int(11 + j);
    j = j + 1;
  }

  // function call statement
  myeffectonlyfunc(); // expect 16

  // return statement
  return 17;
}