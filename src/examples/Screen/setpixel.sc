void main() {
  int x = 1;
  int y = 0;
  
  set_pixel(x, y, 65, 66, 67);
  
  char[3] p = get_pixel(x,y);
  print_int(p[0]); // expect 65

  print_int(get_pixel(x,y)[1]); // expect 66

  print_bool(get_pixel(x,y)[2]==67); // expect true
  render();
}
    