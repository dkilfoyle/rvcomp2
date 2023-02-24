void main() {
  int x = 0;
  int y = 0;
  int c = 255;
  set_pixel(x, y, c, 155, 0);
  print_int(get_pixel(x, y));
  render();
}
    