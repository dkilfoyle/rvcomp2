void main() {
  int count = 0;
  int x = 5;
  int y = 7;
  if (x > 0) {
    if (y > 0)
      if (get_pixel(x-1, y-1) > 0) count++;
    if (get_pixel(x-1, y) > 0) count++;
    if (y < 100)
      if (get_pixel(x-1, y+1) > 0) count++;
  }

  
  return count;
}