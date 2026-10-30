#include <MD_Parola.h>
#include <MD_MAX72xx.h>
#include <SPI.h>

#define HARDWARE_TYPE MD_MAX72XX::FC16_HW
#define MAX_DEVICES 4
#define DATA_PIN 11
#define CS_PIN 10
#define CLK_PIN 13

MD_Parola ekran(HARDWARE_TYPE, DATA_PIN, CLK_PIN, CS_PIN, MAX_DEVICES);
String mesaj = "Spotify hazir";

void setup() {
  Serial.begin(9600);
  Serial.setTimeout(100);
  ekran.begin();
  ekran.setIntensity(3);
  ekran.displayClear();
  ekran.displayText(mesaj.c_str(), PA_LEFT, 65, 0, PA_SCROLL_LEFT, PA_SCROLL_LEFT);
}

void loop() {
  if (Serial.available()) {
    String yeni = Serial.readStringUntil('\n');
    yeni.trim();
    if (yeni.length() > 0) {
      mesaj = yeni;
      ekran.displayClear();
      ekran.displayText(mesaj.c_str(), PA_LEFT, 65, 0, PA_SCROLL_LEFT, PA_SCROLL_LEFT);
    }
  }
  ekran.displayAnimate();
}
