# Dasar ilmiah

Halaman ini berisi semua sumber yang dipakai aturan aplikasi, dikelompokkan per area. Setiap sumber diberi:
- **sitasi lengkap** beserta DOI atau tautan;
- **aturan yang didukungnya**, dengan tautan ke [TRAINING-LOGIC.md](TRAINING-LOGIC.md);
- **label tingkat bukti.**

Aturannya sendiri, beserta angka dan pengecualiannya, tetap ada di TRAINING-LOGIC.

> Aplikasi ini alat bantu perencanaan latihan, **bukan saran medis**. Sumber di bawah adalah dasar aturan umum. Sumber itu tidak menggantikan pemeriksaan tenaga kesehatan untuk kondisimu.

Terakhir disusun: 2026-11-02 (1.0.0-rc.2). DOI dicek ke [Crossref](https://www.crossref.org/) dan tautan lain dibuka satu per satu; hasilnya di [Pemeriksaan tautan](#pemeriksaan-tautan).

## Label tingkat bukti

| Label | Artinya |
| --- | --- |
| **Guideline** | Pedoman praktik klinis atau consensus statement dari organisasi/panel ahli |
| **Meta-analysis** | Gabungan statistik beberapa studi (biasanya dari tinjauan sistematis) |
| **Systematic review** | Tinjauan dengan pencarian dan seleksi studi yang sistematis, tanpa atau dengan sintesis kuantitatif terbatas |
| **RCT** | Uji acak terkontrol |
| **Controlled study** | Uji intervensi dengan kelompok pembanding, tanpa pengacakan yang jelas, atau studi validasi |
| **Lab study** | Studi biomekanik atau fisiologi di laboratorium (mis. EMG, analisis gerak), tanpa hasil klinis |
| **Observational** | Kohort, kasus-kontrol, atau analisis data yang tidak diintervensi |
| **Narrative review** | Tinjauan pakar tanpa metode sistematis |
| **Book** | Buku teks atau buku metode dari penulis/organisasi yang diakui |
| **Practitioner recommendation** | Panduan pelatih, majalah, atau situs lari; dipakai hanya untuk rekomendasi umum, tidak untuk aturan keselamatan |

Label hanya menggambarkan **jenis** sumber, bukan kualitas tiap studi. Label tambahan (Controlled study, Lab study, Observational, Narrative review) dipakai supaya sumber tidak terkesan lebih kuat dari aslinya.

## Daftar isi

- [Lari](#lari)
- [Kekuatan](#kekuatan)
- [Cedera & kondisi](#cedera--kondisi)
- [Program & periodisasi](#program--periodisasi)
- [Beban & kesiapan](#beban--kesiapan)
- [Teknik & pemilihan gerakan](#teknik--pemilihan-gerakan)
- [Ringkasan per tingkat bukti](#ringkasan-per-tingkat-bukti)
- [Pemeriksaan tautan](#pemeriksaan-tautan)

## Lari

- **Daniels J. (2014).** *Daniels' Running Formula*, 3rd ed. Human Kinetics.
  `Book` · Kategori pace Easy, Threshold, dan Interval sebagai kerangka pola lari; jenis sesi per fase program; tabel VDOT untuk perkiraan waktu lomba ([§2](TRAINING-LOGIC.md#2-generator-lari), [§7](TRAINING-LOGIC.md#perkiraan-waktu-lomba-0132), [§9](TRAINING-LOGIC.md#zona-lari-vdot-daniels)).
- **Daniels J., Gilbert J. (1979).** *Oxygen Power: Performance Tables for Distance Runners*. Tempe, AZ (terbitan penulis). Tanpa DOI.
  `Book` · Rumus VDOT (VO2 dari kecepatan, %VO2max dari durasi) untuk zona lari dan perkiraan waktu lomba ([§9](TRAINING-LOGIC.md#zona-lari-vdot-daniels)).
- **Riegel P. S. (1981).** Athletic records and human endurance. *American Scientist* 69(3):285–290. Tanpa DOI (tidak terdaftar di Crossref).
  `Observational` · Rumus T2 = T1 × (D2/D1)^1,06, dipakai hanya sebagai pembanding perkiraan waktu lomba ([§7](TRAINING-LOGIC.md#perkiraan-waktu-lomba-0132)).
- **Helgerud J., Høydal K., Wang E., dkk. (2007).** Aerobic high-intensity intervals improve VO2max more than moderate training. *Med Sci Sports Exerc* 39(4):665–671. [doi:10.1249/mss.0b013e3180304570](https://doi.org/10.1249/mss.0b013e3180304570)
  `RCT` · Dasar Norwegian 4×4 dan 15/15, serta intensitas 4×4 di antara Threshold dan Interval ([§2](TRAINING-LOGIC.md#2-generator-lari), [§9](TRAINING-LOGIC.md#zona-lari-vdot-daniels)).
- **Seiler S. (2010).** What is best practice for training intensity and duration distribution in endurance athletes? *Int J Sports Physiol Perform* 5(3):276–291. [doi:10.1123/ijspp.5.3.276](https://doi.org/10.1123/ijspp.5.3.276)
  `Narrative review` · Aturan 80/20 dan model 3 zona; batas "lari berat" di 90% LTHR ([§5](TRAINING-LOGIC.md#ambang-pribadi-0152)).
- **Stöggl T. L., Sperlich B. (2015).** The training intensity distribution among well-trained and elite endurance athletes. *Front Physiol* 6:295. [doi:10.3389/fphys.2015.00295](https://doi.org/10.3389/fphys.2015.00295)
  `Narrative review` · Pendukung distribusi intensitas polarisasi/80-20. Sebelum 1.0.0-rc.2 artikel ini keliru dicantumkan atas nama Seiler.
- **Heiderscheit B. C., Chumanov E. S., Michalski M. P., dkk. (2011).** Effects of step rate manipulation on joint mechanics during running. *Med Sci Sports Exerc* 43(2):296–302. [doi:10.1249/MSS.0b013e3181ebedf4](https://doi.org/10.1249/MSS.0b013e3181ebedf4) · [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3387288/)
  `Lab study` · Cue cadence +5–10% untuk mengurangi beban lutut dan pinggul (kondisi shin splints, PFP, ITBS) ([§1](TRAINING-LOGIC.md#1-aturan-dasar--kondisi-atlet), [§9](TRAINING-LOGIC.md#katalog-kondisi--batasan)).
- **Friel J. (2016).** *The Triathlete's Training Bible*, 4th ed. VeloPress.
  `Book` · Zona HR lari dari LTHR (85/90/95/100%) di Setting › Zona ([§1](TRAINING-LOGIC.md#1-aturan-dasar--kondisi-atlet)).
- **Edwards S. (1993).** *The Heart Rate Monitor Book*. Fleet Feet Press.
  `Book` · Lima zona dari %HR maks (60/70/80/90%) di Setting › Zona ([§1](TRAINING-LOGIC.md#1-aturan-dasar--kondisi-atlet)).

## Kekuatan

- **Haff G. G., Triplett N. T. (eds.) (2016).** *NSCA Essentials of Strength Training and Conditioning*, 4th ed. Human Kinetics.
  `Book` · Gerakan multi-joint sebagai fondasi, urutan latihan, progresi beban "2-for-2" ([§3](TRAINING-LOGIC.md#3-generator-strength-training), [§6](TRAINING-LOGIC.md#6-progresi-beban)).
- **Zatsiorsky V. M., Kraemer W. J., Fry A. C. (2020).** *Science and Practice of Strength Training*, 3rd ed. Human Kinetics.
  `Book` · Tidak ada satu program untuk semua orang; dasar penyesuaian beban per atlet ([§3](TRAINING-LOGIC.md#3-generator-strength-training)).
- **Zourdos M. C., Klemp A., Dolan C., dkk. (2016).** Novel resistance training-specific rating of perceived exertion scale measuring repetitions in reserve. *J Strength Cond Res* 30(1):267–275. [doi:10.1519/JSC.0000000000001049](https://doi.org/10.1519/JSC.0000000000001049)
  `Controlled study` · RPE 7 = sisakan sekitar 3 repetisi; batas RPE ≤ 7 di semua set ([§1](TRAINING-LOGIC.md#1-aturan-dasar--kondisi-atlet)).
- **Kassiano W., Nunes J. P., Costa B., dkk. (2022).** Does varying resistance exercises promote superior muscle hypertrophy and strength gains? A systematic review. *J Strength Cond Res* 36(6):1753–1762. [doi:10.1519/JSC.0000000000004258](https://doi.org/10.1519/JSC.0000000000004258)
  `Systematic review` · Variasi gerakan yang sistematis lebih baik daripada acak ([§4](TRAINING-LOGIC.md#4-periodisasi--variasi)).
- **Moesgaard L., Beck M. M., Christiansen L., dkk. (2022).** Effects of periodization on strength and muscle hypertrophy in volume-equated resistance training programs: a systematic review and meta-analysis. *Sports Med* 52(7):1647–1666. [doi:10.1007/s40279-021-01636-1](https://doi.org/10.1007/s40279-021-01636-1)
  `Meta-analysis` · Rotasi skema rep (undulating) ([§4](TRAINING-LOGIC.md#4-periodisasi--variasi)).
- **Schoenfeld B. J., Ogborn D., Krieger J. W. (2017).** Dose-response relationship between weekly resistance training volume and increases in muscle mass: a systematic review and meta-analysis. *J Sports Sci* 35(11):1073–1082. [doi:10.1080/02640414.2016.1210197](https://doi.org/10.1080/02640414.2016.1210197)
  `Meta-analysis` · Volume langsung untuk bisep dan trisep pada gerakan tambahan 0.14.2 ([§10](TRAINING-LOGIC.md#10-gerakan-tambahan--media-09-0142)).
- **Wilson J. M., Marin P. J., Rhea M. R., dkk. (2012).** Concurrent training: a meta-analysis examining interference of aerobic and resistance exercises. *J Strength Cond Res* 26(8):2293–2307. [doi:10.1519/JSC.0b013e31823a3e2d](https://doi.org/10.1519/JSC.0b013e31823a3e2d)
  `Meta-analysis` · Lari mengganggu adaptasi kekuatan, sehingga sesi berat diberi jarak (aturan concurrent) ([§5](TRAINING-LOGIC.md#5-saran-hari-ini)).
- **Schumann M., Feuerbacher J. F., Sünkeler M., dkk. (2022).** Compatibility of concurrent aerobic and strength training for skeletal muscle size and function: an updated systematic review and meta-analysis. *Sports Med* 52(3):601–612. [doi:10.1007/s40279-021-01587-7](https://doi.org/10.1007/s40279-021-01587-7)
  `Meta-analysis` · Kekuatan eksplosif terganggu bila lari dan ST di sesi yang sama; saran jeda ≥ 3 jam di hari yang sama ([§5](TRAINING-LOGIC.md#5-saran-hari-ini)).
- **Rønnestad B. R., Mujika I. (2014).** Optimizing strength training for running and cycling endurance performance: a review. *Scand J Med Sci Sports* 24(4):603–612. [doi:10.1111/sms.12104](https://doi.org/10.1111/sms.12104)
  `Narrative review` · ST berat/eksplosif memperbaiki running economy; ST dipertahankan sepanjang program ([§7](TRAINING-LOGIC.md#st-mengikuti-fase-program-0141)).
- **Rønnestad B. R., Hansen E. A., Raastad T. (2010).** In-season strength maintenance training increases well-trained cyclists' performance. *Eur J Appl Physiol* 110(6):1269–1282. [doi:10.1007/s00421-010-1622-4](https://doi.org/10.1007/s00421-010-1622-4)
  `Controlled study` · Satu sesi per minggu cukup untuk mempertahankan kekuatan di fase Peak/Taper ([§7](TRAINING-LOGIC.md#st-mengikuti-fase-program-0141)).
- **Blagrove R. C., Howatson G., Hayes P. R. (2018).** Effects of strength training on the physiological determinants of middle- and long-distance running performance: a systematic review. *Sports Med* 48(5):1117–1149. [doi:10.1007/s40279-017-0835-7](https://doi.org/10.1007/s40279-017-0835-7)
  `Systematic review` · ST memperbaiki running economy; 2–3 sesi per minggu (dasar fitur Strength hidup 0.14).
- **Llanos-Lagos C., Ramirez-Campillo R., Moran J., Sáez de Villarreal E. (2024).** Effect of strength training programs in middle- and long-distance runners' economy at different running speeds: a systematic review with meta-analysis. *Sports Med* 54(4):895–932. [doi:10.1007/s40279-023-01978-y](https://doi.org/10.1007/s40279-023-01978-y)
  `Meta-analysis` · Beban tinggi dan plyometric lebih efektif untuk running economy daripada beban submaksimal (dasar fitur Strength hidup 0.14; plyometric tetap ditunda).
- **de Carvalho e Silva G. I., Brandão L. H. A., dos Santos Silva D., dkk. (2022).** Acute neuromuscular, physiological and performance responses after strength training in runners: a systematic review and meta-analysis. *Sports Med Open* 8:105. [doi:10.1186/s40798-022-00497-w](https://doi.org/10.1186/s40798-022-00497-w) · [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC9385928/)
  `Meta-analysis` · Torsi turun dan DOMS/CK naik setelah ST, jadi lari berat tidak disarankan sehari setelah ST kaki ([§5](TRAINING-LOGIC.md#5-saran-hari-ini)).
- **Burt D., Doma K., Connor J. (2023).** The effects of exercise-induced muscle damage on varying intensities of endurance running performance: a systematic review and meta-analysis. *Science & Sports* 38(7):647–662. [doi:10.1016/j.scispo.2022.04.003](https://doi.org/10.1016/j.scispo.2022.04.003)
  `Meta-analysis` · Running economy masih terganggu sampai 48 jam setelah kerusakan otot ([§5](TRAINING-LOGIC.md#5-saran-hari-ini)).

## Cedera & kondisi

Katalog kondisi di Setting ([§9](TRAINING-LOGIC.md#katalog-kondisi--batasan), [`lib/conditions.ts`](../lib/conditions.ts)) dan batas beban keamanan ([`lib/load-bounds.ts`](../lib/load-bounds.ts)).

- **Nielsen R. Ø., Parner E. T., Nohr E. A., dkk. (2014).** Excessive progression in weekly running distance and risk of running-related injuries: an association which varies according to type of injury. *J Orthop Sports Phys Ther* 44(10):739–747. [doi:10.2519/jospt.2014.5164](https://doi.org/10.2519/jospt.2014.5164)
  `Observational` · Peringatan kenaikan km mingguan > 30% (coach, Insight), batas kenaikan long run program ([§5](TRAINING-LOGIC.md#5-saran-hari-ini), [§7](TRAINING-LOGIC.md#7-program-target-5k--10k--hm--fm)).
- **Lauersen J. B., Bertelsen D. M., Andersen L. B. (2014).** The effectiveness of exercise interventions to prevent sports injuries: a systematic review and meta-analysis of randomised controlled trials. *Br J Sports Med* 48(11):871–877. [doi:10.1136/bjsports-2013-092538](https://doi.org/10.1136/bjsports-2013-092538)
  `Meta-analysis` · Latihan kekuatan menurunkan risiko cedera, sehingga prehab wajib di ST ([§3](TRAINING-LOGIC.md#3-generator-strength-training)).
- **Winters M., Eskes M., Weir A., dkk. (2013).** Treatment of medial tibial stress syndrome: a systematic review. *Sports Med* 43(12):1315–1333. [doi:10.1007/s40279-013-0087-0](https://doi.org/10.1007/s40279-013-0087-0)
  `Systematic review` · Kondisi shin splints: prehab betis/tibialis wajib; check-in nyeri shin ≥ 4/10 membatasi lari ke Easy ([§5](TRAINING-LOGIC.md#check-in-harian-0152)).
- **Moen M. H., Tol J. L., Weir A., dkk. (2009).** Medial tibial stress syndrome: a critical review. *Sports Med* 39(7):523–546. [doi:10.2165/00007256-200939070-00002](https://doi.org/10.2165/00007256-200939070-00002)
  `Narrative review` · Kekuatan betis dan kontrol kaki untuk MTSS (pemilihan gerakan 0.14.2).
- **Willy R. W., Davis I. S. (2011).** The effect of a hip-strengthening program on mechanics during running and during a single-leg squat. *J Orthop Sports Phys Ther* 41(9):625–632. [doi:10.2519/jospt.2011.3470](https://doi.org/10.2519/jospt.2011.3470)
  `Controlled study` · Kondisi overpronation/crossover: stabilitas panggul wajib.
- **Meardon S. A., Campbell S., Derrick T. R. (2012).** Step width alters iliotibial band strain during running. *Sports Biomech* 11(4):464–472. [doi:10.1080/14763141.2012.699547](https://doi.org/10.1080/14763141.2012.699547)
  `Lab study` · Cue "rel kereta"/anti-crossover untuk overpronation dan ITBS.
- **Willy R. W., Hoglund L. T., Barton C. J., dkk. (2019).** Patellofemoral pain: clinical practice guidelines. *J Orthop Sports Phys Ther* 49(9):CPG1–CPG95. [doi:10.2519/jospt.2019.0302](https://doi.org/10.2519/jospt.2019.0302)
  `Guideline` · Kondisi nyeri lutut depan (PFP): stabilitas panggul, nyeri ≤ 3/10, cue cadence.
- **Crossley K. M., Stefanik J. J., Selfe J., dkk. (2016).** 2016 Patellofemoral pain consensus statement from the 4th International Patellofemoral Pain Research Retreat, Manchester. Part 1. *Br J Sports Med* 50(14):839–843. [doi:10.1136/bjsports-2016-096384](https://doi.org/10.1136/bjsports-2016-096384)
  `Guideline` (consensus statement) · Kondisi PFP.
- **Fredericson M., Cookingham C. L., Chaudhari A. M., dkk. (2000).** Hip abductor weakness in distance runners with iliotibial band syndrome. *Clin J Sport Med* 10(3):169–175. [doi:10.1097/00042752-200007000-00004](https://doi.org/10.1097/00042752-200007000-00004)
  `Observational` · Kondisi ITBS: stabilitas panggul wajib.
- **Alfredson H., Pietilä T., Jonsson P., Lorentzon R. (1998).** Heavy-load eccentric calf muscle training for the treatment of chronic Achilles tendinosis. *Am J Sports Med* 26(3):360–366. [doi:10.1177/03635465980260030301](https://doi.org/10.1177/03635465980260030301)
  `Controlled study` · Kondisi tendinopati Achilles dan plantar fasciitis: Eccentric Calf Raise wajib.
- **Silbernagel K. G., Thomeé R., Eriksson B. I., Karlsson J. (2007).** Continued sports activity, using a pain-monitoring model, during rehabilitation in patients with Achilles tendinopathy: a randomized controlled study. *Am J Sports Med* 35(6):897–906. [doi:10.1177/0363546506298279](https://doi.org/10.1177/0363546506298279)
  `RCT` · Model pemantauan nyeri ≤ 5/10 untuk tendon; tanpa sprint 15/15 saat Achilles aktif ([§5](TRAINING-LOGIC.md#check-in-harian-0152)).
- **Martin R. L., Davenport T. E., Reischl S. F., dkk. (2014).** Heel pain—plantar fasciitis: revision 2014. Clinical practice guidelines. *J Orthop Sports Phys Ther* 44(11):A1–A33. [doi:10.2519/jospt.2014.0303](https://doi.org/10.2519/jospt.2014.0303)
  `Guideline` · Kondisi plantar fasciitis: peregangan betis, catatan nyeri pagi.
- **Rathleff M. S., Mølgaard C. M., Fredberg U., dkk. (2015).** High-load strength training improves outcome in patients with plantar fasciitis: a randomized controlled trial with 12-month follow-up. *Scand J Med Sci Sports* 25(3). [doi:10.1111/sms.12313](https://doi.org/10.1111/sms.12313)
  `RCT` · Kondisi plantar fasciitis: latihan beban tinggi betis.
- **NICE (2016, pembaruan 2020).** *Low back pain and sciatica in over 16s: assessment and management* (NG59). National Institute for Health and Care Excellence. [nice.org.uk/guidance/ng59](https://www.nice.org.uk/guidance/ng59)
  `Guideline` · Kondisi nyeri punggung bawah: latihan bertahap, Spine-Friendly, batas beban Barbell Squat.
- **Hayden J. A., Ellis J., Ogilvie R., dkk. (2021).** Exercise therapy for chronic low back pain. *Cochrane Database Syst Rev* 2021:CD009790. [doi:10.1002/14651858.CD009790.pub2](https://doi.org/10.1002/14651858.CD009790.pub2)
  `Meta-analysis` (Cochrane) · Kondisi nyeri punggung bawah.
- **McGill S. (2016).** *Low Back Disorders: Evidence-Based Prevention and Rehabilitation*, 3rd ed. Human Kinetics.
  `Book` · Spine-Friendly Protocol, Dead Bug anti-ekstensi, batas beban aksial (APT, nyeri punggung bawah).
- **Diercks R., Bron C., Dorrestijn O., dkk. (2014).** Guideline for diagnosis and treatment of subacromial pain syndrome: a multidisciplinary review by the Dutch Orthopaedic Association. *Acta Orthop* 85(3):314–322. [doi:10.3109/17453674.2014.920991](https://doi.org/10.3109/17453674.2014.920991)
  `Guideline` · Kondisi nyeri bahu: gerakan overhead dilarang, batas beban Lateral Raise dan Scaption.
- **Littlewood C., Ashton J., Chance-Larsen K., dkk. (2012).** Exercise for rotator cuff tendinopathy: a systematic review. *Physiotherapy* 98(2):101–109. [doi:10.1016/j.physio.2011.08.002](https://doi.org/10.1016/j.physio.2011.08.002)
  `Systematic review` · Kondisi nyeri bahu: beban rendah yang progresif.
- **Pettersson J., Hindorf U., Persson P., dkk. (2008).** Muscular exercise can cause highly pathological liver function tests in healthy men. *Br J Clin Pharmacol* 65(2):253–259. [doi:10.1111/j.1365-2125.2007.03001.x](https://doi.org/10.1111/j.1365-2125.2007.03001.x)
  `Observational` · Kondisi "jeda sebelum MCU": hindari latihan beban berat 24–48 jam sebelum tes darah.

## Program & periodisasi

- **Bompa T. O., Buzzichelli C. A. (2019).** *Periodization: Theory and Methodology of Training*, 6th ed. Human Kinetics.
  `Book` · Struktur blok 4 minggu (3 normal + 1 deload) dan fase program ([§4](TRAINING-LOGIC.md#4-periodisasi--variasi)).
- **Bosquet L., Montpetit J., Arvisais D., Mujika I. (2007).** Effects of tapering on performance: a meta-analysis. *Med Sci Sports Exerc* 39(8):1358–1365. [doi:10.1249/mss.0b013e31806010e0](https://doi.org/10.1249/mss.0b013e31806010e0)
  `Meta-analysis` · Taper sekitar 2 minggu, volume turun 41–60%, intensitas dan frekuensi tetap ([§7](TRAINING-LOGIC.md#7-program-target-5k--10k--hm--fm)).
- **Mujika I., Padilla S. (2003).** Scientific bases for precompetition tapering strategies. *Med Sci Sports Exerc* 35(7):1182–1187. [doi:10.1249/01.MSS.0000074448.73931.11](https://doi.org/10.1249/01.MSS.0000074448.73931.11)
  `Narrative review` · Saat taper intensitas dijaga, volume turun, frekuensi turun ≤ 20%.
- **Travis S. K., Mujika I., Gentles J. A., dkk. (2020).** Tapering and peaking maximal strength for powerlifting performance: a review. *Sports* 8(9):125. [doi:10.3390/sports8090125](https://doi.org/10.3390/sports8090125) · [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC7552788/)
  `Narrative review` · ST di minggu taper: volume-load sekitar 50%, intensitas tetap ([§7](TRAINING-LOGIC.md#st-mengikuti-fase-program-0141)).

### Panjang program dan kesiapan lomba (0.13.3)

Tabel panjang program (minimum, rekomendasi, maksimum per jarak), syarat kesiapan HM/FM, dan jarak antar maraton di [§7 Hari H](TRAINING-LOGIC.md#hari-h--saran-lama-program-0133) adalah **rekomendasi umum (praktisi)**, bukan bukti klinis. Aplikasi memakainya sebagai saran berwarna yang tidak memblokir.

`Practitioner recommendation`:
- Hal Higdon, jarak mingguan sebelum memulai program maraton (TrainingPeaks): [trainingpeaks.com](https://www.trainingpeaks.com/blog/weekly-mileage-before-starting-a-marathon-training-program/)
- REI, *How to Train for a Marathon*: [rei.com](https://www.rei.com/learn/expert-advice/training-for-your-first-marathon.html) · [arsip](https://web.archive.org/web/20260616175526/https://www.rei.com/learn/expert-advice/training-for-your-first-marathon.html)
- Active.com, *Are You Ready to Run a Marathon?*: [active.com](https://origin-a3.active.com/running/articles/are-you-ready-to-run-a-marathon-8598743)
- Runner's World SA, program half marathon pemula 12 minggu (prasyarat): [runnersworld.co.za](https://www.runnersworld.co.za/training/12-week-half-marathon-plan-beginners/) · [arsip](https://web.archive.org/web/20260316212751/https://www.runnersworld.co.za/training/12-week-half-marathon-plan-beginners/)
- Marathon Handbook, program half marathon: [marathonhandbook.com](https://marathonhandbook.com/trainingplans/half-marathon-training-plans/)
- Peloton, berapa lama latihan untuk maraton: [onepeloton.com](https://www.onepeloton.com/en-GB/blog/how-long-does-it-take-to-train-for-a-marathon)
- iRunFar, pemulihan dan latihan di antara lomba: [irunfar.com](https://www.irunfar.com/quick-turnarounds-recover-and-train-during-a-full-race-season)
- Pfitzinger tentang 8–12 minggu di antara maraton, **kutipan sekunder** lewat blog Chia Charge: [chiacharge.co.uk](https://www.chiacharge.co.uk/blogs/news/how-long-should-you-rest-between-marathons)
- Active.com, program 5K menengah 7 minggu: [active.com](https://www.active.com/running/articles/intermediate-5k-training-plan-7-weeks)

## Beban & kesiapan

- **Foster C., Florhaug J. A., Franklin J., dkk. (2001).** A new approach to monitoring exercise training. *J Strength Cond Res* 15(1):109–115. [doi:10.1519/00124278-200102000-00019](https://doi.org/10.1519/00124278-200102000-00019)
  `Controlled study` · Session-RPE = RPE sesi (CR-10) × menit, untuk beban ST di 7 hari terakhir ([§5](TRAINING-LOGIC.md#session-rpe-st-0141)).
- **Haddad M., Stylianides G., Djaoui L., dkk. (2017).** Session-RPE method for training load monitoring: validity, ecological usefulness, and influencing factors. *Front Neurosci* 11:612. [doi:10.3389/fnins.2017.00612](https://doi.org/10.3389/fnins.2017.00612)
  `Narrative review` · Session-RPE valid untuk latihan beban ([§5](TRAINING-LOGIC.md#session-rpe-st-0141)).
- **Saw A. E., Main L. C., Gastin P. B. (2016).** Monitoring the athlete training response: subjective self-reported measures trump commonly used objective measures: a systematic review. *Br J Sports Med* 50(5):281–291. [doi:10.1136/bjsports-2015-094758](https://doi.org/10.1136/bjsports-2015-094758)
  `Systematic review` · Check-in harian: pegal ≥ 7/10 menurunkan satu level ([§5](TRAINING-LOGIC.md#check-in-harian-0152)).
- **McLean B. D., Coutts A. J., Kelly V., dkk. (2010).** Neuromuscular, endocrine, and perceptual fatigue responses during different length between-match microcycles in professional rugby league players. *Int J Sports Physiol Perform* 5(3):367–383. [doi:10.1123/ijspp.5.3.367](https://doi.org/10.1123/ijspp.5.3.367)
  `Observational` · Kuesioner wellness (pegal, tidur, mood) di check-in ([§5](TRAINING-LOGIC.md#check-in-harian-0152)).
- **Hooper S. L., Mackinnon L. T. (1995).** Monitoring overtraining in athletes: recommendations. *Sports Med* 20(5):321–327. [doi:10.2165/00007256-199520050-00003](https://doi.org/10.2165/00007256-199520050-00003)
  `Narrative review` · Kuesioner wellness di check-in ([§5](TRAINING-LOGIC.md#check-in-harian-0152)).
- **Plews D. J., Laursen P. B., Kilding A. E., Buchheit M. (2012).** Heart rate variability in elite triathletes, is variation in variability the key to effective training? A case comparison. *Eur J Appl Physiol* 112(11):3729–3741. [doi:10.1007/s00421-012-2354-4](https://doi.org/10.1007/s00421-012-2354-4)
  `Observational` · Ambang HRV pribadi: rata-rata 7 hari ln rMSSD dibanding baseline 30 hari ([§5](TRAINING-LOGIC.md#ambang-pribadi-0152)).
- **Plews D. J., Laursen P. B., Stanley J., dkk. (2013).** Training adaptation and heart rate variability in elite endurance athletes: opening the door to effective monitoring. *Sports Med* 43(9):773–781. [doi:10.1007/s40279-013-0071-8](https://doi.org/10.1007/s40279-013-0071-8)
  `Narrative review` · Smallest worthwhile change 0,5 SD untuk penurunan HRV ([§5](TRAINING-LOGIC.md#ambang-pribadi-0152)).

Ambang resting HR pribadi (rata-rata 30 hari + maks(1 SD, 3 bpm)) adalah **usulan aplikasi** yang dianalogikan dari HRV, tanpa sumber langsung. TRAINING-LOGIC §5 menandainya "dasar lebih lemah".

## Teknik & pemilihan gerakan

- **NSCA (2016).** *Exercise Technique Manual for Resistance Training*, 3rd ed. Human Kinetics.
  `Book` · Kebutuhan alat per gerakan dan cue teknik ([§9](TRAINING-LOGIC.md#9-setting-kondisi-zona-alat--gerakan)).
- **Ekstrom R. A., Donatelli R. A., Carp K. C. (2007).** Electromyographic analysis of core trunk, hip, and thigh muscles during 9 rehabilitation exercises. *J Orthop Sports Phys Ther* 37(12):754–762. [doi:10.2519/jospt.2007.2471](https://doi.org/10.2519/jospt.2007.2471)
  `Lab study` · Pemilihan gerakan stabilitas panggul dan core ([§10](TRAINING-LOGIC.md#10-gerakan-tambahan--media-09-0142)).
- **Distefano L. J., Blackburn J. T., Marshall S. W., Padua D. A. (2009).** Gluteal muscle activation during common therapeutic exercises. *J Orthop Sports Phys Ther* 39(7):532–540. [doi:10.2519/jospt.2009.2796](https://doi.org/10.2519/jospt.2009.2796)
  `Lab study` · Clamshell, Lateral Band Walk, dan single-leg deadlift untuk gluteus medius ([§10](TRAINING-LOGIC.md#10-gerakan-tambahan--media-09-0142)).
- **Dorn T. W., Schache A. G., Pandy M. G. (2012).** Muscular strategy shift in human running: dependence of running speed on hip and ankle muscle performance. *J Exp Biol* 215(13):2347. [doi:10.1242/jeb.075051](https://doi.org/10.1242/jeb.075051)
  `Lab study` · Peran betis dan pinggul pada kecepatan lari; pemilihan gerakan betis ([§10](TRAINING-LOGIC.md#10-gerakan-tambahan--media-09-0142)).
- **Reinold M. M., Wilk K. E., Fleisig G. S., dkk. (2004).** Electromyographic analysis of the rotator cuff and deltoid musculature during common shoulder external rotation exercises. *J Orthop Sports Phys Ther* 34(7):385–394. [doi:10.2519/jospt.2004.34.7.385](https://doi.org/10.2519/jospt.2004.34.7.385)
  `Lab study` · Gerakan rotasi eksternal bahu ([§10](TRAINING-LOGIC.md#10-gerakan-tambahan--media-09-0142)).

## Ringkasan per tingkat bukti

| Label | Jumlah | Sumber |
| --- | --- | --- |
| Guideline | 5 | Willy 2019 (PFP CPG), Crossley 2016 (consensus), Martin 2014 (plantar CPG), NICE NG59, Diercks 2014 |
| Meta-analysis | 10 | Moesgaard 2022, Schoenfeld 2017, Wilson 2012, Schumann 2022, Llanos-Lagos 2024, de Carvalho e Silva 2022, Burt 2023, Lauersen 2014, Hayden 2021 (Cochrane), Bosquet 2007 |
| Systematic review | 5 | Kassiano 2022, Blagrove 2018, Winters 2013, Littlewood 2012, Saw 2016 |
| RCT | 3 | Helgerud 2007, Silbernagel 2007, Rathleff 2015 |
| Controlled study | 5 | Zourdos 2016, Rønnestad 2010, Willy & Davis 2011, Alfredson 1998, Foster 2001 |
| Lab study | 6 | Heiderscheit 2011, Meardon 2012, Ekstrom 2007, Distefano 2009, Dorn 2012, Reinold 2004 |
| Observational | 6 | Riegel 1981, Nielsen 2014, Fredericson 2000, Pettersson 2008, McLean 2010, Plews 2012 |
| Narrative review | 9 | Seiler 2010, Stöggl & Sperlich 2015, Rønnestad & Mujika 2014, Moen 2009, Mujika & Padilla 2003, Travis 2020, Haddad 2017, Hooper & Mackinnon 1995, Plews 2013 |
| Book | 9 | Daniels 2014, Daniels & Gilbert 1979, Friel 2016, Edwards 1993, NSCA Essentials 2016, Zatsiorsky 2020, McGill 2016, Bompa & Buzzichelli 2019, NSCA Exercise Technique Manual 2016 |
| Practitioner recommendation | 9 | Tabel panjang program & kesiapan lomba 0.13.3 |

Aturan keselamatan (katalog kondisi, batas beban, RPE ≤ 7, kenaikan long run) bersandar pada sumber Guideline, Meta-analysis, Systematic review, RCT, atau Book. Rekomendasi praktisi hanya dipakai untuk saran lama program yang tidak memblokir.

## Pemeriksaan tautan

Dicek 2026-11-02:
- **Seluruh 47 DOI terdaftar di Crossref.** Judul, tahun, jurnal, dan halaman di atas mengikuti data Crossref.
- **Penerbit yang menolak bot:** JOSPT, SAGE, Wiley, BMJ, Taylor & Francis, dan Company of Biologists menjawab 403 untuk pemeriksaan otomatis. Tautan DOI-nya tetap benar dan terbuka normal di browser.
- **Tidak bisa dijangkau dari pemeriksa:** REI dan Runner's World SA tidak menjawab dalam 45 detik. Tautan arsip Wayback (2026) ditambahkan.
- **Tanpa tautan:** Riegel 1981 (American Scientist tidak punya DOI) dan semua buku.
- **Koreksi dibanding dokumen sebelumnya:**
  - Artikel Frontiers 2015 ditulis Stöggl & Sperlich, bukan Seiler.
  - *Daniels' Running Formula* yang dipakai adalah edisi ke-3 (2014), sesuai kode `lib/run-zones.ts`; sebelumnya tertulis "ed. 4".
  - *NSCA Essentials* adalah edisi ke-4 (2016), sesuai katalog kondisi; sebelumnya tertulis "ed. 5".
  - Dorn 2012 terbit di nomor 13, bukan 11.
