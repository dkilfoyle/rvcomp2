void main() {
  float y  = 0
while (y < 100)
  y = (y + 1)
  var x  = 0
  while (x < 100)
    x = (x + 1)

    var e = ((y / 50) - 1.5)
    var f = ((x / 50) - 1)

    var a = 0
    var b = 0
    var i = 0
    var j = 0
    var c = 0

    while ((((i * i) + (j * j)) < 4) && (c < 255))
      i = (((a * a) - (b * b)) + e)
      j = (((2 * a) * b) + f)
      a = i
      b = j
      c = (c + 1)
    endwhile
    setpixel (x, y, c)
  endwhile
endwhile
    