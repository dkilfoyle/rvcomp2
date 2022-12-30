void ssaif(bool cond) {
  int a = 4;
  if (cond) {
    a = a + a;
  } else {
    a = a * a;
  }
  print_int(a);
}

void ssafor() {
  for (int i = 0; i < 10; i=i+1;) {
    print_int(i);
  }
  print_int(100);
}

void main() {
  ssaif(true);
  ssafor();
}