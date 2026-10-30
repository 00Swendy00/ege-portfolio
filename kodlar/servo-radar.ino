#include <Servo.h>

// Pinler, sayfadaki kullanici baglanti semasiyla aynidir.
const byte TRIG_PIN = 9;
const byte ECHO_PIN = 10;
const byte SERVO_PIN = 11;

Servo radarServo;

int mesafeOlc() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  unsigned long sure = pulseIn(ECHO_PIN, HIGH, 30000UL);
  if (sure == 0) return 0;
  return (int)(sure * 0.0343f / 2.0f);
}

void olcVeGonder(int aci) {
  radarServo.write(aci);
  delay(35);
  Serial.print(aci);
  Serial.print(',');
  Serial.print(mesafeOlc());
  Serial.print('.');
}

void setup() {
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  radarServo.attach(SERVO_PIN);
  Serial.begin(9600);
}

void loop() {
  for (int aci = 15; aci <= 165; aci++) olcVeGonder(aci);
  for (int aci = 165; aci >= 15; aci--) olcVeGonder(aci);
}
