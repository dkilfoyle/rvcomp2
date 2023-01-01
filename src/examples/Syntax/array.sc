void main() {
  int[5] j;
  int x = 10;
  j[0] = 1;
  j[1] = x;
  j[2] = x + 2;
  int y;
  y = j[0] + 8;

  print_int(j[0]); // 1
  print_int(j[1]); // 10
  print_int(j[2]); // 12
  print_int(y);    // 9
}

