import processing.serial.*;

Serial port;
int aci = 90;
int mesafe = 0;

void setup() {
  size(1100, 650);
  smooth();
  println(Serial.list());
  // Listedeki uygun portu secin (ornegin Serial.list()[0]).
  port = new Serial(this, Serial.list()[0], 9600);
  port.bufferUntil('.');
}

void serialEvent(Serial p) {
  String veri = p.readStringUntil('.');
  if (veri == null) return;
  veri = trim(veri.substring(0, veri.length() - 1));
  String[] alan = split(veri, ',');
  if (alan.length != 2) return;
  int yeniAci = int(alan[0]);
  int yeniMesafe = int(alan[1]);
  if (yeniAci >= 0 && yeniAci <= 180) aci = yeniAci;
  if (yeniMesafe >= 0) mesafe = yeniMesafe;
}

void draw() {
  background(4, 12, 17);
  translate(width / 2, height - 65);
  noFill();
  stroke(38, 197, 88);
  strokeWeight(2);
  for (int r = 160; r <= 950; r += 160) arc(0, 0, r, r, PI, TWO_PI);
  line(-480, 0, 480, 0);
  for (int a = 30; a <= 150; a += 30) {
    float x = 480 * cos(radians(a));
    float y = -480 * sin(radians(a));
    line(0, 0, x, y);
  }
  float x = 470 * cos(radians(aci));
  float y = -470 * sin(radians(aci));
  stroke(67, 255, 131);
  strokeWeight(4);
  line(0, 0, x, y);
  if (mesafe > 0 && mesafe < 40) {
    float hedefUzaklik = map(mesafe, 0, 40, 0, 470);
    stroke(255, 87, 87);
    strokeWeight(12);
    point(hedefUzaklik * cos(radians(aci)), -hedefUzaklik * sin(radians(aci)));
  }
  resetMatrix();
  fill(163, 249, 181);
  textSize(22);
  text("Arduino Servo Radar", 26, 36);
  textSize(17);
  text("Aci: " + aci + "°", 26, height - 20);
  text("Mesafe: " + (mesafe == 0 ? "Olcum yok" : mesafe + " cm"), 195, height - 20);
}
