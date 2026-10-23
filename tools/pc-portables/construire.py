import re
#!/usr/bin/env python3
"""Construit pc-portables.json et le lexique à partir de la liste éditable plus bas.

Les prix et fiches viennent de relevés publics d'octobre 2026 (Les Numériques,
JVTECH, FranceMetrics, fiches constructeur). Ce n'est pas un banc d'essai.
Un score est une compatibilité de profil, plafonnée à 9, jamais une note absolue.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]   # racine du dépôt
DATA = ROOT / "data"

# cpu_niveau : 1 entrée, 2 correct, 3 confort, 4 solide, 5 élevé, 6 très élevé, 7 station
# gpu_niveau : 0 intégré modeste, 2 iGPU solide, 4 RTX 5060, 5 RTX 5070, 7 RTX 5090
# classe_autonomie si les heures ne sont pas sourcées : arm, ultra, poly, gamer
MODELS = [
    dict(id="macbook-air-13-m5", nom="Apple MacBook Air 13 (M5)", marque="Apple", prix=1284,
         cpu="Apple M5", ram=16, ssd=512, gpu="GPU intégré Apple M5", gpu_n=2, cpu_n=6,
         tech="IPS", diag=13.6, hz=None, res="Liquid Retina", nits=500, poids=1.24, heures=18, hsrc="annoncee",
         os="macos", classe="arm",
         forts=["Silencieux, sans ventilateur", "Autonomie annoncée longue", "16 Go et 512 Go dès cette config"],
         faibles=["Pas de carte graphique dédiée", "Ports limités à l’USB-C"],
         note="Config 16 Go / 512 Go relevée à 1 284 € (Cdiscount, 9 oct. 2026). Les Numériques indique un départ vers 1 199–1 299 €.",
         sources=["FranceMetrics 2026-10-09", "Les Numériques oct. 2026"]),
    dict(id="macbook-air-15-m5", nom="Apple MacBook Air 15 (M5)", marque="Apple", prix=1699,
         cpu="Apple M5", ram=16, ssd=512, gpu="GPU intégré Apple M5", gpu_n=2, cpu_n=6,
         tech="IPS", diag=15.3, hz=None, res=None, nits=None, poids=1.51, heures=None, hsrc=None,
         os="macos", classe="arm",
         forts=["Grand écran dans un châssis sans ventilateur", "Même puce M5 que le 13 pouces"],
         faibles=["Plus lourd et plus cher que le 13 pouces", "Autonomie réelle non citée dans le relevé"],
         note="Prix Boulanger relevé le 9 oct. 2026. RAM et SSD : configuration la plus citée, à confirmer sur la fiche marchand.",
         sources=["FranceMetrics 2026-10-09"]),
    dict(id="macbook-air-13-m4", nom="Apple MacBook Air 13 (M4)", marque="Apple", prix=1352,
         cpu="Apple M4 (10 cœurs CPU, 8 cœurs GPU)", ram=16, ssd=256, gpu="GPU intégré Apple M4", gpu_n=2, cpu_n=5,
         tech="IPS", diag=13.6, hz=None, res="2560 × 1664", nits=None, poids=1.24, heures=18, hsrc="annoncee",
         os="macos", classe="arm",
         forts=["Encore très endurant et silencieux", "Assez de puissance pour un montage léger"],
         faibles=["Souvent 256 Go en entrée : juste pour les photos et les projets", "M5 déjà en rayon à un prix proche"],
         note="Prix de départ Les Numériques, oct. 2026. Fiche JVTECH : 16 Go, SSD 256 Go, jusqu’à 18 h.",
         sources=["Les Numériques oct. 2026", "JVTECH oct. 2026"]),
    dict(id="macbook-neo", nom="Apple MacBook Neo", marque="Apple", prix=799,
         cpu="Apple A18 Pro (6 cœurs, 2 performance)", ram=8, ssd=256, gpu="GPU intégré 5 cœurs", gpu_n=0, cpu_n=3,
         tech="IPS", diag=13.0, hz=None, res="2408 × 1506", nits=500, poids=1.23, heures=16, hsrc="annoncee",
         os="macos", classe="arm",
         forts=["Le Mac neuf le moins cher", "1,23 kg, 500 nits, une journée en vidéo annoncée"],
         faibles=["8 Go soudés, non évolutifs", "Un des deux USB-C est limité à l’USB 2", "Clavier sans rétroéclairage sur le 256 Go"],
         note="8 Go / 256 Go à 799 € depuis juin 2026 (699 € au lancement). 512 Go avec Touch ID vers 899 €. Batterie 36,5 Wh. Jusqu’à 16 h vidéo, 11 h web, tests Apple.",
         sources=["Fiche Apple, sept. 2026", "Wanda-techs 2026-10-05"]),
    dict(id="macbook-pro-14-m5", nom="Apple MacBook Pro 14 (M5)", marque="Apple", prix=2199,
         cpu="Apple M5", ram=16, ssd=1024, gpu="GPU intégré Apple M5", gpu_n=2, cpu_n=6,
         tech="Mini-LED", diag=14.2, hz=None, res=None, nits=None, poids=1.55, heures=None, hsrc=None,
         os="macos", classe="arm",
         forts=["Écran mini-LED de la famille Pro", "1 To dans la config citée", "Châssis encore transportable"],
         faibles=["Le départ Les Numériques est plus bas : une autre config", "16 Go limitent un gros montage"],
         note="Fiche 16 Go / 1 To à 2 199 € (relevé oct. 2026). Les Numériques affiche un départ vers 1 900 €.",
         sources=["FranceMetrics 2026-10-09", "Les Numériques oct. 2026"]),
    dict(id="macbook-pro-14-m5-max", nom="Apple MacBook Pro 14 (M5 Max)", marque="Apple", prix=4184,
         cpu="Apple M5 Max (18 cœurs CPU)", ram=36, ssd=2048, gpu="GPU Apple M5 Max 32 cœurs", gpu_n=2, cpu_n=7,
         tech="Mini-LED", diag=14.2, hz=120, res="3024 × 1964", nits=1600, poids=1.62, heures=20, hsrc="annoncee",
         os="macos", classe="arm",
         forts=["Station de montage dans 1,6 kg", "Écran 120 Hz, 1 600 nits", "36 Go et 2 To minimum sur cette fiche"],
         faibles=["Prix d’une station fixe", "Le GPU Apple ne remplace pas une RTX pour tous les jeux Windows"],
         note="À partir de 4 184 €. Autonomie : jusqu’à 20 h de streaming vidéo, annonce Apple reprise par JVTECH.",
         sources=["JVTECH 2026-10-07"]),
    dict(id="galaxy-book6-pro", nom="Samsung Galaxy Book6 Pro", marque="Samsung", prix=2994,
         cpu="Intel Core Ultra X7 358H (16 cœurs)", ram=32, ssd=1024, gpu="Intel Arc B390", gpu_n=2, cpu_n=6,
         tech="OLED", diag=None, hz=120, res="2880 × 1800", nits=None, poids=1.59, heures=22, hsrc="annoncee",
         os="windows", classe="ultra",
         forts=["iGPU Arc B390 au-dessus d’un intégré courant", "OLED 120 Hz", "22 h annoncées en streaming"],
         faibles=["Pas de pavé numérique", "La config 32 Go / 1 To n’est pas le prix d’entrée"],
         note="Fiche JVTECH à partir de 2 994 €. Les Numériques voit un Book6 Pro 14 dès environ 1 740 € : autre configuration.",
         sources=["JVTECH 2026-10-07", "Les Numériques oct. 2026"]),
    dict(id="galaxy-book4-edge", nom="Samsung Galaxy Book4 Edge", marque="Samsung", prix=929,
         cpu="Qualcomm Snapdragon X Elite", ram=16, ssd=1024, gpu="GPU Adreno intégré", gpu_n=2, cpu_n=5,
         tech="OLED", diag=16.0, hz=120, res="2880 × 1800", nits=None, poids=1.55, heures=22, hsrc="annoncee",
         os="windows", classe="arm",
         forts=["OLED 16 pouces sous 1 000 € dans ce relevé", "1 To", "22 h annoncées"],
         faibles=["Windows sur Arm : vérifier chaque logiciel", "Génération X, pas X2"],
         note="Couverture couleur annoncée 110 % DCI-P3. Prix JVTECH à partir de 929 €.",
         sources=["JVTECH 2026-10-07"]),
    dict(id="galaxy-book5-pro-360", nom="Samsung Galaxy Book5 Pro 360", marque="Samsung", prix=2204,
         cpu="Intel Core Ultra 7 256V", ram=16, ssd=512, gpu="Intel Arc intégré", gpu_n=2, cpu_n=5,
         tech="OLED", diag=16.0, hz=None, res=None, nits=None, poids=1.69, heures=None, hsrc=None,
         os="windows", classe="ultra",
         forts=["Charnière 360, utile crayon et visio", "Core Ultra série 200 avec NPU"],
         faibles=["1,69 kg : moins sac à dos qu’un 14 pouces", "512 Go justes si la vidéo s’empile"],
         note="Prix FranceMetrics 2 203,99 € le 9 oct. 2026. Les Numériques cite aussi un Galaxy Book5 360 vers 1 199 €, config différente.",
         sources=["FranceMetrics 2026-10-09"]),
    dict(id="dell-xps-13-core5", nom="Dell XPS 13 (Core 5)", marque="Dell", prix=1149,
         cpu="Intel Core 5 320", ram=8, ssd=512, gpu="Intel Graphics intégré", gpu_n=0, cpu_n=3,
         tech="IPS", diag=13.4, hz=None, res=None, nits=None, poids=None, heures=None, hsrc=None,
         os="windows", classe="ultra",
         forts=["Châssis compact", "512 Go"],
         faibles=["8 Go : trop juste dès que plusieurs applis restent ouvertes", "Prix d’ultrabook pour une mémoire d’entrée"],
         note="Que Choisir, modèle DX13260 : Core 5 320, 8 Go, 512 Go, 13,4 pouces. Départ Les Numériques vers 1 149 €.",
         sources=["Que Choisir 2026", "Les Numériques oct. 2026"]),
    dict(id="dell-14-plus-2en1", nom="Dell 14 Plus 2-en-1", marque="Dell", prix=1000,
         cpu="Intel Core Ultra 5 226V", ram=16, ssd=512, gpu="Intel Arc intégré", gpu_n=2, cpu_n=4,
         tech=None, diag=14.0, hz=None, res=None, nits=None, poids=None, heures=None, hsrc=None,
         os="windows", classe="ultra",
         forts=["16 Go dans un 2-en-1 vers 1 000 €", "Core Ultra avec NPU"],
         faibles=["Type de dalle non précisé dans le relevé", "Poids non cité"],
         note="Que Choisir : DB04250, prix indicatif 1 000 €.",
         sources=["Que Choisir 2026"]),
    dict(id="ideapad-slim-3-14-r7", nom="Lenovo IdeaPad Slim 3 14 (Ryzen 7)", marque="Lenovo", prix=630,
         cpu="AMD Ryzen 7 170", ram=16, ssd=512, gpu="Radeon intégrée", gpu_n=0, cpu_n=4,
         tech="IPS", diag=14.0, hz=None, res=None, nits=None, poids=1.39, heures=None, hsrc=None,
         os="windows", classe="poly",
         forts=["16 Go / 512 Go sous 650 €", "1,39 kg"],
         faibles=["Dalle IPS, pas OLED", "iGPU insuffisant pour jouer"],
         note="629,99 €, relevé FranceMetrics du 9 oct. 2026.",
         sources=["FranceMetrics 2026-10-09"]),
    dict(id="ideapad-slim-3-15", nom="Lenovo IdeaPad Slim 3 15", marque="Lenovo", prix=650,
         cpu="AMD Ryzen 5", ram=16, ssd=512, gpu="Radeon intégrée", gpu_n=0, cpu_n=3,
         tech=None, diag=15.6, hz=None, res=None, nits=None, poids=1.62, heures=None, hsrc=None,
         os="windows", classe="poly",
         forts=["Grand écran et 16 Go pour un prix d’étudiant"],
         faibles=["Référence Ryzen 5 non détaillée dans le relevé", "Plus lourd que le 14 pouces"],
         note="IdeaPad Slim 3 15AMN8, 649,99 € le 9 oct. 2026.",
         sources=["FranceMetrics 2026-10-09"]),
    dict(id="ideapad-slim-3-14-oled", nom="Lenovo IdeaPad Slim 3 14 OLED", marque="Lenovo", prix=864,
         cpu="Intel Core i5-13420H", ram=16, ssd=512, gpu="Intel UHD / Iris intégré", gpu_n=0, cpu_n=4,
         tech="OLED", diag=14.0, hz=None, res="1920 × 1200", nits=400, poids=1.45, heures=None, hsrc=None,
         os="windows", classe="poly",
         forts=["OLED 400 nits à moins de 900 €", "16 Go DDR5"],
         faibles=["Parfois vendu sans Windows", "Puce de génération précédente"],
         note="IdeaPad Slim 3 14IRH10, à partir de 864 € (JVTECH).",
         sources=["JVTECH 2026-10-07"]),
    dict(id="yoga-slim-7-14", nom="Lenovo Yoga Slim 7 14", marque="Lenovo", prix=980,
         cpu="Intel Core Ultra 7 256V", ram=16, ssd=1024, gpu="Intel Arc intégré", gpu_n=2, cpu_n=5,
         tech="OLED", diag=14.0, hz=None, res=None, nits=None, poids=1.19, heures=None, hsrc=None,
         os="windows", classe="ultra",
         forts=["1,19 kg", "1 To", "Core Ultra 7 Lunar Lake"],
         faibles=["16 Go seulement", "Autonomie non chiffrée dans le relevé"],
         note="Yoga Slim 7 14ILL10, 979,99 € le 9 oct. 2026.",
         sources=["FranceMetrics 2026-10-09"]),
    dict(id="yoga-slim-7x", nom="Lenovo Yoga Slim 7x", marque="Lenovo", prix=1445,
         cpu="Qualcomm Snapdragon X Elite (12 cœurs)", ram=32, ssd=512, gpu="Adreno intégré", gpu_n=2, cpu_n=5,
         tech="OLED", diag=14.5, hz=90, res="2944 × 1840", nits=None, poids=1.28, heures=15.5, hsrc="annoncee",
         os="windows", classe="arm",
         forts=["OLED très couvert (173 % sRGB annoncés)", "32 Go", "1,28 kg"],
         faibles=["512 Go", "90 Hz seulement", "Logiciels x86 à vérifier"],
         note="À partir de 1 444,51 € (JVTECH). Les Numériques affiche aussi un départ vers 1 750 €.",
         sources=["JVTECH 2026-10-07"]),
    dict(id="loq-15-ryzen-5060", nom="Lenovo LOQ 15 (Ryzen, RTX 5060)", marque="Lenovo", prix=1449,
         cpu="AMD Ryzen 7 250", ram=32, ssd=1024, gpu="NVIDIA GeForce RTX 5060", gpu_n=4, cpu_n=5,
         tech="IPS", diag=15.6, hz=None, res="QHD", nits=None, poids=2.40, heures=None, hsrc=None,
         os="windows", classe="gamer",
         forts=["RTX 5060 avec 32 Go et 1 To", "Dalle QHD"],
         faibles=["2,4 kg", "Autonomie de PC gamer, pas de journée de cours"],
         note="LOQ 15AHP10, 1 449 € le 9 oct. 2026. TGP non publié dans le relevé.",
         sources=["FranceMetrics 2026-10-09"]),
    dict(id="loq-15-intel-5060", nom="Lenovo LOQ 15 (Intel, RTX 5060)", marque="Lenovo", prix=1215,
         cpu="Intel Core i5-13450HX", ram=16, ssd=512, gpu="NVIDIA GeForce RTX 5060 (100 W)", gpu_n=4, cpu_n=4,
         tech="IPS", diag=15.6, hz=144, res="FHD", nits=None, poids=None, heures=None, hsrc=None,
         os="sans", classe="gamer",
         forts=["RTX 5060 100 W sous 1 250 €", "144 Hz", "Connectique généreuse"],
         faibles=["Souvent sans Windows", "CPU plus ancien", "FHD seulement"],
         note="LOQ 15IRX10 83JE001QFR, à partir de 1 214,99 € (JVTECH).",
         sources=["JVTECH 2026-10-07"]),
    dict(id="chromebook-plus-14", nom="Lenovo Chromebook Plus 14", marque="Lenovo", prix=640,
         cpu="MediaTek Kompanio Ultra 910", ram=16, ssd=256, gpu="Arm Immortalis-G925", gpu_n=0, cpu_n=3,
         tech="OLED", diag=14.0, hz=60, res="1920 × 1200", nits=None, poids=1.17, heures=12.5, hsrc="mesuree",
         os="chromeos", classe="poly",
         forts=["OLED dans 1,17 kg", "16 Go", "ChromeOS simple pour les cours en ligne"],
         faibles=["256 Go en UFS, pas un gros SSD", "Pas les logiciels Windows", "Le prix français cité est bas face au tarif US"],
         note="Les Numériques : à partir de 639,99 €. Fiche testée PCMag : 16 Go, 256 Go UFS, OLED 60 Hz, 12 h 27 mesurées, NPU 50 TOPS. Vérifier que l’offre à 640 € est bien cette config.",
         sources=["Les Numériques oct. 2026", "LaptopMedia oct. 2026", "PCMag 2026"]),
    dict(id="chromebook-plus-514", nom="Acer Chromebook Plus 514", marque="Acer", prix=360,
         cpu="Intel Core 3 N355", ram=8, ssd=512, gpu="Intel Graphics intégré", gpu_n=0, cpu_n=2,
         tech="IPS", diag=14.0, hz=None, res=None, nits=None, poids=1.43, heures=None, hsrc=None,
         os="chromeos", classe="poly",
         forts=["Prix d’entrée réel", "512 Go", "1,43 kg"],
         faibles=["8 Go", "ChromeOS seulement", "Dalle IPS ordinaire"],
         note="359,99 € le 9 oct. 2026.",
         sources=["FranceMetrics 2026-10-09"]),
    dict(id="chromebook-plus-515", nom="Acer Chromebook Plus 515", marque="Acer", prix=391,
         cpu="Intel Core i3-1215U", ram=8, ssd=128, gpu="Intel UHD intégré", gpu_n=0, cpu_n=2,
         tech="IPS", diag=15.6, hz=None, res="1920 × 1080", nits=None, poids=None, heures=10, hsrc="annoncee",
         os="chromeos", classe="poly",
         forts=["Grand écran mat", "Autonomie annoncée correcte pour le prix"],
         faibles=["128 Go : se remplit vite", "8 Go", "Puce ancienne"],
         note="CB515-2H, à partir de 391 € (JVTECH). 10 h annoncées.",
         sources=["JVTECH 2026-10-07"]),
    dict(id="swift-go-14-oled", nom="Acer Swift Go 14 OLED", marque="Acer", prix=1400,
         cpu="AMD Ryzen AI 7 350", ram=16, ssd=512, gpu="Radeon intégrée", gpu_n=2, cpu_n=5,
         tech="OLED", diag=14.0, hz=None, res=None, nits=None, poids=1.29, heures=None, hsrc=None,
         os="windows", classe="ultra",
         forts=["OLED et Ryzen AI dans 1,29 kg"],
         faibles=["16 Go / 512 Go au prix d’un Air M5 mieux doté en stockage", "Autonomie non chiffrée ici"],
         note="1 399,99 €, Acer, 9 oct. 2026.",
         sources=["FranceMetrics 2026-10-09"]),
    dict(id="nitro-v-16", nom="Acer Nitro V 16 AI", marque="Acer", prix=1600,
         cpu="AMD Ryzen 7 260", ram=16, ssd=512, gpu="NVIDIA GeForce RTX 5060", gpu_n=4, cpu_n=5,
         tech="IPS", diag=16.0, hz=None, res=None, nits=None, poids=2.10, heures=None, hsrc=None,
         os="windows", classe="gamer",
         forts=["RTX 5060 en 16 pouces", "Plus léger qu’un 18 pouces"],
         faibles=["16 Go / 512 Go justes pour les jeux installés", "TGP non publié"],
         note="1 599,99 € chez Darty le 9 oct. 2026.",
         sources=["FranceMetrics 2026-10-09"]),
    dict(id="predator-helios-neo-16", nom="Acer Predator Helios Neo 16 AI", marque="Acer", prix=2299,
         cpu="Intel Core Ultra 9 275HX", ram=32, ssd=1024, gpu="NVIDIA GeForce RTX 5070", gpu_n=5, cpu_n=7,
         tech="IPS", diag=16.0, hz=None, res=None, nits=None, poids=2.70, heures=None, hsrc=None,
         os="windows", classe="gamer",
         forts=["RTX 5070, 32 Go, 1 To", "CPU HX de station portable"],
         faibles=["2,7 kg, usage sédentaire", "Prix Acer vu à 2 599 € le 25 sept. 2026 selon les offres"],
         note="Relevé FranceMetrics 2 299 €. TGP non publié.",
         sources=["FranceMetrics 2026-10-09"]),
    dict(id="zenbook-14-oled", nom="Asus Zenbook 14 OLED (UM3406)", marque="Asus", prix=850,
         cpu="AMD Ryzen AI 7 350", ram=16, ssd=512, gpu="Radeon intégrée", gpu_n=2, cpu_n=5,
         tech="OLED", diag=14.0, hz=None, res=None, nits=None, poids=1.20, heures=None, hsrc=None,
         os="windows", classe="ultra",
         forts=["OLED à 850 €", "1,20 kg", "Ryzen AI 7"],
         faibles=["16 Go soudés sur cette fiche", "512 Go"],
         note="UM3406KA, 849,99 € le 9 oct. 2026. Une autre offre Amazon était à 1 099 € le 6 oct.",
         sources=["FranceMetrics 2026-10-09"]),
    dict(id="zenbook-a14", nom="Asus Zenbook A14 (Snapdragon X)", marque="Asus", prix=800,
         cpu="Qualcomm Snapdragon X Elite X1E-78-100", ram=16, ssd=512, gpu="Adreno intégré", gpu_n=2, cpu_n=5,
         tech="OLED", diag=14.0, hz=None, res="2880 × 1800", nits=None, poids=0.98, heures=32, hsrc="annoncee",
         os="windows", classe="arm",
         forts=["Moins d’un kilo", "OLED 2,8K", "Autonomie annoncée très longue"],
         faibles=["JVTECH a mesuré plutôt 20 h que 32 h", "16 Go / 512 Go", "Windows sur Arm"],
         note="À partir de 799,99 € (JVTECH). Ne pas confondre avec le Zenbook A14 Snapdragon X Plus, plus cher.",
         sources=["JVTECH 2026-10-07"]),
    dict(id="zenbook-a14-x-plus", nom="Asus Zenbook A14 (Snapdragon X Plus)", marque="Asus", prix=1200,
         cpu="Qualcomm Snapdragon X Plus", ram=32, ssd=1024, gpu="Adreno intégré", gpu_n=2, cpu_n=5,
         tech="OLED", diag=14.0, hz=None, res=None, nits=None, poids=0.98, heures=None, hsrc=None,
         os="windows", classe="arm",
         forts=["32 Go et 1 To sous 1 kg", "OLED"],
         faibles=["Plus cher que le A14 X Elite 16 Go", "Heures d’autonomie non citées sur ce relevé"],
         note="1 199,99 € chez Boulanger le 7 oct. 2026. Génération de puce à vérifier sur l’étiquette (X ou X2).",
         sources=["FranceMetrics 2026-10-07"]),
    dict(id="zenbook-a16", nom="Asus Zenbook A16", marque="Asus", prix=2500,
         cpu="Qualcomm Snapdragon X2 Elite Extreme (18 cœurs)", ram=48, ssd=1024, gpu="Adreno intégré", gpu_n=2, cpu_n=6,
         tech="OLED", diag=16.0, hz=120, res="3K", nits=None, poids=1.20, heures=20, hsrc="annoncee",
         os="windows", classe="arm",
         forts=["16 pouces OLED dans 1,2 kg", "48 Go", "20 h de lecture vidéo annoncées"],
         faibles=["Prix élevé", "Chargeur jugé encombrant", "Pas une RTX"],
         note="À partir de 2 499,95 € (JVTECH).",
         sources=["JVTECH 2026-10-07"]),
    dict(id="zenbook-s16-oled", nom="Asus Zenbook S 16 OLED", marque="Asus", prix=1800,
         cpu="AMD Ryzen AI 7 350", ram=24, ssd=1024, gpu="AMD Radeon intégrée", gpu_n=2, cpu_n=5,
         tech="OLED", diag=16.0, hz=120, res="2880 × 1800", nits=None, poids=1.50, heures=None, hsrc=None,
         os="windows", classe="ultra",
         forts=["OLED 120 Hz, 100 % DCI-P3 annoncés", "24 Go et 1 To", "1,5 kg en 16 pouces"],
         faibles=["Mémoire soudée", "Le test Les Numériques plus ancien portait un Ryzen AI 9 HX 370 / 32 Go : lire la puce exacte"],
         note="Départ Les Numériques 1 799,99 € pour la série Ryzen AI 300. Fiche Asus 2025 : Ryzen AI 7 350, 24 Go, 1 To, OLED tactile 120 Hz. Des séries 2024 montent à 32 Go et un HX 370.",
         sources=["Les Numériques oct. 2026", "Asus fév. 2025"]),
    dict(id="rog-strix-scar-18", nom="Asus ROG Strix Scar 18", marque="Asus", prix=4569,
         cpu="Intel Core Ultra 9 275HX", ram=64, ssd=4096, gpu="NVIDIA GeForce RTX 5090 (175 W)", gpu_n=7, cpu_n=7,
         tech="Mini-LED", diag=18.0, hz=240, res="2560 × 1600", nits=None, poids=None, heures=None, hsrc=None,
         os="windows", classe="gamer",
         forts=["RTX 5090 175 W", "64 Go et 4 To", "Mini-LED 240 Hz"],
         faibles=["Bruyant à pleine charge", "Prix et format de remplacement de tour", "Les Numériques a vu 5 600 €"],
         note="Config JVTECH à partir de 4 568,57 €. Ce n’est pas un portable de train.",
         sources=["JVTECH 2026-10-07", "Les Numériques oct. 2026"]),
    dict(id="omnibook-3-16", nom="HP OmniBook 3 16", marque="HP", prix=850,
         cpu="Intel Core Ultra 5 225U", ram=16, ssd=512, gpu="Intel Graphics intégré", gpu_n=0, cpu_n=4,
         tech="IPS", diag=16.0, hz=None, res=None, nits=None, poids=1.64, heures=None, hsrc=None,
         os="windows", classe="poly",
         forts=["16 pouces, 16 Go, sous 900 €", "1,64 kg raisonnable pour la diagonale"],
         faibles=["IPS, iGPU modeste", "Pas une machine de création"],
         note="849,99 € le 9 oct. 2026.",
         sources=["FranceMetrics 2026-10-09"]),
    dict(id="omnibook-5-16", nom="HP OmniBook 5 16", marque="HP", prix=949,
         cpu="AMD Ryzen AI 5 430", ram=16, ssd=512, gpu="Radeon intégrée", gpu_n=0, cpu_n=4,
         tech="OLED", diag=16.0, hz=None, res="1920 × 1200", nits=300, poids=1.69, heures=13, hsrc="annoncee",
         os="windows", classe="poly",
         forts=["OLED 16 pouces vers 950 €", "13 h annoncées", "HDMI 2.1"],
         faibles=["300 nits : fade en plein jour", "WUXGA, pas 3K", "D’autres configs (Core Ultra 7, Snapdragon) changent tout"],
         note="Bas de comparateur idealo.de, oct. 2026, variante 16-bp0153ng. Le prix français peut différer. Batterie des séries HP : 68 Wh sur la fiche support, pas forcément cette variante.",
         sources=["idealo.de oct. 2026", "HP Support 2026"]),
    dict(id="omen-16-5070", nom="HP Omen 16", marque="HP", prix=1300,
         cpu="AMD Ryzen AI 7 350", ram=16, ssd=512, gpu="NVIDIA GeForce RTX 5070", gpu_n=5, cpu_n=5,
         tech="IPS", diag=16.0, hz=240, res="2560 × 1600", nits=None, poids=None, heures=None, hsrc=None,
         os="sans", classe="gamer",
         forts=["RTX 5070 et dalle 240 Hz", "Rapport cité comme bon pour cette carte"],
         faibles=["16 Go / 512 Go courts pour une 5070", "Souvent sans Windows", "TGP non publié"],
         note="Omen 16-ap0034nf : 1 299,99 € (Cdiscount via frandroid, relevé 19 oct. 2026) ; 1 671,32 € relevé le 7 oct. (JVTECH).",
         sources=["JVTECH 2026-10-07", "frandroid (bon plan, relevé 19 oct. 2026) — https://www.frandroid.com/bons-plans/3001783_on-a-deniche-une-excellente-offre-laptop-gaming-le-surpuissant-hp-omen-16-sous-rtx-5070-est-a-1-299-euros"]),
    dict(id="surface-laptop-8", nom="Microsoft Surface Laptop 8 (13,8\")", marque="Microsoft", prix=1450,
         cpu="Qualcomm Snapdragon X2 Plus", ram=16, ssd=512, gpu="Adreno intégré", gpu_n=2, cpu_n=5,
         tech=None, diag=13.8, hz=None, res=None, nits=None, poids=None, heures=None, hsrc=None,
         os="windows", classe="arm",
         forts=["Format Surface, X2 Plus", "16 Go / 512 Go"],
         faibles=["Dalle et poids absents du relevé", "Windows sur Arm"],
         note="1 449,99 € le 9 oct. 2026. Ne pas mélanger avec le Surface Laptop 7.",
         sources=["FranceMetrics 2026-10-09"]),
    dict(id="surface-laptop-7", nom="Microsoft Surface Laptop 7 (13,8\")", marque="Microsoft", prix=1500,
         cpu="Qualcomm Snapdragon X Elite", ram=16, ssd=512, gpu="Adreno intégré", gpu_n=2, cpu_n=5,
         tech=None, diag=13.8, hz=None, res=None, nits=None, poids=1.34, heures=None, hsrc=None,
         os="windows", classe="arm",
         forts=["1,34 kg", "Snapdragon X Elite"],
         faibles=["16 Go / 512 Go", "Génération précédente face au Laptop 8"],
         note="Les Numériques : départ 1 499,99 € en X Elite. FranceMetrics cite aussi 1 649,99 €.",
         sources=["Les Numériques oct. 2026", "FranceMetrics 2026-10-09"]),
    dict(id="msi-katana-15", nom="MSI Katana 15 HX", marque="MSI", prix=1399,
         cpu="Intel Core i7-14650HX", ram=16, ssd=1024, gpu="NVIDIA GeForce RTX 5070", gpu_n=5, cpu_n=5,
         tech=None, diag=15.6, hz=None, res=None, nits=None, poids=2.40, heures=None, hsrc=None,
         os="windows", classe="gamer",
         forts=["RTX 5070 et 1 To vers 1 400 €", "CPU HX"],
         faibles=["2,4 kg", "16 Go seulement", "TGP non publié", "Une autre Katana 5070 est listée en 512 Go vers 1 500 €"],
         note="Katana 15 HX B14WGK-018FR, 1 399 € le 9 oct. 2026.",
         sources=["FranceMetrics 2026-10-09"]),
    dict(id="thomson-neo-15", nom="Thomson Neo 15", marque="Thomson", prix=550,
         cpu="AMD Ryzen 5 7430U", ram=16, ssd=512, gpu="Radeon intégrée", gpu_n=0, cpu_n=3,
         tech="IPS", diag=15.6, hz=None, res="1920 × 1080", nits=None, poids=1.80, heures=None, hsrc=None,
         os="windows", classe="poly",
         forts=["16 Go / 512 Go à 550 €", "Suffisant pour cours et bureautique"],
         faibles=["Dalle FHD IPS basique", "Puce économe, pas taillée pour durer des années lourdes", "1,8 kg"],
         note="Neo NX15R5, 549,99 € le 9 oct. 2026.",
         sources=["FranceMetrics 2026-10-09"]),
    dict(id="vivobook-16-oled", nom="Asus Vivobook 16 OLED", marque="Asus", prix=550,
         cpu="AMD Ryzen 5", ram=16, ssd=512, gpu="Radeon intégrée", gpu_n=0, cpu_n=3,
         tech="OLED", diag=16.0, hz=None, res=None, nits=None, poids=1.88, heures=None, hsrc=None,
         os="windows", classe="poly",
         forts=["OLED 16 pouces et 16 Go à prix étudiant dans ce relevé"],
         faibles=["Le prix cité est une offre étudiante, pas le tarif public", "Référence Ryzen 5 incomplète", "1,88 kg"],
         note="Relevé FranceMetrics, offre étudiante. Contrôler le prix public avant de comparer.",
         sources=["FranceMetrics oct. 2026"]),
    dict(id="yoga-pro-7-14", nom="Lenovo Yoga Pro 7 14", marque="Lenovo", prix=1699,
         cpu="Intel Core Ultra 9 285H", ram=32, ssd=1024, gpu="Intel Arc intégré", gpu_n=2, cpu_n=6,
         tech="OLED", diag=14.5, hz=120, res="3000 × 1876", nits=None, poids=1.54, heures=None, hsrc=None,
         os="windows", classe="ultra",
         forts=["Ultra 9, 32 Go, 1 To", "OLED 3K 120 Hz tactile", "Création sans carte dédiée"],
         faibles=["iGPU : l’export 3D lourd reste plus lent qu’une RTX", "1,54 kg"],
         note="Yoga Pro 7 14IAH10, tableau comparatif oct. 2026.",
         sources=["Comparateur pcmalin, oct. 2026"]),
    dict(id="aspire-go-15", nom="Acer Aspire Go 15", marque="Acer", prix=700,
         cpu="AMD Ryzen 5", ram=16, ssd=512, gpu="Radeon intégrée", gpu_n=0, cpu_n=3,
         tech=None, diag=15.0, hz=None, res=None, nits=None, poids=None, heures=None, hsrc=None,
         os="windows", classe="poly",
         forts=["16 Go / 512 Go vers 700 €"],
         faibles=["Fiche courte : dalle, poids et référence exacte du Ryzen 5 à lire en magasin"],
         note="699,99 €, relevé FranceMetrics. Ne pas confondre avec l’Aspire Lite.",
         sources=["FranceMetrics oct. 2026"]),

    # --- Modèles portés depuis le JSON (session précédente, absents du générateur) ---
    dict(id="asus-vivobook-15-x1504va", nom="ASUS Vivobook 15 X1504VA (BQ674W)", marque="ASUS", prix=800,
         cpu="Intel Core 7 150U", ram=16, ssd=512, gpu="Intel Graphics (intégrée)", gpu_n=0, cpu_n=3,
         tech="IPS", diag=15.6, hz=60, res="FHD", nits=250, poids=1.7, heures=None, hsrc=None,
         os="windows", classe="poly",
         cpu_detail="Intel Core 7 150U (10 cœurs, 12 threads, jusqu’à 5,4 GHz)",
         ram_detail="16 Go DDR4 3200", ssd_detail="512 Go SSD PCIe",
         ecran_detail="15,6\" FHD (1920 × 1080) IPS, 60 Hz, 250 nits, anti-reflets",
         autonomie_detail="batterie 42 Wh (autonomie non mesurée)", os_detail="Windows 11",
         prov_autonomie="non_documentee",
         prov_autonomie_detail="Batterie 42 Wh documentée par le constructeur ; aucune autonomie horaire sourcée.",
         fabricant_url="https://www.asus.com/uk/laptops/for-home/vivobook/asus-vivobook-15-x1504/techspec/",
         forts=["16 Go de RAM et SSD 512 Go à prix contenu", "Clavier complet avec pavé numérique", "Indice de réparabilité relevé à 9,3/10 (idealo)"],
         faibles=["Écran 60 Hz limité à 250 nits", "Pas de carte graphique dédiée", "Mémoire DDR4 (une partie soudée selon configuration)"],
         note="Config 16 Go / 512 Go relevée à 799,99 € (Fnac, 16 oct. 2026) ; variante ISCBQ5351W à 1 164,64 € sur idealo (sept. 2026).",
         sources=["Fnac (fiche produit, oct. 2026)", "idealo.fr (sept. 2026)", "ASUS (fiche technique)"]),
    dict(id="dell-inspiron-15-3535", nom="Dell Inspiron 15 3535", marque="Dell", prix=492,
         cpu="AMD Ryzen 5 7530U", ram=16, ssd=512, gpu="AMD Radeon Graphics (intégrée)", gpu_n=0, cpu_n=3,
         tech="IPS", diag=15.6, hz=120, res="FHD", nits=None, poids=1.63, heures=None, hsrc=None,
         os="windows", classe="poly",
         cpu_detail="AMD Ryzen 5 7530U (6 cœurs, 12 threads, jusqu’à 4,5 GHz)",
         ram_detail="16 Go DDR4 3200", ssd_detail="512 Go SSD NVMe",
         ecran_detail="15,6\" FHD (1920 × 1080) IPS, 120 Hz",
         autonomie_detail="batterie 41 Wh (autonomie non mesurée)", os_detail="Windows 11",
         prov_autonomie="non_documentee",
         prov_autonomie_detail="Batterie 41 Wh documentée ; aucune autonomie horaire sourcée pour cette configuration.",
         fabricant_url="https://www.dell.com/fr-fr/shop/ordinateurs-portables-dell/ordinateur-portable-inspiron-15/spd/inspiron-15-3535-laptop",
         forts=["Prix très contenu en 16 Go / 512 Go", "Écran 120 Hz", "Lecteur de carte SD"],
         faibles=["Wi-Fi 5 seulement", "Batterie 41 Wh modeste", "Pas de carte graphique dédiée"],
         note="Config 16 Go / 512 Go relevée à 491,99 € (PcComponentes, nov. 2025) ; base Dell dès 349 € ; variantes relevées entre 627 € et 814 € (123comparer, 2025-2026).",
         sources=["Dell France (fiche produit)", "idealo.fr (oct. 2026)", "PcComponentes (nov. 2025)"]),
    dict(id="hp-victus-15-fa3005nf", nom="HP Victus 15-fa3005nf", marque="HP", prix=1249,
         cpu="Intel Core 5 205H", ram=16, ssd=512, gpu="NVIDIA GeForce RTX 3050 6 Go (dédiée)", gpu_n=3, cpu_n=4,
         tech="IPS", diag=15.6, hz=144, res="FHD", nits=None, poids=None, heures=None, hsrc=None,
         os="windows", classe="gamer",
         cpu_detail="Intel Core 5 205H (8 cœurs, 12 threads, jusqu’à 4,8 GHz)",
         ram_detail="16 Go DDR4 3200", ssd_detail="512 Go SSD PCIe 4.0",
         ecran_detail="15,6\" FHD (1920 × 1080) IPS, 144 Hz, anti-reflets",
         os_detail="Windows 11",
         prov_autonomie="non_documentee",
         prov_autonomie_detail="Aucune autonomie sourcée par HP pour cette référence.",
         fabricant_url="https://www.hp.com/fr-fr/shop/products/laptops/victus-gaming-laptop-15-fa3005nf-e37v9ea-abf",
         forts=["Écran 144 Hz", "Carte graphique dédiée RTX 3050 6 Go", "Refroidissement pensé gaming"],
         faibles=["Prix élevé pour une RTX 3050", "Carte graphique datée pour les jeux lourds", "Poids et autonomie non documentés par HP"],
         note="1 249 € relevés sur la boutique HP France (oct. 2026) ; prix de lancement 1 599 € (juillet 2026, comparez-malin).",
         sources=["HP.com France (fiche produit, oct. 2026)", "comparez-malin.fr (oct. 2026)"]),
    dict(id="thinkpad-e14-gen-6-ultra5", nom="Lenovo ThinkPad E14 Gen 6", marque="Lenovo", prix=970,
         cpu="Intel Core Ultra 5 125U", ram=16, ssd=512, gpu="Intel Graphics (intégrée)", gpu_n=0, cpu_n=4,
         tech="IPS", diag=14.0, hz=60, res="WUXGA", nits=300, poids=1.44, heures=None, hsrc=None,
         os="windows", classe="poly",
         cpu_detail="Intel Core Ultra 5 125U",
         ram_detail="16 Go DDR5 5600 (extensible jusqu’à 64 Go)",
         ssd_detail="512 Go SSD PCIe 4.0 (+ emplacement libre)",
         ecran_detail="14\" WUXGA (1920 × 1200) IPS, 60 Hz, 300 nits",
         autonomie_detail="batterie 57 Wh (autonomie non mesurée)", os_detail="Windows 11 Pro",
         prov_autonomie="non_documentee",
         prov_autonomie_detail="Batterie 57 Wh documentée (fiche leDénicheur, variante 155H) ; aucune autonomie horaire sourcée.",
         fabricant_url="https://www.lenovo.com/fr/fr/p/laptops/thinkpad/thinkpade/lenovo-thinkpad-e14-gen-6-14-inch-intel/len101t0087",
         forts=["Châssis aluminium certifié MIL-STD-810H", "Clavier ThinkPad avec TrackPoint", "Windows 11 Pro, TPM 2.0, webcam IR", "Mémoire extensible jusqu’à 64 Go"],
         faibles=["Écran 60 Hz, colorimétrie limitée", "Pas de carte graphique dédiée", "Prix élevé face aux gammes grand public"],
         note="Config Core Ultra 5 / 16 Go / 512 Go relevée à 969,95 € (LDLC et Materiel.net, oct. 2026) ; ZDNet relève 1 439 € pour la variante Core Ultra 7 155U.",
         sources=["LDLC (fiche produit, oct. 2026)", "Materiel.net (oct. 2026)", "ZDNet France (oct. 2026)"]),

    # --- Étoffage du catalogue : 4 modèles par tranche de prix (relevés oct. 2026) ---
    dict(id="lenovo-ideapad-slim-3x", nom="Lenovo IdeaPad Slim 3x", marque="Lenovo", prix=550,
         cpu="Snapdragon X (X1-26-100)", ram=16, ssd=512, gpu="Qualcomm Adreno (intégrée)", gpu_n=2, cpu_n=3,
         tech="IPS", diag=15.3, hz=60, res="1920 × 1200", nits=300, poids=1.6, heures=18.5, hsrc="annoncee",
         os="windows", classe="arm",
         forts=["Prix très contenu en 16 Go / 512 Go", "Écran 15,3\" IPS 300 nits anti-reflets", "Batterie 60 Wh, 18,5 h annoncées", "Châssis MIL-STD 810H"],
         faibles=["Processeur ARM : vérifiez la compatibilité de vos logiciels", "Un pack 8 Go / 512 Go existe au même prix : lisez la fiche avant de commander", "60 Hz seulement", "Chargeur non fourni sur certaines offres Boulanger"],
         note="IdeaPad Slim 3x 15Q8X10 : 549,99 € (Boulanger, tableau de prix du test Les Numériques, config 16 Go / 512 Go, réf. 83N3006QFR ; même prix vérifié le 19 oct. sur leDénicheur). Windows 11 Home Arm64, dalle WUXGA 300 nits 60 Hz, 60 Wh (fiches constructeur et marchandes).",
         sources=["Les Numériques (test et tableau de prix, oct. 2026) — https://www.lesnumeriques.com/ordinateur-portable/lenovo-ideapad-slim-3x-gen-10-p76656/test.html", "Fnac (fiche 16 Go / 512 Go) — https://www.fnac.com/PC-portable-Lenovo-IdeaPad-Slim-3-15Q8X10-15-3-Copilot-Qualcomm-Snapdragon-X-16-Go-RAM-512-Go-SSD-Gris-luna/a21968435/w-4", "leDénicheur 2026-10-19 — https://ledenicheur.fr/s/lenovo-ideapad-slim-3-15q8x10/", "guide < 800 € — https://www.lesnumeriques.com/ordinateur-portable/guide-achat-quels-sont-les-meilleurs-pc-portables-a-moins-de-800-euros-g151.html"]),
    dict(id="hp-15-fd0005sf", nom="HP 15-fd0005sf", marque="HP", prix=679,
         cpu="Intel Core i7 (génération non précisée)", ram=16, ssd=512, gpu="Intel Graphics (intégrée)", gpu_n=0, cpu_n=3,
         tech=None, diag=15.6, hz=None, res=None, nits=None, poids=None, heures=None, hsrc=None,
         os="inconnu", classe="poly",
         forts=["Core i7 et 16 Go sous 700 €", "512 Go de SSD"],
         faibles=["Génération du processeur non précisée dans le relevé", "Dalle non précisée", "Pas de GPU dédié"],
         note="HP 15-fd0005sf : 679 € (Amazon, guide La Voix du Nord, oct. 2026) — i7, 16 Go, 512 Go.",
         sources=["La Voix du Nord (comparatif < 700 €, oct. 2026) — https://www.lavoixdunord.fr/1693241/article/2026-04-10/quel-pc-portable-choisir-moins-de-700-eu-comparatif-2026"]),
    dict(id="hp-250r-g9", nom="HP 250R G9", marque="HP", prix=749,
         cpu="Intel Core 5 120U", ram=16, ssd=512, gpu="Intel Graphics (intégrée)", gpu_n=0, cpu_n=3,
         tech="TN", diag=15.6, hz=60, res="1920 × 1080", nits=None, poids=None, heures=None, hsrc=None,
         os="inconnu", classe="poly",
         forts=["Core 5 120U récent", "16 Go / 512 Go complets"],
         faibles=["Dalle TN basique (angles et couleurs limités)", "Poids non publié"],
         note="HP 250R G9 (C38K9AT) : 749 € (Materiel.net, relevé 19 oct. 2026) — Core 5 120U, 16 Go, 512 Go, 15,6\" TN.",
         sources=["Materiel.net (relevé 19 oct. 2026) — https://www.materiel.net/pc-portable/l409/+fp-h800/"]),
    dict(id="acer-aspire-14-ai", nom="Acer Aspire 14 AI", marque="Acer", prix=768,
         cpu="Intel Core Ultra 5 226V", ram=16, ssd=None, gpu="Intel Arc 130V (intégrée)", gpu_n=2, cpu_n=4,
         tech=None, diag=14, hz=None, res=None, nits=None, poids=None, heures=None, hsrc=None,
         os="inconnu", classe="poly",
         forts=["Core Ultra 5 226V avec NPU", "Note Clubic 8/10", "Arc 130V : iGPU au-dessus de la moyenne"],
         faibles=["Stockage non détaillé dans le relevé", "Dalle non précisée"],
         note="Acer Aspire 14 AI : 767,85 €, noté 8/10 (Clubic, oct. 2026) — Core Ultra 5, 16 Go, Intel Arc. Configuration exacte à vérifier sur la fiche marchand.",
         sources=["Clubic (comparatif, oct. 2026) — https://www.clubic.com/pc-portable/comparatif/moins-1000-euros"]),
    dict(id="samsung-galaxy-book-5-pro", nom="Samsung Galaxy Book 5 Pro", marque="Samsung", prix=900,
         cpu="Intel Core Ultra 7 256V", ram=16, ssd=None, gpu="Intel Arc (intégrée)", gpu_n=2, cpu_n=5,
         tech=None, diag=None, hz=None, res=None, nits=None, poids=None, heures=None, hsrc=None,
         os="inconnu", classe="poly",
         forts=["Core Ultra 7 256V : puce récente et sobre", "Châssis fin Samsung"],
         faibles=["Stockage non détaillé dans le relevé", "Écran non détaillé dans le relevé"],
         note="Samsung Galaxy Book 5 Pro : 899,99 € (Clubic, oct. 2026) — Core Ultra 7 256V, 16 Go, Intel Arc.",
         sources=["Clubic oct. 2026"]),
    dict(id="hp-pavilion-plus-14-ew1001nf", nom="HP Pavilion Plus 14-ew1001nf", marque="HP", prix=999,
         cpu="Intel Core Ultra 5 (série non précisée)", ram=16, ssd=None, gpu="Intel Arc (intégrée)", gpu_n=2, cpu_n=4,
         tech=None, diag=14, hz=None, res=None, nits=None, poids=None, heures=None, hsrc=None,
         os="inconnu", classe="poly",
         forts=["PC fin et polyvalent sous 1 000 €", "16 Go de RAM", "iGPU Intel Arc correct pour l’usage courant"],
         faibles=["Stockage non détaillé dans le relevé", "Série du processeur non précisée", "Écran non détaillé dans le relevé"],
         note="HP Pavilion Plus 14-ew1001nf : 999 € (Clubic, oct. 2026) — Core Ultra 5, 16 Go, Intel Arc Graphics. Configuration exacte à vérifier sur la fiche marchand.",
         sources=["Clubic oct. 2026 — https://www.clubic.com/pc-portable/comparatif/moins-1000-euros"]),
    dict(id="medion-erazer-crawler-e40", nom="Medion Erazer Crawler E40", marque="Medion", prix=1000,
         cpu="Intel Core i5-13500H", ram=16, ssd=None, gpu="NVIDIA GeForce RTX 4050", gpu_n=3, cpu_n=4,
         tech=None, diag=None, hz=None, res=None, nits=None, poids=None, heures=None, hsrc=None,
         os="inconnu", classe="gamer",
         forts=["GPU dédié RTX 4050 sous 1 000 €", "Refroidissement pensé gaming"],
         faibles=["RTX 4050 : génération précédente, juste pour les jeux lourds", "Stockage non détaillé dans le relevé", "Écran non détaillé dans le relevé"],
         note="Medion Erazer Crawler E40 : 999,99 € (Clubic, oct. 2026) — i5-13500H, 16 Go, RTX 4050.",
         sources=["Clubic oct. 2026"]),
    dict(id="honor-magicbook-16", nom="Honor MagicBook 16 (2026)", marque="Honor", prix=1000,
         cpu="Intel Core Ultra 5 325", ram=16, ssd=None, gpu="Intel Graphics (intégrée)", gpu_n=0, cpu_n=4,
         tech=None, diag=16, hz=None, res=None, nits=None, poids=None, heures=None, hsrc=None,
         os="inconnu", classe="poly",
         forts=["PC familial 16 Go sous 1 000 €", "NPU pour les fonctions IA"],
         faibles=["Stockage non détaillé dans le relevé", "Pas de GPU dédié", "Écran non détaillé dans le relevé"],
         note="Honor MagicBook 16 (2026) : 999,90 € (Clubic, oct. 2026) — Intel Core Ultra 5, 16 Go, Intel Graphics.",
         sources=["Clubic oct. 2026"]),
    dict(id="gigabyte-gaming-a16-i7", nom="Gigabyte Gaming A16 (i7-13620H)", marque="Gigabyte", prix=1400,
         cpu="Intel Core i7-13620H", ram=16, ssd=1024, gpu="NVIDIA GeForce RTX 5070", gpu_n=5, cpu_n=4,
         tech=None, diag=16, hz=165, res="1920 × 1200", nits=None, poids=None, heures=None, hsrc=None,
         os="windows", classe="gamer",
         forts=["RTX 5070 et 1 To vers 1 400 €", "Écran 165 Hz"],
         faibles=["16 Go seulement", "Poids non publié", "TGP non publié"],
         note="Gigabyte Gaming A16 CWHI3FR894SH : 1 399,90 € (Grosbill, relevé oct. 2026) — i7-13620H, 16 Go, 1 To, RTX 5070, 16\" WUXGA 165 Hz, Windows 11.",
         sources=["Grosbill oct. 2026", "Ratake oct. 2026"]),
    dict(id="gigabyte-aero-x16-5060", nom="Gigabyte Aero X16 (RTX 5060)", marque="Gigabyte", prix=1450,
         cpu="AMD Ryzen 7 AI 350", ram=32, ssd=1024, gpu="NVIDIA GeForce RTX 5060", gpu_n=4, cpu_n=4,
         tech=None, diag=16, hz=None, res=None, nits=None, poids=None, heures=None, hsrc=None,
         os="inconnu", classe="gamer",
         forts=["32 Go / 1 To", "RTX 5060"],
         faibles=["Écran non détaillé dans le relevé", "OS non précisé dans le relevé"],
         note="Gigabyte Aero X16 1VH93FRC64AH : 1 449,90 € (leDénicheur, oct. 2026) — Ryzen 7 AI 350, 32 Go, 1 To, RTX 5060.",
         sources=["leDénicheur (fiche produit, oct. 2026) — https://ledenicheur.fr/product.php?p=16148598"]),
    dict(id="gigabyte-gaming-a16-ultra9", nom="Gigabyte Gaming A16 (Core Ultra 9)", marque="Gigabyte", prix=1499,
         cpu="Intel Core Ultra 9 185H", ram=16, ssd=1024, gpu="NVIDIA GeForce RTX 5070", gpu_n=5, cpu_n=5,
         tech=None, diag=16, hz=165, res="2560 × 1600", nits=None, poids=None, heures=None, hsrc=None,
         os="inconnu", classe="gamer",
         forts=["Écran QHD+ 165 Hz", "Core Ultra 9 185H"],
         faibles=["16 Go seulement", "OS non précisé dans le relevé"],
         note="Gigabyte Gaming A16 EWHS3FRC94SH : 1 499 € (Rue du Commerce via Ratake, oct. 2026) — Core Ultra 9 185H, 16 Go, 1 To, RTX 5070, 16\" QHD+ 165 Hz.",
         sources=["Ratake (comparatif gaming < 1 500 €) — https://www.ratake.com/fr/pc-portable/top/meilleurs-gaming-moins-1500-euros", "Grosbill (liste RTX 5070) — https://www.grosbill.com/pc-portable-40/rtx-5070"]),
    dict(id="gigabyte-gaming-a16-ryzen", nom="Gigabyte Gaming A16 (Ryzen 7 260)", marque="Gigabyte", prix=1699,
         cpu="AMD Ryzen 7 260", ram=32, ssd=1024, gpu="NVIDIA GeForce RTX 5070", gpu_n=5, cpu_n=4,
         tech=None, diag=16, hz=165, res="1920 × 1200", nits=None, poids=None, heures=None, hsrc=None,
         os="inconnu", classe="gamer",
         forts=["32 Go et RTX 5070", "Promo relevée de 2 399 € à 1 699 €"],
         faibles=["Écran WUXGA, pas QHD+", "Poids non publié"],
         note="Gigabyte Gaming A16 3WHK3FR864SH : 1 699 € (Darty via frandroid, relevé 19 oct. 2026 ; 1 699,99 € sur idealo) — Ryzen 7 260, 32 Go, 1 To, RTX 5070, 16\" WUXGA 165 Hz.",
         sources=["frandroid (bon plan Darty, relevé 19 oct. 2026) — https://www.frandroid.com/bons-plans/3263245_ce-puissant-pc-portable-gaming-avec-rtx-5070-et-32-go-de-ram-coute-700-e-de-moins-chez-darty", "Grosbill (liste Gigabyte) — https://www.grosbill.com/pc-portable-40/gigabyte?fv[84][]=8733"]),
    dict(id="msi-vector-16hx-ai", nom="MSI Vector 16 HX AI", marque="MSI", prix=2150,
         cpu="Intel Core Ultra 7 255HX", ram=16, ssd=1024, gpu="NVIDIA GeForce RTX 5070 Ti", gpu_n=5, cpu_n=5,
         tech=None, diag=16, hz=None, res=None, nits=None, poids=None, heures=None, hsrc=None,
         os="inconnu", classe="gamer",
         forts=["RTX 5070 Ti vers 2 150 €", "CPU HX orienté performance"],
         faibles=["16 Go seulement", "Écran non détaillé dans le relevé", "Poids non publié"],
         note="MSI Vector 16 HX AI A2XWHG-087FR : 2 149,95 € (leDénicheur, oct. 2026) — Core Ultra 7 255HX, 16 Go, 1 To, RTX 5070 Ti.",
         sources=["leDénicheur (recherche RTX 5070 Ti, oct. 2026) — https://ledenicheur.fr/s/pc-rtx-5070/"]),
    dict(id="asus-rog-zephyrus-g16", nom="Asus ROG Zephyrus G16", marque="ASUS", prix=2400,
         cpu="Intel Core Ultra 9 285HS", ram=32, ssd=1024, gpu="NVIDIA GeForce RTX 5070", gpu_n=5, cpu_n=6,
         tech="OLED", diag=16, hz=240, res="2560 × 1600", nits=None, poids=None, heures=None, hsrc=None,
         os="inconnu", classe="gamer",
         forts=["OLED 2,5K 240 Hz", "32 Go", "Format fin et transportable pour un PC gamer"],
         faibles=["Prix", "Prix indicatif approximatif (~2 400 €), à confirmer"],
         note="Asus ROG Zephyrus G16 : environ 2 400 € (Futura, oct. 2026) — RTX 5070, Core Ultra 9 285HS, 32 Go, OLED 2,5K 240 Hz. Prix à confirmer sur les fiches.",
         sources=["Futura (guide gaming, oct. 2026) — https://www.futura-sciences.com/conso/guides-achat/test-pc-portable-meilleur-pc-portable-jouer-2026-1452/"]),
    dict(id="asus-rog-strix-g18", nom="Asus ROG Strix G18 G815LP", marque="ASUS", prix=2500,
         cpu="Intel Core Ultra 9 275HX", ram=32, ssd=1024, gpu="NVIDIA GeForce RTX 5070", gpu_n=5, cpu_n=6,
         tech=None, diag=18, hz=240, res="2560 × 1600", nits=None, poids=None, heures=None, hsrc=None,
         os="inconnu", classe="gamer",
         forts=["18\" QHD 240 Hz", "32 Go / 1 To", "Refroidissement ROG"],
         faibles=["Peu portable", "Prix"],
         note="Asus ROG Strix G18 G815LP : 2 499,99 € (Amazon via Tom’s Hardware, oct. 2026) — Core Ultra 9 275HX, 32 Go, 1 To, RTX 5070, 18\" QHD 240 Hz.",
         sources=["Tom’s Hardware (guide gaming, oct. 2026) — https://www.tomshardware.fr/guide-achat-meilleurs-portables-gaming/"]),
    dict(id="apple-macbook-pro-14-m5-pro", nom="Apple MacBook Pro 14 (M5 Pro)", marque="Apple", prix=2699,
         cpu="Apple M5 Pro", ram=24, ssd=1024, gpu="GPU M5 Pro (16 cœurs, intégré)", gpu_n=2, cpu_n=7,
         tech="Mini-LED", diag=14.2, hz=120, res=None, nits=None, poids=1.60, heures=22, hsrc="annoncee",
         os="macos", classe="arm",
         forts=["22 h annoncées", "Écran mini-LED 120 Hz", "M5 Pro : 15 cœurs CPU, 16 cœurs GPU"],
         faibles=["GPU intégré (pas de dédiée NVIDIA)", "Prix"],
         note="Apple MacBook Pro 14 (M5 Pro) : 2 699 € (Boulanger via FranceMetrics, relevé 20 oct. 2026) — M5 Pro, 24 Go, 1 To, 14,2\" mini-LED 120 Hz, 1,60 kg, 72,4 Wh.",
         sources=["FranceMetrics (classement vérifié le 20 oct. 2026) — https://www.francemetrics.fr/meilleurs/pc-portables-2026"]),
]


# Références avec chargeur confirmé sur LDLC le 23 octobre 2026.
MODELS.extend([{'id': 'hp-15-fd0154nf',
  'nom': 'HP Laptop 15-fd0154nf',
  'marque': 'HP',
  'prix': 699.95,
  'cpu': 'Intel Core i3-1315U',
  'ram': 16,
  'ssd': 512,
  'gpu': 'Intel UHD Graphics',
  'gpu_n': 0,
  'cpu_n': 2,
  'tech': 'IPS',
  'diag': 15.6,
  'hz': 60,
  'res': '1920 × 1080',
  'nits': 250,
  'poids': None,
  'heures': None,
  'hsrc': None,
  'os': 'windows',
  'os_detail': 'Windows 11 Famille',
  'classe': 'poly',
  'forts': ['Chargeur inclus dans cette référence', '16 Go de RAM et 512 Go de SSD'],
  'faibles': ['Pas de carte graphique dédiée pour les jeux exigeants ou la 3D.',
              'Autonomie réelle non mesurée dans ce relevé.',
              'Écran limité à 60 Hz.'],
  'note': 'LDLC, relevé du 23 octobre 2026 : 699,95 € TTC hors livraison pour cette référence exacte. '
          'Chargeur inclus confirmé dans la rubrique Alimentation. Prix et disponibilité variables.',
  'sources': ['https://www.ldlc.com/fiche/PB00717214.html'],
  'date_verification': '2026-10-23',
  'marchand_url': 'https://www.ldlc.com/fiche/PB00717214.html',
  'chargeur_inclus': True,
  'batterie_wh': 41},
 {'id': 'msi-modern-13-f1mog-090fr',
  'nom': 'MSI Modern 13 F1MOG-090FR',
  'marque': 'MSI',
  'prix': 799.95,
  'cpu': 'Intel Core 5 120U',
  'ram': 16,
  'ssd': 512,
  'gpu': 'Intel Iris Xe Graphics',
  'gpu_n': 2,
  'cpu_n': 3,
  'tech': 'IPS',
  'diag': 13.3,
  'hz': 60,
  'res': '1920 × 1080',
  'nits': 400,
  'poids': 1.19,
  'heures': None,
  'hsrc': None,
  'os': 'windows',
  'os_detail': 'Windows 11 Famille',
  'classe': 'ultra',
  'forts': ['Chargeur inclus dans cette référence', '16 Go de RAM et 512 Go de SSD'],
  'faibles': ['Pas de carte graphique dédiée pour les jeux exigeants ou la 3D.',
              'Autonomie réelle non mesurée dans ce relevé.',
              'Écran limité à 60 Hz.'],
  'note': 'LDLC, relevé du 23 octobre 2026 : 799,95 € TTC hors livraison pour cette référence exacte. '
          'Chargeur inclus confirmé dans la rubrique Alimentation. Prix et disponibilité variables.',
  'sources': ['https://www.ldlc.com/fiche/PB00747913.html'],
  'date_verification': '2026-10-23',
  'marchand_url': 'https://www.ldlc.com/fiche/PB00747913.html',
  'chargeur_inclus': True,
  'batterie_wh': 46.8},
 {'id': 'samsung-galaxy-book4-np750xgj-kg4fr',
  'nom': 'Samsung Galaxy Book4 NP750XGJ-KG4FR',
  'marque': 'Samsung',
  'prix': 799.95,
  'cpu': 'Intel Core i5-1335U',
  'ram': 16,
  'ssd': 512,
  'gpu': 'Intel UHD Graphics',
  'gpu_n': 0,
  'cpu_n': 3,
  'tech': None,
  'diag': 15.6,
  'hz': 60,
  'res': '1920 × 1080',
  'nits': 300,
  'poids': None,
  'heures': None,
  'hsrc': None,
  'os': 'windows',
  'os_detail': 'Windows 11 Famille',
  'classe': 'poly',
  'forts': ['Chargeur inclus dans cette référence', '16 Go de RAM et 512 Go de SSD'],
  'faibles': ['Pas de carte graphique dédiée pour les jeux exigeants ou la 3D.',
              'Autonomie réelle non mesurée dans ce relevé.',
              'Écran limité à 60 Hz.'],
  'note': 'LDLC, relevé du 23 octobre 2026 : 799,95 € TTC hors livraison pour cette référence exacte. '
          'Chargeur inclus confirmé dans la rubrique Alimentation. Prix et disponibilité variables.',
  'sources': ['https://www.ldlc.com/fiche/PB00684317.html'],
  'date_verification': '2026-10-23',
  'marchand_url': 'https://www.ldlc.com/fiche/PB00684317.html',
  'chargeur_inclus': True,
  'batterie_wh': 54},
 {'id': 'msi-modern-14-c7m-428fr',
  'nom': 'MSI Modern 14 C7M-428FR',
  'marque': 'MSI',
  'prix': 849.95,
  'cpu': 'AMD Ryzen 7 7730U',
  'ram': 16,
  'ssd': 512,
  'gpu': 'AMD Radeon Graphics',
  'gpu_n': 0,
  'cpu_n': 4,
  'tech': 'IPS',
  'diag': 14,
  'hz': None,
  'res': '1920 × 1080',
  'nits': None,
  'poids': None,
  'heures': None,
  'hsrc': None,
  'os': 'windows',
  'os_detail': 'Windows 11 Famille',
  'classe': 'ultra',
  'forts': ['Chargeur inclus dans cette référence', '16 Go de RAM et 512 Go de SSD'],
  'faibles': ['Pas de carte graphique dédiée pour les jeux exigeants ou la 3D.',
              'Autonomie réelle non mesurée dans ce relevé.'],
  'note': 'LDLC, relevé du 23 octobre 2026 : 849,95 € TTC hors livraison pour cette référence exacte. '
          'Chargeur inclus confirmé dans la rubrique Alimentation. Prix et disponibilité variables.',
  'sources': ['https://www.ldlc.com/fiche/PB00725344.html'],
  'date_verification': '2026-10-23',
  'marchand_url': 'https://www.ldlc.com/fiche/PB00725344.html',
  'chargeur_inclus': True,
  'batterie_wh': None},
 {'id': 'hp-15-fd1019nf',
  'nom': 'HP Laptop 15-fd1019nf',
  'marque': 'HP',
  'prix': 849.95,
  'cpu': 'Intel Core Ultra 5 125H',
  'ram': 32,
  'ssd': 512,
  'gpu': 'Intel Arc Graphics',
  'gpu_n': 2,
  'cpu_n': 4,
  'tech': 'IPS',
  'diag': 15.6,
  'hz': 60,
  'res': '1920 × 1080',
  'nits': 300,
  'poids': None,
  'heures': None,
  'hsrc': None,
  'os': 'windows',
  'os_detail': 'Windows 11 Famille',
  'classe': 'poly',
  'forts': ['Chargeur inclus dans cette référence', '32 Go de RAM et 512 Go de SSD'],
  'faibles': ['Pas de carte graphique dédiée pour les jeux exigeants ou la 3D.',
              'Autonomie réelle non mesurée dans ce relevé.',
              'Écran limité à 60 Hz.'],
  'note': 'LDLC, relevé du 23 octobre 2026 : 849,95 € TTC hors livraison pour cette référence exacte. '
          'Chargeur inclus confirmé dans la rubrique Alimentation. Prix et disponibilité variables.',
  'sources': ['https://www.ldlc.com/fiche/PB00711577.html'],
  'date_verification': '2026-10-23',
  'marchand_url': 'https://www.ldlc.com/fiche/PB00711577.html',
  'chargeur_inclus': True,
  'batterie_wh': 41},
 {'id': 'asus-expertbook-b1-b1503cva-s77270x',
  'nom': 'ASUS ExpertBook B1 B1503CVA-S77270X',
  'marque': 'ASUS',
  'prix': 999.95,
  'cpu': 'Intel Core 5 210H',
  'ram': 16,
  'ssd': 512,
  'gpu': 'Intel Graphics',
  'gpu_n': 0,
  'cpu_n': 4,
  'tech': 'IPS',
  'diag': 15.6,
  'hz': 60,
  'res': '1920 × 1080',
  'nits': 300,
  'poids': None,
  'heures': None,
  'hsrc': None,
  'os': 'windows',
  'os_detail': 'Windows 11 Professionnel',
  'classe': 'poly',
  'forts': ['Chargeur inclus dans cette référence', '16 Go de RAM et 512 Go de SSD'],
  'faibles': ['Pas de carte graphique dédiée pour les jeux exigeants ou la 3D.',
              'Autonomie réelle non mesurée dans ce relevé.',
              'Écran limité à 60 Hz.'],
  'note': 'LDLC, relevé du 23 octobre 2026 : 999,95 € TTC hors livraison pour cette référence exacte. '
          'Chargeur inclus confirmé dans la rubrique Alimentation. Prix et disponibilité variables.',
  'sources': ['https://www.ldlc.com/fiche/PB00726216.html'],
  'date_verification': '2026-10-23',
  'marchand_url': 'https://www.ldlc.com/fiche/PB00726216.html',
  'chargeur_inclus': True,
  'batterie_wh': 50},
 {'id': 'lenovo-thinkbook-16-g8-21sk00eefr',
  'nom': 'Lenovo ThinkBook 16 G8 IAL 21SK00EEFR',
  'marque': 'Lenovo',
  'prix': 1099.95,
  'cpu': 'Intel Core Ultra 5 135H',
  'ram': 16,
  'ssd': 512,
  'gpu': 'Intel Arc Graphics',
  'gpu_n': 2,
  'cpu_n': 4,
  'tech': 'IPS',
  'diag': 16,
  'hz': 60,
  'res': '1920 × 1200',
  'nits': 300,
  'poids': None,
  'heures': None,
  'hsrc': None,
  'os': 'windows',
  'os_detail': 'Windows 11 Professionnel',
  'classe': 'poly',
  'forts': ['Chargeur inclus dans cette référence', '16 Go de RAM et 512 Go de SSD'],
  'faibles': ['Pas de carte graphique dédiée pour les jeux exigeants ou la 3D.',
              'Autonomie réelle non mesurée dans ce relevé.',
              'Écran limité à 60 Hz.'],
  'note': 'LDLC, relevé du 23 octobre 2026 : 1099,95 € TTC hors livraison pour cette référence exacte. '
          'Chargeur inclus confirmé dans la rubrique Alimentation. Prix et disponibilité variables.',
  'sources': ['https://www.ldlc.com/fiche/PB00749591.html'],
  'date_verification': '2026-10-23',
  'marchand_url': 'https://www.ldlc.com/fiche/PB00749591.html',
  'chargeur_inclus': True,
  'batterie_wh': 45},
 {'id': 'acer-aspire-go-16-ag16-71p-91zt',
  'nom': 'Acer Aspire Go 16 AG16-71P-91ZT',
  'marque': 'Acer',
  'prix': 1199.95,
  'cpu': 'Intel Core i9-13900H',
  'ram': 32,
  'ssd': 1024,
  'gpu': 'Intel Iris Xe Graphics',
  'gpu_n': 2,
  'cpu_n': 5,
  'tech': 'IPS',
  'diag': 16,
  'hz': 60,
  'res': '1920 × 1200',
  'nits': 300,
  'poids': None,
  'heures': 6,
  'hsrc': 'annoncee',
  'os': 'windows',
  'os_detail': 'Windows 11 Famille',
  'classe': 'poly',
  'forts': ['Chargeur inclus dans cette référence', '32 Go de RAM et 1 To de SSD'],
  'faibles': ['Pas de carte graphique dédiée pour les jeux exigeants ou la 3D.',
              'Autonomie réelle non mesurée dans ce relevé.',
              'Écran limité à 60 Hz.'],
  'note': 'LDLC, relevé du 23 octobre 2026 : 1199,95 € TTC hors livraison pour cette référence exacte. '
          'Chargeur inclus confirmé dans la rubrique Alimentation. Prix et disponibilité variables.',
  'sources': ['https://www.ldlc.com/fiche/PB00724970.html'],
  'date_verification': '2026-10-23',
  'marchand_url': 'https://www.ldlc.com/fiche/PB00724970.html',
  'chargeur_inclus': True,
  'batterie_wh': 53},
 {'id': 'thinkpad-e14-gen7-21t00072fr',
  'nom': 'Lenovo ThinkPad E14 Gen 7 21T00072FR',
  'marque': 'Lenovo',
  'prix': 1299.95,
  'cpu': 'AMD Ryzen 5 230',
  'ram': 16,
  'ssd': 512,
  'gpu': 'AMD Radeon 760M',
  'gpu_n': 2,
  'cpu_n': 4,
  'tech': 'IPS',
  'diag': 14,
  'hz': 60,
  'res': '1920 × 1200',
  'nits': 300,
  'poids': None,
  'heures': None,
  'hsrc': None,
  'os': 'windows',
  'os_detail': 'Windows 11 Professionnel',
  'classe': 'ultra',
  'forts': ['Chargeur inclus dans cette référence', '16 Go de RAM et 512 Go de SSD'],
  'faibles': ['Pas de carte graphique dédiée pour les jeux exigeants ou la 3D.',
              'Autonomie réelle non mesurée dans ce relevé.',
              'Écran limité à 60 Hz.'],
  'note': 'LDLC, relevé du 23 octobre 2026 : 1299,95 € TTC hors livraison pour cette référence exacte. '
          'Chargeur inclus confirmé dans la rubrique Alimentation. Prix et disponibilité variables.',
  'sources': ['https://www.ldlc.com/fiche/PB00749632.html'],
  'date_verification': '2026-10-23',
  'marchand_url': 'https://www.ldlc.com/fiche/PB00749632.html',
  'chargeur_inclus': True,
  'batterie_wh': 64},
 {'id': 'asus-v16-v3607nmq-tk036',
  'nom': 'ASUS V16 V3607NMQ-TK036',
  'marque': 'ASUS',
  'prix': 1299.95,
  'cpu': 'AMD Ryzen 7 170',
  'ram': 16,
  'ssd': 512,
  'gpu': 'NVIDIA GeForce RTX 5060 8 Go',
  'gpu_n': 4,
  'cpu_n': 4,
  'tech': None,
  'diag': 16,
  'hz': 144,
  'res': '1920 × 1200',
  'nits': 300,
  'poids': None,
  'heures': None,
  'hsrc': None,
  'os': 'sans',
  'os_detail': 'Sans système d’exploitation (Windows non fourni)',
  'classe': 'gamer',
  'forts': ['Chargeur inclus dans cette référence', '16 Go de RAM et 512 Go de SSD'],
  'faibles': ['Sans système d’exploitation : installation nécessaire ; licence Windows à prévoir si '
              'souhaitée.',
              'Autonomie réelle non mesurée dans ce relevé.'],
  'note': 'LDLC, relevé du 23 octobre 2026 : 1299,95 € TTC hors livraison pour cette référence exacte. '
          'Chargeur inclus confirmé dans la rubrique Alimentation. Prix et disponibilité variables. Sans OS '
          ': le prix ne comprend pas de licence Windows.',
  'sources': ['https://www.ldlc.com/fiche/PB00754899.html'],
  'date_verification': '2026-10-23',
  'marchand_url': 'https://www.ldlc.com/fiche/PB00754899.html',
  'chargeur_inclus': True,
  'batterie_wh': 63},
 {'id': 'asus-rog-strix-g16-g614fr-ts292w',
  'nom': 'ASUS ROG Strix G16 G614FR-TS292W',
  'marque': 'ASUS',
  'prix': 2499.95,
  'cpu': 'AMD Ryzen 9 9955HX',
  'ram': 16,
  'ssd': 1024,
  'gpu': 'NVIDIA GeForce RTX 5070 Ti 12 Go',
  'gpu_n': 5,
  'cpu_n': 7,
  'tech': None,
  'diag': 16,
  'hz': 300,
  'res': '2560 × 1600',
  'nits': None,
  'poids': None,
  'heures': None,
  'hsrc': None,
  'os': 'windows',
  'os_detail': 'Windows 11 Famille',
  'classe': 'gamer',
  'forts': ['Chargeur inclus dans cette référence', '16 Go de RAM et 1 To de SSD'],
  'faibles': ['16 Go : prévoir davantage pour les gros projets.',
              'Autonomie réelle non mesurée dans ce relevé.'],
  'note': 'LDLC, relevé du 23 octobre 2026 : 2499,95 € TTC hors livraison pour cette référence exacte. '
          'Chargeur inclus confirmé dans la rubrique Alimentation. Prix et disponibilité variables.',
  'sources': ['https://www.ldlc.com/fiche/PB00754912.html'],
  'date_verification': '2026-10-23',
  'marchand_url': 'https://www.ldlc.com/fiche/PB00754912.html',
  'chargeur_inclus': True,
  'batterie_wh': 90}])

WEIGHTS = {
    "etudiant": {"prix": 1.15, "autonomie": 0.8, "mobilite": 0.6, "memoire": 0.55, "performance": 0.35, "ecran": 0.25, "gaming": 0.05},
    "professionnel": {"performance": 0.9, "autonomie": 0.8, "memoire": 0.7, "ecran": 0.65, "mobilite": 0.55, "prix": 0.35, "gaming": 0.1},
    "gamer": {"gaming": 1.7, "performance": 0.55, "ecran": 0.35, "memoire": 0.3, "prix": 0.2, "autonomie": 0.1, "mobilite": 0.05},
    "createur": {"ecran": 1.0, "memoire": 0.9, "performance": 0.8, "gaming": 0.45, "autonomie": 0.35, "mobilite": 0.3, "prix": 0.2},
}


def cap(n):
    return max(1, min(9, int(round(n))))


def prix_score(prix):
    if prix <= 400:
        return 9
    if prix <= 600:
        return 8
    if prix <= 850:
        return 7
    if prix <= 1100:
        return 6
    if prix <= 1500:
        return 5
    if prix <= 2000:
        return 4
    if prix <= 3200:
        return 3
    return 2


def ecran_score(m):
    tech = m["tech"] or ""
    hz = m["hz"] or 0
    if tech == "Mini-LED":
        return 9
    if tech == "OLED" and (hz >= 120 or (m["res"] and "2880" in m["res"] or m["res"] == "3K")):
        return 9
    if tech == "OLED":
        return 8
    if tech == "IPS" and hz >= 144:
        return 7
    if tech == "IPS" and m["diag"] and m["diag"] <= 14:
        return 6
    if tech == "IPS":
        return 5
    return 5


def mobilite_score(poids):
    if poids is None:
        return None
    if poids <= 1.25:
        return 9
    if poids <= 1.4:
        return 8
    if poids <= 1.6:
        return 7
    if poids <= 1.85:
        return 6
    if poids <= 2.15:
        return 5
    if poids <= 2.5:
        return 4
    return 3


def autonomie_score(m):
    h = m["heures"]
    if h:
        if h < 8:
            return 4
        if h < 12:
            return 6
        if h < 16:
            return 7
        if h < 20:
            return 8
        return 9
    return {"arm": 8, "ultra": 7, "poly": 6, "gamer": 4}[m["classe"]]


def memoire_score(ram, ssd):
    base = 3 if ram <= 8 else 6 if ram <= 16 else 7 if ram <= 24 else 8 if ram < 48 else 9
    if ssd is None:
        pass  # stockage non documenté : ni bonus ni malus, la fiche reste honnête
    elif ssd <= 256:
        base -= 1
    elif ssd >= 2048:
        base += 1
    elif ssd >= 1024:
        base += 0.5
    return cap(base)


def perf_score(cpu_n):
    return {1: 3, 2: 4, 3: 5, 4: 6, 5: 7, 6: 8, 7: 9}[cpu_n]


def game_score(gpu_n, cpu_n):
    base = {0: 3, 2: 5, 3: 6, 4: 7, 5: 8, 7: 9}[gpu_n]
    if gpu_n >= 4:
        return base
    return cap(base * 0.8 + perf_score(cpu_n) * 0.2)


def profile_scores(scores, os_name):
    out = {}
    for pid, weights in WEIGHTS.items():
        total = 0
        weight = 0
        for key, w in weights.items():
            total += scores[key] * w
            weight += w
        value = cap(total / weight)
        if os_name == "chromeos":
            if pid == "gamer":
                value = min(value, 3)
            elif pid == "createur":
                value = min(value, 4)
            elif pid == "professionnel":
                value = min(value, 6)
        if os_name == "sans" and pid == "etudiant":
            value = max(1, value - 1)
        if pid == "gamer" and scores["gaming"] < 7:
            value = min(value, 6)
        out[pid] = value
    return out


def fmt_go(n):
    if n is None:
        return "non documenté"
    if n >= 1024 and n % 1024 == 0:
        to = n // 1024
        return f"{to} To" if to > 1 else "1 To"
    return f"{n} Go"


def fmt_diag(d):
    if d is None:
        return None
    s = f"{d:.1f}".replace(".", ",")
    if s.endswith(",0"):
        s = s[:-2]
    return s


def ecran_text(m):
    bits = []
    if m["diag"]:
        bits.append(fmt_diag(m["diag"]) + "\"")
    if m["tech"]:
        bits.append(m["tech"])
    if m["res"]:
        bits.append(m["res"])
    if m["hz"]:
        bits.append(f"{m['hz']} Hz")
    if m["nits"]:
        bits.append(f"{m['nits']} nits")
    return ", ".join(bits) if bits else "À lire sur la fiche marchand"


def auto_text(m):
    if m["heures"] and m["hsrc"] == "mesuree":
        return f"{str(m['heures']).replace('.', ',')} h mesurées en test, pas une annonce marketing"
    if m["heures"] and m["hsrc"] == "annoncee":
        return f"jusqu’à {str(m['heures']).replace('.', ',')} h annoncées (vidéo ou constructeur)"
    return "non chiffrée dans le relevé"


def idealo(nom):
    from urllib.parse import quote_plus
    return "https://www.idealo.fr/prechcat.html?q=" + quote_plus(nom)


def build_product(m):
    scores = {
        "performance": perf_score(m["cpu_n"]),
        "autonomie": autonomie_score(m),
        "ecran": ecran_score(m),
        "prix": prix_score(m["prix"]),
        "gaming": game_score(m["gpu_n"], m["cpu_n"]),
        "mobilite": mobilite_score(m["poids"]) or 5,
        "memoire": memoire_score(m["ram"], m["ssd"]),
    }
    provenance = {
        "sources": m["sources"],
        "autonomie": m.get("prov_autonomie") or (m["hsrc"] or "estimation_de_categorie"),
        "prix": "indicatif_octobre_2026",
    }
    if m["poids"] is None:
        provenance["mobilite"] = "poids_absent_score_neutre_5"
    if not m["heures"]:
        provenance["autonomie_detail"] = m.get("prov_autonomie_detail") or "Pas d’heure sourcée : le score d’autonomie suit la catégorie (Arm, ultraportable, polyvalent, gamer), à remplacer par une mesure."
    os_label = {"macos": "macOS", "windows": "Windows 11", "chromeos": "ChromeOS", "sans": "souvent vendu sans Windows", "inconnu": "non précisé dans le relevé"}[m["os"]]
    return {
        "id": m["id"],
        "nom": m["nom"],
        "marque": m["marque"],
        "prix_indicatif": m["prix"],
        "prix_note": m["note"],
        "caracteristiques": {
            "processeur": m.get("cpu_detail") or m["cpu"],
            "ram": m.get("ram_detail") or f"{m['ram']} Go",
            "stockage": m.get("ssd_detail") or ((fmt_go(m["ssd"]) + (" UFS" if m["id"] == "chromebook-plus-14" else " SSD")) if m["ssd"] is not None else "non documenté"),
            "ecran": m.get("ecran_detail") or ecran_text(m),
            "gpu": m["gpu"],
            "poids": f"{str(m['poids']).replace('.', ',')} kg" if m["poids"] else "non cité dans le relevé",
            "autonomie": m.get("autonomie_detail") or auto_text(m),
            "os": m.get("os_detail") or os_label,
            **({"chargeur": "Inclus", "batterie": str(m["batterie_wh"]).replace(".", ",") + " Wh" if m["batterie_wh"] is not None else "capacité non relevée"} if "chargeur_inclus" in m else {}),
        },
        "points_forts": m["forts"],
        "points_faibles": m["faibles"],
        "profil_adapte": sorted(profile_scores(scores, m["os"]), key=lambda k: -profile_scores(scores, m["os"])[k])[:2],
        "scores": scores,
        "idealo_url": idealo(m["nom"]),
        "fabricant_url": m.get("fabricant_url"),
        "date_verification": m.get("date_verification", "2026-10"),
        "profil_scores": profile_scores(scores, m["os"]),
        "compatibilite": {
            "ecran": {
                "technologie": m["tech"],
                "diagonale_pouces": m["diag"],
                "frequence_max_hz": m["hz"],
                "definition": m["res"],
                "luminosite_nits": m["nits"],
            },
            "performance": {
                "cpu": m["cpu"],
                "niveau": m["cpu_n"],
                "ram_go": m["ram"],
                "stockage_go": m["ssd"],
            },
            "graphique": {
                "gpu": m["gpu"],
                "niveau": m["gpu_n"],
                "dedie": m["gpu_n"] >= 3,
            },
            "batterie": {
                "autonomie_heures": m["heures"],
                "autonomie_source": m["hsrc"],
            },
            "mobilite": {"poids_kg": m["poids"]},
        },
        "os": m["os"],
        "ready_for_recommendation": True,
        **({"marchand_url": m["marchand_url"], "chargeur_inclus": m["chargeur_inclus"]} if "marchand_url" in m else {}),
        "spec_provenance": provenance,
    }


LEXIQUE = [
    {
        "id": "ecran",
        "titre": "Écran",
        "entrees": [
            {
                "id": "oled-ips",
                "terme": "OLED et IPS",
                "voir": "Sur un OLED, le noir d’une lettre est vraiment éteint. Sur un IPS, le noir tire vers le gris, surtout dans le noir complet.",
                "change": "L’OLED est plus agréable pour les films et le mode sombre. L’IPS mat fatigue souvent moins en open space, et il n’a pas de marquage si une barre de tâches reste affichée des heures.",
                "fiche": "Le mot OLED ou IPS est le premier. Ensuite : brillant ou antireflet, et les nits. Un OLED à 300 nits reste fade près d’une fenêtre.",
                "priorite": "Oui si vous montez, regardez des films ou travaillez longtemps. Non si le budget doit d’abord payer 16 Go de mémoire.",
                "definition": "L’OLED allume chaque pixel seul. L’IPS est un LCD : une lampe éclaire toute la dalle, les cristaux liquides la masquent.",
                "fonctionne": "Éteindre un pixel donne un contraste fort. Le rétroéclairage d’un IPS ne s’éteint pas localement, sauf mini-LED.",
                "ne_dit_pas": "OLED n’est pas une promesse de luminosité, ni de fidélité des couleurs, ni de 120 Hz.",
                "comparer": "Mettez côte à côte la techno, les nits, mat ou brillant, et la fréquence. Ignorez « superbe dalle » sans ces trois lignes.",
            },
            {
                "id": "hz-pc",
                "terme": "Hertz de l’écran",
                "voir": "Déplacez une fenêtre vite. À 60 Hz le mouvement saccade un peu. À 120 Hz et plus, il file.",
                "change": "En jeu, 144 ou 240 Hz servent si la carte tient ce rythme. En bureautique, passer de 60 à 120 est visible, au-delà beaucoup moins.",
                "fiche": "Cherchez 60, 90, 120, 144 ou 240 Hz à côté de la diagonale. Un 240 Hz en Full HD peut être moins net qu’un 120 Hz en QHD.",
                "priorite": "Prioritaire pour jouer. Secondaire pour écrire.",
                "definition": "Le hertz est le nombre d’images différentes que la dalle peut afficher en une seconde.",
                "fonctionne": "La dalle ne crée pas les images. Si le jeu tourne à 50 images/s, un écran 240 Hz ne les invente pas.",
                "ne_dit_pas": "Un grand nombre ne dit pas si l’image est lumineuse, ni si le temps de réponse est vraiment bas.",
                "comparer": "Pour un PC gamer, lisez Hz et définition ensemble, puis la carte graphique. Pour un ultraportable, 60 Hz OLED vaut souvent mieux qu’un 120 Hz terne.",
            },
            {
                "id": "definition",
                "terme": "Full HD, QHD, 3K",
                "voir": "En Full HD (1920 × 1080, ou 1920 × 1200), le texte est un peu plus grossier sur un 16 pouces. En QHD ou 2,8K, il est plus fin.",
                "change": "Plus de pixels fatiguent moins les yeux de près et aident le montage. Ils demandent aussi plus à la carte graphique en jeu.",
                "fiche": "La définition est une paire de nombres, pas le mot HD. 1920 × 1200 est du WUXGA, pas du 4K. 2880 × 1800 est un 3K / 2,8K.",
                "priorite": "Oui au-dessus de 15 pouces. Sur un 13 pouces, le Full HD reste lisible.",
                "definition": "La définition compte les pixels en largeur et en hauteur. La densité (ppp) dit s’ils sont serrés.",
                "fonctionne": "Le système agrandit l’interface. Un 3K réglé à 150 % n’affiche pas plus de colonnes Excel qu’un Full HD à 100 %, il les dessine plus nettement.",
                "ne_dit_pas": "4K sur un 14 pouces n’ajoute presque rien au quotidien et coûte de la batterie.",
                "comparer": "Regardez définition + diagonale. Un 18 pouces en 2560 × 1600 est cohérent. Un 16 pouces en 1920 × 1080 est juste.",
            },
            {
                "id": "nits",
                "terme": "Nits, brillant et mat",
                "voir": "Dehors ou face à une baie vitrée, une dalle à 300 nits devient un miroir. Vers 500 nits, le texte reste lisible.",
                "change": "Les nits mesurent la luminosité. Le traitement mat diffuse les reflets. Une dalle brillante a plus de pep mais renvoie les lampes.",
                "fiche": "Méfiez-vous du pic HDR tenu une seconde. Le chiffre utile est la luminosité soutenue, souvent 300, 400 ou 500 nits.",
                "priorite": "Oui si vous bougez, ou si l’écran est brillant. Moins si le PC reste dans une pièce tamisée.",
                "definition": "Un nit est une candela par mètre carré. C’est une luminosité, pas une qualité d’image.",
                "fonctionne": "HDR a besoin d’un pic élevé et d’un noir profond. Un IPS à 300 nits affiche un logo HDR sans pouvoir le tenir.",
                "ne_dit_pas": "1 600 nits sur un MacBook Pro est un pic mini-LED, pas la luminosité de toute la page blanche.",
                "comparer": "Notez nits soutenus, mat ou brillant, et OLED ou IPS. Les trois ensemble.",
            },
            {
                "id": "couleur",
                "terme": "sRGB et DCI-P3",
                "voir": "Deux photos du même fichier n’ont pas le même rouge si une dalle est étroite et l’autre large.",
                "change": "sRGB suffit pour le web et Office. DCI-P3, plus large, sert au montage et à l’impression si l’écran est calibré.",
                "fiche": "100 % sRGB est le plancher correct. 100 % DCI-P3 est le cran créatif. « couleurs vives » sans pourcentage ne veut rien dire.",
                "priorite": "Oui pour la photo et la vidéo. Non pour les cours et les mails.",
                "definition": "Ce sont des espaces : la taille de la palette que la dalle peut afficher.",
                "fonctionne": "Couvrir une palette ne veut pas dire être juste. Sans calibration, un 100 % DCI-P3 peut être trop saturé.",
                "ne_dit_pas": "Le pourcentage marketing est parfois un pic, pas une moyenne mesurée.",
                "comparer": "Demandez sRGB ou DCI-P3, et si possible un delta E publié par un test, pas par la boîte.",
            },
        ],
    },
    {
        "id": "performances",
        "titre": "Performances",
        "entrees": [
            {
                "id": "processeur",
                "terme": "Le processeur",
                "voir": "Vous le voyez quand dix onglets, un appel vidéo et un tableur sont ouverts en même temps, ou quand un export rame.",
                "change": "Intel Core Ultra, AMD Ryzen AI, Apple M et Snapdragon X ne se classent pas par leur numéro marketing. La lettre compte : U économise, H et HX poussent et chauffent.",
                "fiche": "Notez le nom complet, par exemple Core Ultra 7 256V ou Ryzen AI 7 350 ou M5. « Core i7 » seul mélange cinq années.",
                "priorite": "Oui. C’est le premier critère après l’usage réel.",
                "definition": "Le processeur exécute les logiciels. Le NPU à côté accélère certains calculs d’IA, pas Word.",
                "fonctionne": "Plus de cœurs aident le montage et la compilation. Un cœur rapide aide la réactivité. Les deux ne sont pas le même besoin.",
                "ne_dit_pas": "Un Ultra 9 dans un châssis fin peut être bridé par la chaleur. Le nom ne dit pas la puissance tenue.",
                "comparer": "Comparez des tests du même portable, pas le seul badge. Et séparez toujours le processeur de la carte graphique.",
            },
            {
                "id": "ram",
                "terme": "Mémoire vive : 8, 16, 32 Go",
                "voir": "À 8 Go, le portable écrit sur le SSD dès que Chrome et Teams sont ouverts. L’interface accroche.",
                "change": "16 Go est le plancher en 2026 pour Windows et pour un Mac utilisé vraiment. 32 Go sert au montage, aux machines virtuelles, aux gros fichiers. 48 Go et plus, c’est un métier.",
                "fiche": "Lisez « soudée » ou « un emplacement libre ». Soudée : vous ne rajouterez rien. DDR5 en barrette : vous pourrez.",
                "priorite": "Oui, avant le disque et avant l’écran si vous hésitez.",
                "definition": "La RAM est le plan de travail. Le SSD est l’armoire. Remplir le plan de travail oblige à tout ranger sans cesse.",
                "fonctionne": "Sur Apple, la mémoire est unifiée : processeur et graphique la partagent. 8 Go sur le MacBook Neo sont donc partagés, pas réservés au système.",
                "ne_dit_pas": "32 Go ne rendent pas un vieux processeur rapide. Ils évitent seulement qu’il étouffe.",
                "comparer": "Écartez 8 Go sur Windows. Sur Mac, 8 Go ne conviennent qu’au Neo pour un usage léger, pas au montage.",
            },
            {
                "id": "stockage",
                "terme": "SSD, eMMC, UFS",
                "voir": "Le portable démarre vite avec un SSD. Un petit stockage se voit le jour où un jeu ou un rush vidéo ne rentre plus.",
                "change": "512 Go est le confort. 256 Go oblige à trier. 1 To devient utile avec les jeux ou la vidéo. eMMC et UFS, sur certains Chromebook, sont plus lents qu’un SSD NVMe.",
                "fiche": "Cherchez SSD ou NVMe, et la capacité. « 1 To » peut être en option, pas dans le prix affiché.",
                "priorite": "Oui si vous gardez les fichiers en local. Moins si tout est en ligne et que le réseau suit.",
                "definition": "Le stockage garde les fichiers éteints. Ce n’est pas de la mémoire vive.",
                "fonctionne": "Un second emplacement M.2 permet d’ajouter un SSD. Beaucoup d’ultraportables n’en ont qu’un, parfois soudé.",
                "ne_dit_pas": "La capacité ne dit pas le débit. Un petit SSD rapide vaut mieux qu’un gros eMMC pour ouvrir un projet.",
                "comparer": "Prix pour 512 Go minimum en Windows, 256 Go seulement si vous savez pourquoi. Vérifiez l’emplacement libre.",
            },
            {
                "id": "gpu",
                "terme": "Carte graphique et watts",
                "voir": "Un jeu récent saccade, ou un export 3D dure une éternité, quand il n’y a pas de carte dédiée ou qu’elle est bridée.",
                "change": "RTX 5060 : jeu en 1080p élevé. RTX 5070 : cran au-dessus, surtout en QHD. RTX 5090 portable : remplacement de tour, si les watts suivent. 100 W et 175 W ne sont pas la même carte, même nom.",
                "fiche": "Notez le nom exact et le TGP en watts. Sans watts, deux RTX 5070 ne se valent pas.",
                "priorite": "Oui pour jouer ou pour la 3D. Non pour Office, le web et la visio.",
                "definition": "La carte dédiée a sa mémoire. L’iGPU emprunte la RAM et chauffe moins.",
                "fonctionne": "Le processeur prépare l’image, la carte la dessine. Un i5 avec une bonne RTX joue mieux qu’un i9 sans carte.",
                "ne_dit_pas": "« RTX » sans numéro, ou un numéro sans watts, ne suffit pas à classer.",
                "comparer": "Même puce, même watts, même définition d’écran. Le reste est du marketing.",
            },
            {
                "id": "igpu",
                "terme": "Graphique intégré",
                "voir": "L’ordinateur reste fin, silencieux, et tient la journée. Les jeux lourds et Blender non.",
                "change": "Apple M, Arc B390, Radeon 880M/890M et Adreno des Snapdragon X dépassent largement l’UHD d’un ancien Intel. Ils tiennent le montage 1080p et les jeux légers.",
                "fiche": "Si la ligne carte graphique répète le nom du processeur, ou dit Intel Arc / Radeon / Apple, c’est intégré.",
                "priorite": "Comprenez-le pour ne pas payer un PC gamer dont vous n’avez pas besoin, ni l’inverse.",
                "definition": "Le graphique intégré est dans la même puce que le processeur.",
                "fonctionne": "Il partage la RAM. 16 Go deviennent 12 Go utiles si le graphique en prend.",
                "ne_dit_pas": "Intégré n’est pas nul. Dédié n’est pas obligatoire pour Lightroom.",
                "comparer": "Pour la création légère, un M5 ou un Arc récent suffit. Pour le jeu AAA, il faut une RTX et ses watts.",
            },
        ],
    },
    {
        "id": "mobilite",
        "titre": "Mobilité",
        "entrees": [
            {
                "id": "autonomie",
                "terme": "Wh et heures annoncées",
                "voir": "La journée de cours se joue à la prise ou non. Le chiffre « jusqu’à 22 h » est presque toujours une lecture vidéo, luminosité basse.",
                "change": "Les wattheures (Wh) sont la taille du réservoir. Les heures dépendent de l’écran, de la luminosité et du logiciel. OLED et jeu vident plus vite.",
                "fiche": "Préférez les Wh quand ils existent (36,5 Wh sur le MacBook Neo, souvent 60 à 80 Wh sur un 14–16 pouces, 99 Wh max en avion). Traitez les heures comme un plafond.",
                "priorite": "Oui dès que le chargeur ne peut pas suivre.",
                "definition": "Wh = capacité. Heures = résultat d’un scénario, pas une propriété de la batterie.",
                "fonctionne": "Une grosse batterie dans un PC gamer n’offre pas une journée de jeu. Elle offre un trajet.",
                "ne_dit_pas": "Deux annonces « 18 h » ne sont pas comparables si l’une est de la vidéo et l’autre du web.",
                "comparer": "Dans ce catalogue, chaque fiche dit si l’heure est annoncée, mesurée, ou absente. N’inventez pas la troisième.",
            },
            {
                "id": "poids",
                "terme": "Poids",
                "voir": "Sous 1,3 kg, on l’oublie dans le sac. Vers 1,6 kg, on le sent. Au-delà de 2,2 kg, c’est un poste fixe qu’on déplace parfois.",
                "change": "Le poids publié oublie souvent le chargeur. Un 65 W compact change la donne. Un chargeur de PC gamer pèse plusieurs centaines de grammes.",
                "fiche": "Le poids est en kilogrammes, châssis seul. Ajoutez le chargeur de tête.",
                "priorite": "Oui si vous marchez. Non si le PC reste sur un bureau.",
                "definition": "C’est une masse, pas une qualité de fabrication.",
                "fonctionne": "Un 16 pouces léger (Zenbook A16 à 1,2 kg) sacrifie parfois les ports et la réparation. Un 16 pouces à 2,7 kg assume les watts.",
                "ne_dit_pas": "Léger n’est pas fragile, lourd n’est pas solide. Regardez le matériau à part.",
                "comparer": "Même diagonale, puis le poids, puis les ports. Un 13 pouces à 1,5 kg n’a pas d’excuse.",
            },
        ],
    },
    {
        "id": "usage",
        "titre": "Usage",
        "entrees": [
            {
                "id": "os",
                "terme": "Windows, macOS, ChromeOS",
                "voir": "Le logiciel dont vous avez besoin s’installe, ou il s’ouvre dans le navigateur, ou il ne s’installe pas.",
                "change": "Windows fait tout, y compris le jeu. macOS tient longtemps et verrouille la réparation. ChromeOS suffit aux cours en ligne et bloque la plupart des logiciels lourds. Windows sur Arm (Snapdragon) exige encore de vérifier les applications.",
                "fiche": "La ligne système. « Sans OS » veut dire ajouter Windows, environ 100 à 150 €, ou une licence déjà possédée.",
                "priorite": "Oui avant le processeur si un logiciel de cours ou de métier est imposé.",
                "definition": "Le système est la couche sur laquelle les applications tournent.",
                "fonctionne": "ChromeOS peut faire tourner certaines applis Linux ou Android. Ce n’est pas un Windows de secours.",
                "ne_dit_pas": "Un Snapdragon récent n’est pas un Intel. Le nom Windows 11 ne garantit pas chaque jeu ou chaque driver.",
                "comparer": "Listez deux logiciels obligatoires. S’ils n’existent que sur Windows x86, écartez ChromeOS et vérifiez Arm.",
            },
            {
                "id": "npu",
                "terme": "NPU, Copilot+ et TOPS",
                "voir": "Pour l’instant : flou d’arrière-plan, sous-titres, génération d’images locales. Pas un ordinateur plus rapide dans Excel.",
                "change": "40 TOPS est le seuil marketing Copilot+. Un NPU sert aux fonctions d’IA locales. Il ne remplace ni la RAM ni la carte graphique.",
                "fiche": "NPU, TOPS, ou « PC Copilot+ ». Sans ces mots, l’IA se fait dans le cloud, avec un compte et du réseau.",
                "priorite": "Non, sauf besoin précis. Ne payez pas un surcoût seulement pour le badge.",
                "definition": "Le NPU est un bloc de la puce spécialisé dans certains calculs d’inférence.",
                "fonctionne": "Il est efficace sur des modèles prévus pour lui. Un export Premiere continue de dépendre du CPU et du GPU.",
                "ne_dit_pas": "Plus de TOPS n’est pas une note globale du portable.",
                "comparer": "Ignorez le badge tant que 16 Go, l’écran et le poids ne sont pas réglés.",
            },
            {
                "id": "ports",
                "terme": "Ports",
                "voir": "Il manque une prise HDMI le jour de la soutenance, ou un USB-A pour la clé qu’on vous tend.",
                "change": "Deux USB-C dont un seul vraiment rapide, c’est courant sur les fins. HDMI et USB-A évitent l’adaptateur. Le chargeur USB-C partagé avec le téléphone est un vrai plus.",
                "fiche": "Comptez les ports, pas l’adjectif « connectique complète ». USB 2 sur un des ports du MacBook Neo n’est pas un Thunderbolt.",
                "priorite": "Oui si vous branchez un écran ou une clé chaque semaine.",
                "definition": "Le port est le tuyau. Sa version (USB 2, 10 Gbit/s, Thunderbolt, HDMI 2.1) dit le débit et l’image.",
                "fonctionne": "Un seul port peut servir à charger et à l’écran. Il n’en reste alors plus pour la souris, sauf hub.",
                "ne_dit_pas": "USB-C n’implique pas le même débit ni la charge.",
                "comparer": "Listez ce que vous branchez vraiment. Ajoutez le prix d’un hub si la fiche est trop nue.",
            },
        ],
    },
]


AUDIT = [
    {
        "id": "ecran",
        "titre": "Écran",
        "pourquoi": "La techno, la fréquence et la taille se voient tout de suite. Le nombre de pouces ne dit pas si l’image est belle.",
        "criteres": ["technologie", "frequence_max_hz", "diagonale_pouces"],
    },
    {
        "id": "memoire",
        "titre": "Mémoire et stockage",
        "pourquoi": "8 Go se sentent au quotidien. 256 Go se sentent au bout d’un an. Les deux se lisent avant le processeur.",
        "criteres": ["ram_go", "stockage_go"],
    },
    {
        "id": "processeur",
        "titre": "Processeur",
        "pourquoi": "Le niveau résume la famille, pas une note de test. Le nom exact reste dans la fiche.",
        "criteres": ["niveau"],
    },
    {
        "id": "graphique",
        "titre": "Graphique",
        "pourquoi": "C’est le critère qui remplace la photo des smartphones. Intégré ou RTX, puis les watts quand on les a.",
        "criteres": ["niveau", "dedie"],
    },
    {
        "id": "mobilite",
        "titre": "Mobilité",
        "pourquoi": "Poids et heures. Une heure annoncée n’est pas une heure mesurée : le champ autonomie_source le dit.",
        "criteres": ["poids_kg", "autonomie_heures"],
    },
]


def lexique_html(sections):
    """Page lexique PC au gabarit du site : en-tête, recherche, pied de page et scripts sont repris de
    lexique.html (lexique smartphones) pour que les deux pages restent identiques. Source des textes :
    lexique-pc-portables.json."""
    import html as _h
    src = ROOT / "lexique.html"   # gabarit : page lexique smartphones à la racine du site
    lex = src.read_text(encoding="utf-8")
    head = lex[:lex.index("<main")]
    tail = lex[lex.index("</main>") + len("</main>"):]
    f0, f1 = tail.index("<footer"), tail.index("</footer>") + len("</footer>")
    esc = lambda t: _h.escape(t or "", quote=False)
    head = re.sub(r"<title>.*?</title>", "<title>Lexique PC portables : lire une fiche sans le jargon — Guide·Achat</title>", head, flags=re.S)
    head = re.sub(r'(<meta name="description" content=")[^"]*', r"\1Les termes d’une fiche de PC portable expliqués simplement : ce que vous voyez, ce que cela change, quoi regarder en priorité.", head)
    head = re.sub(r'<link[^>]*rel="canonical"[^>]*>', "", head)
    nav = "".join(f'<a href="#{s["id"]}">{esc(s["titre"])}</a>' for s in sections)
    out = [head, '<main id="main">', '<div class="hx hx-page" data-tone="teal" data-cat="pc">',
        '<section class="hx-hero hx-hero--page is-compact"><div class="container-wide hx-hero-inner"><div class="hx-hero-copy">',
        '<nav class="breadcrumb"><a href="index.html">Accueil</a> / <a href="pc-portables.html">PC portables</a> / Lexique</nav>',
        '<span class="hx-kicker">LE LEXIQUE DE LA FICHE PRODUIT</span>',
        '<h1 class="hx-title">Lire une fiche de PC portable sans le jargon</h1>',
        '<p class="hx-lead">Ce que vous voyez, ce que cela change, ce qu’il faut lire sur la fiche : chaque terme part de la situation concrète avant de remonter vers la technique.</p>',
        '</div></div></section><div class="container-wide hx-body">',
        '<div aria-label="Niveau d\'explication" class="lexique-mode" role="region"><div><strong>Deux façons de lire la même information</strong><span id="deep-status">Mode simple : l’essentiel pour choisir.</span></div><button aria-label="Basculer entre le mode simple et le mode détails" aria-pressed="false" id="deep-toggle" type="button"><span data-toggle-label="">Explication approfondie</span><i aria-hidden="true"></i></button></div>',
        f'<nav aria-label="Rubriques du lexique" class="lexique-nav">{nav}</nav>']
    for s in sections:
        out.append(f'<section class="lexique-section" id="{s["id"]}" data-tone="teal"><div class="section-heading"><span class="eyebrow">{esc(s["titre"]).upper()}</span><h2>{esc(s["titre"])}</h2></div>')
        for e in s["entrees"]:
            out.append(f'<article class="lex-entry" id="{e["id"]}"><h3>{esc(e["terme"])}</h3><div class="lex-content"></div><div class="lex-quick"><div class="lex-grid">')
            for lab, k in (("Ce que vous voyez", "voir"), ("Ce que cela change", "change"), ("Sur une fiche produit", "fiche"), ("À regarder en priorité", "priorite")):
                out.append(f"<div><b>{lab}</b><p>{esc(e[k])}</p></div>")
            out.append('</div></div><div class="lex-deep" hidden="">')
            for lab, k in (("Définition", "definition"), ("Comment ça fonctionne", "fonctionne"), ("Ce que le chiffre ne dit pas", "ne_dit_pas"), ("Comment comparer", "comparer")):
                out.append(f'<div class="deep-block"><span>{lab}</span><p>{esc(e[k])}</p></div>')
            out.append("</div></article>")
        out.append("</section>")
    out.append('<p><a class="hx-link" href="pc-portables.html#lexique">← Retour au guide PC portables</a></p></div></div></main>')
    out.append(tail[f0:f1]); out.append(tail[f1:])
    return "\n".join(out)

def main():
    ids = [m["id"] for m in MODELS]
    if len(ids) != len(set(ids)):
        raise SystemExit(f"ids uniques requis, obtenu {len(ids)} / {len(set(ids))}")
    produits = [build_product(m) for m in MODELS]
    catalogue = {
        "categorie": "pc-portables",
        "produits": produits,
        "profils": {
            "etudiant": {
                "titre": "Étudier",
                "ligne": "Cours, transports, budget. Le prix, l’autonomie et le poids passent avant la carte graphique.",
                "surveiller": "16 Go si possible, poids, vrai prix avec Windows.",
            },
            "professionnel": {
                "titre": "Travailler",
                "ligne": "Journée de mails, tableur et visio, parfois hors bureau. Réactivité, écran lisible, batterie.",
                "surveiller": "16 Go minimum, écran, ports, autonomie qui n’est pas seulement une annonce vidéo.",
            },
            "gamer": {
                "titre": "Jouer",
                "ligne": "La carte et ses watts décident. Le processeur et l’écran suivent. Le poids passe après.",
                "surveiller": "GPU, TGP, Hz, 16 Go vraiment justes, 32 Go plus confortables.",
            },
            "createur": {
                "titre": "Créer",
                "ligne": "Photo, montage, maquette. L’écran et la mémoire remplacent le capteur photo des smartphones.",
                "surveiller": "OLED ou mini-LED, 32 Go dès que les fichiers grossissent, GPU si la 3D entre dans le métier.",
            },
        },
        "poids_des_profils": WEIGHTS,
        "audit_familles": AUDIT,
        "catalogue_meta": {
            "derniere_verification": "2026-10-23",
            "detail_verification": "Ajout le 23 octobre 2026 de 11 références LDLC sous 2 600 €, chargeur inclus confirmé. Quatre références sans chargeur exclues de la sélection initiale. Les 60 fiches antérieures conservent leurs relevés et leurs caractéristiques.",
            "count": len(produits),
            "note": "Les scores classent une compatibilité avec un profil. Ils sont plafonnés à 9. Ce ne sont pas des notes de laboratoire.",
            "sources": ["LDLC (références exactes, 23 octobre 2026)", "Les Numériques", "JVTECH", "FranceMetrics", "Que Choisir", "fiches Apple, Asus et HP", "Clubic", "Materiel.net", "Boulanger", "leDénicheur", "Grosbill", "Ratake", "idealo", "frandroid", "Tom's Hardware", "Futura", "La Voix du Nord", "fiches Lenovo, Dell, Samsung et Honor"],
            "scoring": {
                "max": 9,
                "min": 1,
                "principe": "performance vient du niveau CPU, gaming du niveau GPU, prix du prix indicatif, écran de la techno, mobilité du poids, autonomie des heures sourcées ou à défaut de la catégorie. Le détail est dans construire.py.",
                "createur": "Le profil créateur remplace le profil photographe des smartphones : un portable n’a pas de capteur, il a un écran et une mémoire.",
            },
            "note_fiabilite": "Chaque fiche a ses sources et dit si l’autonomie est annoncée, mesurée ou seulement estimée par catégorie. Les prix bougent. Les configurations (8/256 contre 16/512) changent le produit.",
        },
        "meta": {"prix_releves": "11 nouvelles références LDLC relevées le 23 octobre 2026 ; les 60 fiches antérieures conservent leur relevé d'origine (sept.-oct. 2026)"},
    }
    (DATA / "pc-portables.json").write_text(json.dumps(catalogue, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (DATA / "lexique-pc-portables.json").write_text(json.dumps({"categorie": "pc-portables", "sections": LEXIQUE}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (ROOT / "lexique-pc-portables.html").write_text(lexique_html(LEXIQUE), encoding="utf-8")
    print(f"{len(produits)} modèles")


if __name__ == "__main__":
    main()

