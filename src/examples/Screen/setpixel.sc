void main() {
  int x = 0;
  int y = 0;
  int r = 123;
  set_pixel(x, y, r, 0, 0);
  char[3] p = get_pixel(x,y);
  print_int(p[0]);
  render();
}
    