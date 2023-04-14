void main(int b, int c, int f) {
  int a;
  int d;
  int e;
  while (b < 10) { // {b,c,f}
    a = b + c; // {a,c,f}
    d = 0 - a; // {c,d,f}
    e = d + f;
    if (e < 10) {
      f = 2 * 3;
    } else {
      b = d + e;
      e = e - 1;
    }
    b = f + c;
  }
  print_int(b);
}
