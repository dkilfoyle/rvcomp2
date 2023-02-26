void main() {
  int x = 0;
  int y = 0;
  int r = 123;
  set_pixel(x, y, r, 0, 0);
  // char[3] p = get_pixel(x,y);
  // print_int(p[0]);
  print_int(get_pixel(x,y)[0]);
  if (get_pixel(x,y)[1]==255) print_int(100);
  render();
}
    