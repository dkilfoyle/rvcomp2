void main() {
  int x = 10;
  int[5] z = [2, 4, x, x+2, x+4]

  //int[5] j;
  //j[0] = 1;
  //j[1] = x;
  //j[2] = x + 2;
  //int y;
  //y = j[0] + 8;

  //print_int(j[0]); // 1
  //print_int(j[1]); // 10
  //print_int(j[2]); // 12
  //print_int(y);    // 9
  print_int(z[2]); // 10
  print_int(z[3]); // 12
  print_int(z[4]); // 14
}

