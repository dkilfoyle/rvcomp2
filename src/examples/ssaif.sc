void main(bool cond) {
  int a = 47;
  if (cond == true) {
    a = a + a;
  } else {
    a = a * a;
  }
  print_int(a);
}