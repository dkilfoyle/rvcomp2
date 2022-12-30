int fib(int x) {
  if (x < 2) {
    return x;
  } else {
    return fib(x-1) + fib(x-2);
  }
}

int main() {
  int terms = 10;
  for (int i = 0; i < terms; i=i+1;) {
    print_int(fib(i));
  }
}