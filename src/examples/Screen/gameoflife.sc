void myadd(int f, int g) {
  print_int(f);
}

void main() {
  for (float i = 0f; i < 99f; i = i + 1f;) {
    //set_pixel(i,5f,0f,0f,0f);
    set_pixel(i+1f,0f,255f,0f,0f);
    render();
  }
}