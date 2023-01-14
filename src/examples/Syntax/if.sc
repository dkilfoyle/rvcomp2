void main() {
  int i = 5;

  if (i < 10)
    print_int(1);
  
  if (i < 10) {
    print_int(1);
  }
  
  if (i < 10) {
    print_int(1);
  } else {
    print_int(0);
  }

  if (i < 10) {
    if (i > 0) {
      print_int(1);
    } else {
      print_int(0);
    }
  } else {
    print_int(0);
  }

}