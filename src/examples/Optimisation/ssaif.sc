void ssaif(bool cond) {
  int a = 47;
  if (cond) {
    a = a + a;
  } else {
    a = a * a;
  }
  print_int(a);
}

void main() {
  ssaif(true);
}