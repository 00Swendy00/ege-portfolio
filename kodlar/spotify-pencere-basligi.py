# Windows'ta pencere basligini okuyup Arduino'ya seri porttan aktarir.
# Kurulum: pip install pyserial pygetwindow
# Not: Spotify Web API entegrasyonu degildir.
import time
import serial
import pygetwindow as gw

PORT = "COM9"  # Aygit Yoneticisi'ndeki Arduino COM portuyla degistirin.
BAUD = 9600


def ascii_cevir(metin):
    return metin.translate(str.maketrans("çğıöşüÇĞİÖŞÜ", "cgiosuCGIOSU"))


def baslik_bul():
    # Masaustunde Spotify muzik penceresinin basligi gorunebilir.
    # Baska programlarin basliklarini sarki sanmamak icin filtre koyduk.
    yasak = ("Google Chrome", "Microsoft Edge", "Visual Studio", "Discord", "Opera", "Administrator", "Arduino")
    for title in gw.getAllTitles():
        if title and " - " in title and not any(x.lower() in title.lower() for x in yasak):
            return title
    return None


with serial.Serial(PORT, BAUD, timeout=1) as arduino:
    time.sleep(2)
    onceki = None
    while True:
        baslik = baslik_bul()
        if baslik and baslik != onceki:
            onceki = baslik
            arduino.write((ascii_cevir(baslik) + "\n").encode("utf-8"))
            print("Gonderildi:", baslik)
        time.sleep(2)
