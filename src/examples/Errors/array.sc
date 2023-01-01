
void main() {
  int[] x;
  int[y] x;
}

void semanticerrors() {
  int[5] i;
  i[5] = 10; // out of bounds
  i[1] = true; // type mismatch
}