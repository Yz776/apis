// /search/gsm-area — Lookup nomor HP Indonesia (operator) & kode area telepon kota (PSTN)
//
// Mendukung dua mode lookup:
// 1. Nomor HP mobile (08xxx / +628xxx / 628xxx)
//    → detect operator (Telkomsel, XL, Indosat, Tri, Smartfren, by.U, dll)
//    + tipe kartu (prepaid / postpaid) jika diketahui
// 2. Kode area telepon kota (021 / 022 / 031 / dst)
//    → nama kota + provinsi

// ─── Database prefix operator mobile Indonesia ──────────────────────────────────
// Sumber: UCC (Universal Cellular Code) yang dipublikasi regulator.
// Catatan: sejak kebijakan MNP (Mobile Number Portability), nomor bisa pindah
// operator tanpa ganti nomor, jadi hasil di sini = operator ASAL prefix
// (bukan operator saat ini yang dipakai user).
const OPERATORS = [
    // Telkomsel
    { prefix: "0811", operator: "Telkomsel", brand: "Kartu Halo (postpaid)", type: "postpaid" },
    { prefix: "0812", operator: "Telkomsel", brand: "Kartu Halo / simPATI", type: "postpaid/prepaid" },
    { prefix: "0813", operator: "Telkomsel", brand: "Kartu Halo / simPATI", type: "postpaid/prepaid" },
    { prefix: "0821", operator: "Telkomsel", brand: "simPATI", type: "prepaid" },
    { prefix: "0822", operator: "Telkomsel", brand: "simPATI", type: "prepaid" },
    { prefix: "0823", operator: "Telkomsel", brand: "simPATI / AS", type: "prepaid" },
    { prefix: "0851", operator: "Telkomsel", brand: "Kartu As / by.U", type: "prepaid" },
    { prefix: "0852", operator: "Telkomsel", brand: "Kartu As", type: "prepaid" },
    { prefix: "0853", operator: "Telkomsel", brand: "Kartu As", type: "prepaid" },

    // Indosat Ooredoo Hutchison
    { prefix: "0814", operator: "Indosat", brand: "IM3 / Matrix", type: "prepaid/postpaid" },
    { prefix: "0815", operator: "Indosat", brand: "IM3 / Matrix", type: "prepaid/postpaid" },
    { prefix: "0816", operator: "Indosat", brand: "IM3 / Matrix", type: "prepaid/postpaid" },
    { prefix: "0855", operator: "Indosat", brand: "IM3", type: "prepaid" },
    { prefix: "0856", operator: "Indosat", brand: "IM3", type: "prepaid" },
    { prefix: "0857", operator: "Indosat", brand: "IM3", type: "prepaid" },
    { prefix: "0858", operator: "Indosat", brand: "IM3 / Matrix", type: "prepaid/postpaid" },

    // XL Axiata
    { prefix: "0817", operator: "XL", brand: "XL Regular / Xplor", type: "prepaid/postpaid" },
    { prefix: "0818", operator: "XL", brand: "XL Regular / Xplor", type: "prepaid/postpaid" },
    { prefix: "0819", operator: "XL", brand: "XL Regular / Xplor", type: "prepaid/postpaid" },
    { prefix: "0859", operator: "XL", brand: "XL Regular", type: "prepaid" },
    { prefix: "0877", operator: "XL", brand: "XL Regular / AXIS (share network)", type: "prepaid" },
    { prefix: "0878", operator: "XL", brand: "XL Regular / AXIS (share network)", type: "prepaid" },

    // Axis (XL Axiata, brand terpisah)
    { prefix: "0831", operator: "AXIS", brand: "AXIS Regular", type: "prepaid" },
    { prefix: "0832", operator: "AXIS", brand: "AXIS Regular", type: "prepaid" },
    { prefix: "0833", operator: "AXIS", brand: "AXIS Regular", type: "prepaid" },
    { prefix: "0838", operator: "AXIS", brand: "AXIS Regular", type: "prepaid" },

    // Tri (Hutchison 3 Indonesia) — kini merge dengan Indosat
    { prefix: "0895", operator: "Tri (3)", brand: "Tri / 3 Regular", type: "prepaid" },
    { prefix: "0896", operator: "Tri (3)", brand: "Tri / 3 Regular", type: "prepaid" },
    { prefix: "0897", operator: "Tri (3)", brand: "Tri / 3 Regular", type: "prepaid" },
    { prefix: "0898", operator: "Tri (3)", brand: "Tri / 3 Regular", type: "prepaid" },
    { prefix: "0899", operator: "Tri (3)", brand: "Tri / 3 Regular", type: "prepaid" },

    // Smartfren
    { prefix: "0881", operator: "Smartfren", brand: "Smartfren Regular", type: "prepaid" },
    { prefix: "0882", operator: "Smartfren", brand: "Smartfren Regular", type: "prepaid" },
    { prefix: "0883", operator: "Smartfren", brand: "Smartfren Regular", type: "prepaid" },
    { prefix: "0884", operator: "Smartfren", brand: "Smartfren Regular", type: "prepaid" },
    { prefix: "0885", operator: "Smartfren", brand: "Smartfren Regular", type: "prepaid" },
    { prefix: "0886", operator: "Smartfren", brand: "Smartfren Regular", type: "prepaid" },
    { prefix: "0887", operator: "Smartfren", brand: "Smartfren Regular", type: "prepaid" },
    { prefix: "0888", operator: "Smartfren", brand: "Smartfren Regular", type: "prepaid" },
    { prefix: "0889", operator: "Smartfren", brand: "Smartfren Regular", type: "prepaid" },
]

// ─── Database kode area telepon kota (PSTN) Indonesia ────────────────────────────
// Sumber: ITU-T E.164 country code + numbering plan Nasional (Kemenkominfo).
const PSTN_AREAS = {
    // Sumatera
    "01": { region: "Sumatera", note: "Tidak digunakan sebagai kode area tunggal, lihat kode spesifik" },
    "021": { city: "Jakarta, Tangerang, Bekasi, Depok", provinsi: "DKI Jakarta / Banten / Jawa Barat", region: "Banten & DKI Jakarta" },
    "022": { city: "Bandung, Cimahi, Sumedang, Garut", provinsi: "Jawa Barat", region: "Jawa Barat" },
    "0231": { city: "Cirebon, Indramayu, Majalengka, Kuningan", provinsi: "Jawa Barat", region: "Jawa Barat" },
    "0232": { city: "Ciamis, Banjar, Pangandaran", provinsi: "Jawa Barat", region: "Jawa Barat" },
    "0233": { city: "Kuningan", provinsi: "Jawa Barat", region: "Jawa Barat" },
    "024": { city: "Semarang, Kendal, Demak, Salatiga", provinsi: "Jawa Tengah", region: "Jawa Tengah" },
    "0251": { city: "Bogor, Sukabumi, Cianjur", provinsi: "Jawa Barat", region: "Jawa Barat" },
    "0252": { city: "Sukabumi", provinsi: "Jawa Barat", region: "Jawa Barat" },
    "0253": { city: "Cianjur", provinsi: "Jawa Barat", region: "Jawa Barat" },
    "0260": { city: "Soreang, Bandung Selatan", provinsi: "Jawa Barat", region: "Jawa Barat" },
    "0261": { city: "Sumedang", provinsi: "Jawa Barat", region: "Jawa Barat" },
    "0262": { city: "Garut", provinsi: "Jawa Barat", region: "Jawa Barat" },
    "0263": { city: "Subang, Purwakarta, Karawang", provinsi: "Jawa Barat", region: "Jawa Barat" },
    "0264": { city: "Cilegon, Serang, Anyer", provinsi: "Banten", region: "Banten" },
    "0265": { city: "Tasikmalaya, Ciamis, Banjar", provinsi: "Jawa Barat", region: "Jawa Barat" },
    "0266": { city: "Pangandaran", provinsi: "Jawa Barat", region: "Jawa Barat" },
    "0267": { city: "Karawang, Bekasi (utara)", provinsi: "Jawa Barat", region: "Jawa Barat" },
    "0271": { city: "Solo (Surakarta), Sukoharjo, Boyolali, Karanganyar, Sragen, Wonogiri, Klaten", provinsi: "Jawa Tengah", region: "Jawa Tengah" },
    "0272": { city: "Klaten", provinsi: "Jawa Tengah", region: "Jawa Tengah" },
    "0273": { city: "Wonogiri", provinsi: "Jawa Tengah", region: "Jawa Tengah" },
    "0274": { city: "Yogyakarta, Sleman, Bantul, Gunung Kidul, Kulon Progo", provinsi: "DI Yogyakarta", region: "DI Yogyakarta" },
    "0275": { city: "Purwokerto, Banyumas, Cilacap, Purbalingga, Banjarnegara", provinsi: "Jawa Tengah", region: "Jawa Tengah" },
    "0276": { city: "Kebumen", provinsi: "Jawa Tengah", region: "Jawa Tengah" },
    "0277": { city: "Tegal, Brebes, Tegal", provinsi: "Jawa Tengah", region: "Jawa Tengah" },
    "0278": { city: "Pemalang, Batang", provinsi: "Jawa Tengah", region: "Jawa Tengah" },
    "0279": { city: "Pekalongan, Pekalongan Selatan", provinsi: "Jawa Tengah", region: "Jawa Tengah" },
    "0280": { city: "Magelang, Temanggung", provinsi: "Jawa Tengah", region: "Jawa Tengah" },
    "0281": { city: "Kudus, Jepara", provinsi: "Jawa Tengah", region: "Jawa Tengah" },
    "0282": { city: "Pati, Rembang, Blora", provinsi: "Jawa Tengah", region: "Jawa Tengah" },
    "0283": { city: "Blora", provinsi: "Jawa Tengah", region: "Jawa Tengah" },
    "0284": { city: "Purwodadi, Grobogan", provinsi: "Jawa Tengah", region: "Jawa Tengah" },
    "0285": { city: "Tegal, Slawi", provinsi: "Jawa Tengah", region: "Jawa Tengah" },
    "0286": { city: "Banjarnegara, Wonosobo", provinsi: "Jawa Tengah", region: "Jawa Tengah" },
    "0287": { city: "Kebumen", provinsi: "Jawa Tengah", region: "Jawa Tengah" },
    "0288": { city: "Tegal", provinsi: "Jawa Tengah", region: "Jawa Tengah" },
    "0289": { city: "Cilacap", provinsi: "Jawa Tengah", region: "Jawa Tengah" },
    "0290": { city: "Bumiayu, Baturaden", provinsi: "Jawa Tengah", region: "Jawa Tengah" },
    "0291": { city: "Pemalang", provinsi: "Jawa Tengah", region: "Jawa Tengah" },
    "0292": { city: "Brebes", provinsi: "Jawa Tengah", region: "Jawa Tengah" },
    "0293": { city: "Tegal, Slawi", provinsi: "Jawa Tengah", region: "Jawa Tengah" },
    "031": { city: "Surabaya, Sidoarjo, Gresik, Bangkalan", provinsi: "Jawa Timur", region: "Jawa Timur" },
    "0321": { city: "Mojokerto, Jombang, Lamongan", provinsi: "Jawa Timur", region: "Jawa Timur" },
    "0322": { city: "Batu, Malang (utara)", provinsi: "Jawa Timur", region: "Jawa Timur" },
    "0323": { city: "Kediri, Nganjuk, Tulungagung, Trenggalek, Blitar", provinsi: "Jawa Timur", region: "Jawa Timur" },
    "0324": { city: "Blitar", provinsi: "Jawa Timur", region: "Jawa Timur" },
    "0325": { city: "Madiun, Ngawi, Magetan, Ponorogo, Pacitan", provinsi: "Jawa Timur", region: "Jawa Timur" },
    "0326": { city: "Bojonegoro, Tuban, Lamongan", provinsi: "Jawa Timur", region: "Jawa Timur" },
    "0327": { city: "Jember, Banyuwangi, Bondowoso, Situbondo", provinsi: "Jawa Timur", region: "Jawa Timur" },
    "0328": { city: "Banyuwangi", provinsi: "Jawa Timur", region: "Jawa Timur" },
    "0329": { city: "Bali (lalu lihat 0361/0362/0363/0365/0366)", provinsi: "Bali", region: "Bali" },
    "0331": { city: "Jember", provinsi: "Jawa Timur", region: "Jawa Timur" },
    "0332": { city: "Probolinggo, Lumajang, Kraksaan", provinsi: "Jawa Timur", region: "Jawa Timur" },
    "0333": { city: "Bondowoso, Situbondo", provinsi: "Jawa Timur", region: "Jawa Timur" },
    "0334": { city: "Sumenep, Pamekasan (Madura)", provinsi: "Jawa Timur", region: "Madura" },
    "0335": { city: "Sampang, Bangkalan (Madura)", provinsi: "Jawa Timur", region: "Madura" },
    "0338": { city: "Bali (Pulau Lombok)", provinsi: "NTB", region: "Nusa Tenggara Barat" },
    "0341": { city: "Kediri", provinsi: "Jawa Timur", region: "Jawa Timur" },
    "0342": { city: "Nganjuk", provinsi: "Jawa Timur", region: "Jawa Timur" },
    "0343": { city: "Tulungagung, Trenggalek", provinsi: "Jawa Timur", region: "Jawa Timur" },
    "0351": { city: "Madiun", provinsi: "Jawa Timur", region: "Jawa Timur" },
    "0352": { city: "Ponorogo, Pacitan", provinsi: "Jawa Timur", region: "Jawa Timur" },
    "0353": { city: "Bojonegoro", provinsi: "Jawa Timur", region: "Jawa Timur" },
    "0354": { city: "Tuban", provinsi: "Jawa Timur", region: "Jawa Timur" },
    "0355": { city: "Lamongan", provinsi: "Jawa Timur", region: "Jawa Timur" },
    "0356": { city: "Sidoarjo", provinsi: "Jawa Timur", region: "Jawa Timur" },
    "0357": { city: "Gresik", provinsi: "Jawa Timur", region: "Jawa Timur" },
    "0358": { city: "Mojokerto, Jombang", provinsi: "Jawa Timur", region: "Jawa Timur" },
    "0361": { city: "Denpasar, Badung, Gianyar, Tabanan", provinsi: "Bali", region: "Bali" },
    "0362": { city: "Singaraja, Buleleng (Bali utara)", provinsi: "Bali", region: "Bali" },
    "0363": { city: "Karangasem, Klungkung (Bali timur)", provinsi: "Bali", region: "Bali" },
    "0365": { city: "Negara, Jembrana (Bali barat)", provinsi: "Bali", region: "Bali" },
    "0366": { city: "Tabanan", provinsi: "Bali", region: "Bali" },
    "0370": { city: "Mataram, Lombok Barat, Lombok Tengah", provinsi: "NTB", region: "Nusa Tenggara Barat" },
    "0371": { city: "Mataram", provinsi: "NTB", region: "Nusa Tenggara Barat" },
    "0372": { city: "Sumbawa, Bima", provinsi: "NTB", region: "Nusa Tenggara Barat" },
    "0373": { city: "Dompu", provinsi: "NTB", region: "Nusa Tenggara Barat" },
    "0374": { city: "Sumbawa Besar", provinsi: "NTB", region: "Nusa Tenggara Barat" },
    "0375": { city: "Bima", provinsi: "NTB", region: "Nusa Tenggara Barat" },
    "0376": { city: "Lombok Timur", provinsi: "NTB", region: "Nusa Tenggara Barat" },
    "0380": { city: "Kupang, Kupang Tengah", provinsi: "NTT", region: "Nusa Tenggara Timur" },
    "0381": { city: "Kupang", provinsi: "NTT", region: "Nusa Tenggara Timur" },
    "0382": { city: "Ende", provinsi: "NTT", region: "Nusa Tenggara Timur" },
    "0383": { city: "Maumere, Sikka", provinsi: "NTT", region: "Nusa Tenggara Timur" },
    "0384": { city: "Larantuka, Flores Timur", provinsi: "NTT", region: "Nusa Tenggara Timur" },
    "0385": { city: "Ruteng, Manggarai", provinsi: "NTT", region: "Nusa Tenggara Timur" },
    "0386": { city: "Baa, Rotendao", provinsi: "NTT", region: "Nusa Tenggara Timur" },
    "0387": { city: "Kalabahi, Alor", provinsi: "NTT", region: "Nusa Tenggara Timur" },
    "0388": { city: "Waingapu, Sumba Timur", provinsi: "NTT", region: "Nusa Tenggara Timur" },
    "0389": { city: "Waikabubak, Sumba Barat", provinsi: "NTT", region: "Nusa Tenggara Timur" },

    // Sumatera
    "040": { city: "Palembang, Prabumulih, Banyuasin", provinsi: "Sumatera Selatan", region: "Sumatera" },
    "0411": { city: "Pangkal Pinang, Bangka", provinsi: "Kepulauan Bangka Belitung", region: "Sumatera" },
    "0413": { city: "Tanjungpinang, Bintan", provinsi: "Kepulauan Riau", region: "Sumatera" },
    "0414": { city: "Karimun, Tanjungbalai Karimun", provinsi: "Kepulauan Riau", region: "Sumatera" },
    "0415": { city: "Lingga, Daik", provinsi: "Kepulauan Riau", region: "Sumatera" },
    "0416": { city: "Natuna, Ranai", provinsi: "Kepulauan Riau", region: "Sumatera" },
    "0417": { city: "Singkep", provinsi: "Kepulauan Riau", region: "Sumatera" },
    "0431": { city: "Jambi, Muaro Jambi", provinsi: "Jambi", region: "Sumatera" },
    "0432": { city: "Sungai Penuh, Kerinci", provinsi: "Jambi", region: "Sumatera" },
    "0433": { city: "Bungo, Tebo", provinsi: "Jambi", region: "Sumatera" },
    "0434": { city: "Sarolangun, Merangin", provinsi: "Jambi", region: "Sumatera" },
    "0435": { city: "Batanghari, Muara Bulian", provinsi: "Jambi", region: "Sumatera" },
    "0436": { city: "Tanjung Jabung, Kuala Tungkal", provinsi: "Jambi", region: "Sumatera" },
    "0451": { city: "Pekanbaru, Siak, Kampar", provinsi: "Riau", region: "Sumatera" },
    "0452": { city: "Dumai", provinsi: "Riau", region: "Sumatera" },
    "0461": { city: "Padang, Pariaman, Padang Pariaman", provinsi: "Sumatera Barat", region: "Sumatera" },
    "0462": { city: "Bukittinggi, Agam, Tanah Datar", provinsi: "Sumatera Barat", region: "Sumatera" },
    "0463": { city: "Padang Panjang", provinsi: "Sumatera Barat", region: "Sumatera" },
    "0464": { city: "Payakumbuh, Limapuluh Kota", provinsi: "Sumatera Barat", region: "Sumatera" },
    "0465": { city: "Solok, Sawahlunto", provinsi: "Sumatera Barat", region: "Sumatera" },
    "0471": { city: "Bengkulu, Seluma", provinsi: "Bengkulu", region: "Sumatera" },
    "0472": { city: "Curup, Rejang Lebong", provinsi: "Bengkulu", region: "Sumatera" },
    "0473": { city: "Manna, Bengkulu Selatan", provinsi: "Bengkulu", region: "Sumatera" },
    "0474": { city: "Muko-muko", provinsi: "Bengkulu", region: "Sumatera" },
    "0491": { city: "Lampung, Bandar Lampung, Metro", provinsi: "Lampung", region: "Sumatera" },
    "0492": { city: "Liwa, Lampung Barat", provinsi: "Lampung", region: "Sumatera" },
    "0493": { city: "Tanjung Karang", provinsi: "Lampung", region: "Sumatera" },
    "0494": { city: "Kotabumi, Lampung Utara", provinsi: "Lampung", region: "Sumatera" },
    "0495": { city: "Menggala, Tulang Bawang", provinsi: "Lampung", region: "Sumatera" },
    "0496": { city: "Liwa", provinsi: "Lampung", region: "Sumatera" },
    "0497": { city: "Pringsewu, Tanggamus", provinsi: "Lampung", region: "Sumatera" },

    // Sumatera Utara & Aceh
    "0525": { city: "Sibolga, Tapanuli Tengah", provinsi: "Sumatera Utara", region: "Sumatera" },
    "0526": { city: "Tarutung, Tapanuli Utara", provinsi: "Sumatera Utara", region: "Sumatera" },
    "0527": { city: "Sipirok, Tapanuli Selatan", provinsi: "Sumatera Utara", region: "Sumatera" },
    "0528": { city: "Nias, Gunungsitoli", provinsi: "Sumatera Utara", region: "Sumatera" },
    "0539": { city: "Toba, Balige", provinsi: "Sumatera Utara", region: "Sumatera" },
    "0540": { city: "Dairi, Pakpak Bharat", provinsi: "Sumatera Utara", region: "Sumatera" },
    "0541": { city: "Kabanjahe, Karo", provinsi: "Sumatera Utara", region: "Sumatera" },
    "0542": { city: "Brastagi, Karo", provinsi: "Sumatera Utara", region: "Sumatera" },
    "0551": { city: "Lhokseumawe, Aceh Utara", provinsi: "Aceh", region: "Sumatera" },
    "0552": { city: "Sigli, Pidie", provinsi: "Aceh", region: "Sumatera" },
    "0553": { city: "Meulaboh, Aceh Barat", provinsi: "Aceh", region: "Sumatera" },
    "0554": { city: "Bireuen", provinsi: "Aceh", region: "Sumatera" },
    "0555": { city: "Takengon, Aceh Tengah", provinsi: "Aceh", region: "Sumatera" },
    "0556": { city: "Calang, Aceh Jaya", provinsi: "Aceh", region: "Sumatera" },
    "0557": { city: "Sinabang, Simeulue", provinsi: "Aceh", region: "Sumatera" },
    "0558": { city: "Tapaktuan, Aceh Selatan", provinsi: "Aceh", region: "Sumatera" },
    "0559": { city: "Kutacane, Aceh Tenggara", provinsi: "Aceh", region: "Sumatera" },
    "0561": { city: "Banda Aceh, Aceh Besar", provinsi: "Aceh", region: "Sumatera" },
    "0562": { city: "Sabang, Weh Island", provinsi: "Aceh", region: "Sumatera" },
    "0563": { city: "Langsa, Aceh Timur", provinsi: "Aceh", region: "Sumatera" },
    "0564": { city: "Idi, Aceh Timur", provinsi: "Aceh", region: "Sumatera" },
    "0570": { city: "Medan, Deli Serdang, Binjai", provinsi: "Sumatera Utara", region: "Sumatera" },
    "0571": { city: "Medan", provinsi: "Sumatera Utara", region: "Sumatera" },
    "0572": { city: "Tebing Tinggi", provinsi: "Sumatera Utara", region: "Sumatera" },
    "0573": { city: "Pematang Siantar", provinsi: "Sumatera Utara", region: "Sumatera" },
    "0574": { city: "Perdagangan, Asahan", provinsi: "Sumatera Utara", region: "Sumatera" },
    "0575": { city: "Kisaran, Batubara", provinsi: "Sumatera Utara", region: "Sumatera" },
    "0576": { city: "Rantau Prapat, Labuhanbatu", provinsi: "Sumatera Utara", region: "Sumatera" },
    "0577": { city: "Sidoranted, Tapanuli Selatan", provinsi: "Sumatera Utara", region: "Sumatera" },
    "0578": { city: "Gunung Tua, Padang Lawas Utara", provinsi: "Sumatera Utara", region: "Sumatera" },
    "0579": { city: "Tanjung Balai, Asahan", provinsi: "Sumatera Utara", region: "Sumatera" },

    // Kalimantan
    "0511": { city: "Banjarmasin, Banjarbaru, Banjar", provinsi: "Kalimantan Selatan", region: "Kalimantan" },
    "0512": { city: "Kandangan, Hulu Sungai Selatan", provinsi: "Kalimantan Selatan", region: "Kalimantan" },
    "0513": { city: "Banjarmasin", provinsi: "Kalimantan Selatan", region: "Kalimantan" },
    "0514": { city: "Barabai, Hulu Sungai Tengah", provinsi: "Kalimantan Selatan", region: "Kalimantan" },
    "0515": { city: "Rantau, Tapin", provinsi: "Kalimantan Selatan", region: "Kalimantan" },
    "0516": { city: "Marabahan, Barito Kuala", provinsi: "Kalimantan Selatan", region: "Kalimantan" },
    "0517": { city: "Amuntai, Hulu Sungai Utara", provinsi: "Kalimantan Selatan", region: "Kalimantan" },
    "0518": { city: "Tanjar, Tabalong", provinsi: "Kalimantan Selatan", region: "Kalimantan" },
    "0519": { city: "Kotabaru", provinsi: "Kalimantan Selatan", region: "Kalimantan" },
    "0521": { city: "Samarinda, Kutai Kartanegara", provinsi: "Kalimantan Timur", region: "Kalimantan" },
    "0522": { city: "Balikpapan", provinsi: "Kalimantan Timur", region: "Kalimantan" },
    "0523": { city: "Sangatta, Kutai Timur", provinsi: "Kalimantan Timur", region: "Kalimantan" },
    "0524": { city: "Tanjung Redeb, Berau", provinsi: "Kalimantan Timur", region: "Kalimantan" },
    "0528": { city: "Tarakan", provinsi: "Kalimantan Utara", region: "Kalimantan" },
    "0531": { city: "Pontianak, Kubu Raya", provinsi: "Kalimantan Barat", region: "Kalimantan" },
    "0532": { city: "Mempawah, Pontianak", provinsi: "Kalimantan Barat", region: "Kalimantan" },
    "0533": { city: "Sungai Raya, Bengkayang", provinsi: "Kalimantan Barat", region: "Kalimantan" },
    "0534": { city: "Singkawang, Sambas", provinsi: "Kalimantan Barat", region: "Kalimantan" },
    "0535": { city: "Sanggau, Kapuas Hulu", provinsi: "Kalimantan Barat", region: "Kalimantan" },
    "0536": { city: "Sintang, Melawi", provinsi: "Kalimantan Barat", region: "Kalimantan" },
    "0537": { city: "Ketapang", provinsi: "Kalimantan Barat", region: "Kalimantan" },
    "0543": { city: "Palangka Raya, Pulang Pisau", provinsi: "Kalimantan Tengah", region: "Kalimantan" },
    "0544": { city: "Pangkalan Bun, Kotawaringin Barat", provinsi: "Kalimantan Tengah", region: "Kalimantan" },
    "0545": { city: "Sampit, Kotawaringin Timur", provinsi: "Kalimantan Tengah", region: "Kalimantan" },
    "0546": { city: "Muara Teweh, Barito Utara", provinsi: "Kalimantan Tengah", region: "Kalimantan" },
    "0547": { city: "Buntok, Barito Selatan", provinsi: "Kalimantan Tengah", region: "Kalimantan" },
    "0548": { city: "Tamiang Layang, Barito Timur", provinsi: "Kalimantan Tengah", region: "Kalimantan" },
    "0549": { city: "Kualakurun, Gunung Mas", provinsi: "Kalimantan Tengah", region: "Kalimantan" },

    // Sulawesi
    "040": { city: "Palembang", provinsi: "Sumatera Selatan", region: "Sumatera" },
    "0421": { city: "Pangkalan Balai, Banyuasin", provinsi: "Sumatera Selatan", region: "Sumatera" },
    "0422": { city: "Lahat, Lahat", provinsi: "Sumatera Selatan", region: "Sumatera" },
    "0423": { city: "Prabumulih", provinsi: "Sumatera Selatan", region: "Sumatera" },
    "0424": { city: "Muara Enim", provinsi: "Sumatera Selatan", region: "Sumatera" },
    "0425": { city: "Baturaja, Ogan Komering Ulu", provinsi: "Sumatera Selatan", region: "Sumatera" },
    "0426": { city: "Kayu Agung, Ogan Komering Ilir", provinsi: "Sumatera Selatan", region: "Sumatera" },
    "0427": { city: "Martapura, Ogan Komering Ulu Timur", provinsi: "Sumatera Selatan", region: "Sumatera" },
    "0428": { city: "Belinyu, Bangka", provinsi: "Kepulauan Bangka Belitung", region: "Sumatera" },
    "0429": { city: "Toboali, Bangka Selatan", provinsi: "Kepulauan Bangka Belitung", region: "Sumatera" },
    "0430": { city: "Mentok, Bangka Barat", provinsi: "Kepulauan Bangka Belitung", region: "Sumatera" },
    "0432": { city: "Pangkalpinang", provinsi: "Kepulauan Bangka Belitung", region: "Sumatera" },
    "0433": { city: "Sungai Liat, Bangka Tengah", provinsi: "Kepulauan Bangka Belitung", region: "Sumatera" },
    "0434": { city: "Koba, Bangka Tengah", provinsi: "Kepulauan Bangka Belitung", region: "Sumatera" },
    "0435": { city: "Tanjung Pandan, Belitung", provinsi: "Kepulauan Bangka Belitung", region: "Sumatera" },
    "0436": { city: "Manggar, Belitung Timur", provinsi: "Kepulauan Bangka Belitung", region: "Sumatera" },
    "0441": { city: "Rengat, Indragiri Hulu", provinsi: "Riau", region: "Sumatera" },
    "0442": { city: "Siak Sri Indrapura, Siak", provinsi: "Riau", region: "Sumatera" },
    "0443": { city: "Selatpanjang, Kepulauan Meranti", provinsi: "Riau", region: "Sumatera" },
    "0444": { city: "Bagan Siapi-api, Rokan Hilir", provinsi: "Riau", region: "Sumatera" },
    "0445": { city: "Dumai", provinsi: "Riau", region: "Sumatera" },
    "0446": { city: "Rokan Hulu", provinsi: "Riau", region: "Sumatera" },
    "0453": { city: "Bengkalis", provinsi: "Riau", region: "Sumatera" },
    "0454": { city: "Siak", provinsi: "Riau", region: "Sumatera" },
    "0455": { city: "Tembilahan, Indragiri Hilir", provinsi: "Riau", region: "Sumatera" },
    "0456": { city: "Rengat", provinsi: "Riau", region: "Sumatera" },
    "0457": { city: "Pekanbaru (selatan)", provinsi: "Riau", region: "Sumatera" },
    "0458": { city: "Pekanbaru (utara)", provinsi: "Riau", region: "Sumatera" },

    // Sulawesi
    "0459": { city: "Tual, Maluku Tenggara", provinsi: "Maluku", region: "Maluku" },
    "0500": { city: "Baubau, Buton", provinsi: "Sulawesi Tenggara", region: "Sulawesi" },
    "0501": { city: "Kendari, Konawe", provinsi: "Sulawesi Tenggara", region: "Sulawesi" },
    "0502": { city: "Raha, Muna", provinsi: "Sulawesi Tenggara", region: "Sulawesi" },
    "0503": { city: "Wangi Wangi, Wakatobi", provinsi: "Sulawesi Tenggara", region: "Sulawesi" },
    "0510": { city: "Kolaka", provinsi: "Sulawesi Tenggara", region: "Sulawesi" },
    "0510a": { city: "Kolaka", provinsi: "Sulawesi Tenggara", region: "Sulawesi" },
    "0504": { city: "Unaaha, Konawe", provinsi: "Sulawesi Tenggara", region: "Sulawesi" },
    "0505": { city: "Andolo, Buton Selatan", provinsi: "Sulawesi Tenggara", region: "Sulawesi" },
    "0506": { city: "Buru, Namlea", provinsi: "Maluku", region: "Maluku" },
    "0507": { city: "Sanana, Kepulauan Sula", provinsi: "Maluku Utara", region: "Maluku" },
    "0508": { city: "Tahuna, Kepulauan Sangihe", provinsi: "Sulawesi Utara", region: "Sulawesi" },
    "0509": { city: "Melonguane, Talaud", provinsi: "Sulawesi Utara", region: "Sulawesi" },
    "0511a": { city: "Wakatobi", provinsi: "Sulawesi Tenggara", region: "Sulawesi" },
    "0520": { city: "Majene", provinsi: "Sulawesi Barat", region: "Sulawesi" },
    "0521": { city: "Polewali, Polewali Mandar", provinsi: "Sulawesi Barat", region: "Sulawesi" },
    "0522": { city: "Mamuju", provinsi: "Sulawesi Barat", region: "Sulawesi" },
    "0523": { city: "Central Sulawesi", provinsi: "Sulawesi Tengah", region: "Sulawesi" },
    "0524": { city: "Berau", provinsi: "Kalimantan Timur", region: "Kalimantan" },
    "0525": { city: "Tanjungselor, Bulungan", provinsi: "Kalimantan Utara", region: "Kalimantan" },
    "0526": { city: "Malinau", provinsi: "Kalimantan Utara", region: "Kalimantan" },
    "0527": { city: "Nunukan", provinsi: "Kalimantan Utara", region: "Kalimantan" },
    "0530": { city: "Pontianak", provinsi: "Kalimantan Barat", region: "Kalimantan" },
    "0531a": { city: "Pontianak", provinsi: "Kalimantan Barat", region: "Kalimantan" },
    "0532a": { city: "Mempawah", provinsi: "Kalimantan Barat", region: "Kalimantan" },
    "0533a": { city: "Bengkayang", provinsi: "Kalimantan Barat", region: "Kalimantan" },
    "0534a": { city: "Singkawang", provinsi: "Kalimantan Barat", region: "Kalimantan" },
    "0538": { city: "Putussibau, Kapuas Hulu", provinsi: "Kalimantan Barat", region: "Kalimantan" },
    "0542": { city: "Banjarmasin (utara)", provinsi: "Kalimantan Selatan", region: "Kalimantan" },
    "0543a": { city: "Palangka Raya", provinsi: "Kalimantan Tengah", region: "Kalimantan" },
    "0544a": { city: "Pangkalan Bun", provinsi: "Kalimantan Tengah", region: "Kalimantan" },
    "0545a": { city: "Sampit", provinsi: "Kalimantan Tengah", region: "Kalimantan" },
    "0548a": { city: "Kualakurun", provinsi: "Kalimantan Tengah", region: "Kalimantan" },
    "0550": { city: "Sukamara", provinsi: "Lampung", region: "Sumatera" },
    "0560": { city: "Tapaktuan", provinsi: "Aceh", region: "Sumatera" },
    "0561a": { city: "Banda Aceh", provinsi: "Aceh", region: "Sumatera" },
    "0562a": { city: "Sabang", provinsi: "Aceh", region: "Sumatera" },
    "0563a": { city: "Langsa", provinsi: "Aceh", region: "Sumatera" },
    "0564a": { city: "Lhokseumawe", provinsi: "Aceh", region: "Sumatera" },
    "0566": { city: "Meulaboh", provinsi: "Aceh", region: "Sumatera" },
    "0567": { city: "Subulussalam", provinsi: "Aceh", region: "Sumatera" },
    "0568": { city: "Calang", provinsi: "Aceh", region: "Sumatera" },
    "0569": { city: "Singkil", provinsi: "Aceh", region: "Sumatera" },
    "0570a": { city: "Medan", provinsi: "Sumatera Utara", region: "Sumatera" },
    "0571a": { city: "Medan", provinsi: "Sumatera Utara", region: "Sumatera" },
    "0572a": { city: "Tebing Tinggi", provinsi: "Sumatera Utara", region: "Sumatera" },
    "0573a": { city: "Pematang Siantar", provinsi: "Sumatera Utara", region: "Sumatera" },
    "0574a": { city: "Asahan", provinsi: "Sumatera Utara", region: "Sumatera" },
    "0575a": { city: "Kisaran", provinsi: "Sumatera Utara", region: "Sumatera" },
    "0576a": { city: "Rantau Prapat", provinsi: "Sumatera Utara", region: "Sumatera" },
    "0577a": { city: "Sibolga", provinsi: "Sumatera Utara", region: "Sumatera" },
    "0578a": { city: "Gunung Tua", provinsi: "Sumatera Utara", region: "Sumatera" },
    "0579a": { city: "Tanjung Balai", provinsi: "Sumatera Utara", region: "Sumatera" },

    // Sulawesi
    "0400": { city: "Makassar", provinsi: "Sulawesi Selatan", region: "Sulawesi" },
    "0410": { city: "Ambon", provinsi: "Maluku", region: "Maluku" },
    "0411a": { city: "Pangkal Pinang", provinsi: "Kepulauan Bangka Belitung", region: "Sumatera" },
    "0420": { city: "Manado", provinsi: "Sulawesi Utara", region: "Sulawesi" },
    "0421a": { city: "Manado", provinsi: "Sulawesi Utara", region: "Sulawesi" },
    "0422a": { city: "Bitung", provinsi: "Sulawesi Utara", region: "Sulawesi" },
    "0423a": { city: "Tomohon", provinsi: "Sulawesi Utara", region: "Sulawesi" },
    "0424a": { city: "Kotamobagu", provinsi: "Sulawesi Utara", region: "Sulawesi" },
    "0430a": { city: "Gorontalo", provinsi: "Gorontalo", region: "Sulawesi" },
    "0431a": { city: "Gorontalo", provinsi: "Gorontalo", region: "Sulawesi" },
    "0432a": { city: "Limboto", provinsi: "Gorontalo", region: "Sulawesi" },
    "0433a": { city: "Marisa, Pohuwato", provinsi: "Gorontalo", region: "Sulawesi" },
    "0434a": { city: "Tilamuta, Boalemo", provinsi: "Gorontalo", region: "Sulawesi" },
    "0438": { city: "Palu", provinsi: "Sulawesi Tengah", region: "Sulawesi" },
    "0439": { city: "Poso", provinsi: "Sulawesi Tengah", region: "Sulawesi" },
    "0440": { city: "Tolitoli", provinsi: "Sulawesi Tengah", region: "Sulawesi" },
    "0441a": { city: "Buol", provinsi: "Sulawesi Tengah", region: "Sulawesi" },
    "0442a": { city: "Banggai", provinsi: "Sulawesi Tengah", region: "Sulawesi" },
    "0443a": { city: "Luwuk", provinsi: "Sulawesi Tengah", region: "Sulawesi" },
    "0444a": { city: "Bunta", provinsi: "Sulawesi Tengah", region: "Sulawesi" },
    "0445a": { city: "Donggala", provinsi: "Sulawesi Tengah", region: "Sulawesi" },
    "0446a": { city: "Parigi", provinsi: "Sulawesi Tengah", region: "Sulawesi" },
    "0447a": { city: "Balaesang", provinsi: "Sulawesi Tengah", region: "Sulawesi" },
    "0448a": { city: "Palu (selatan)", provinsi: "Sulawesi Tengah", region: "Sulawesi" },
    "0449": { city: "Pare-Pare", provinsi: "Sulawesi Selatan", region: "Sulawesi" },
    "0450": { city: "Makassar", provinsi: "Sulawesi Selatan", region: "Sulawesi" },
    "0451a": { city: "Pekanbaru", provinsi: "Riau", region: "Sumatera" },
    "0452a": { city: "Dumai", provinsi: "Riau", region: "Sumatera" },
    "0453a": { city: "Bengkalis", provinsi: "Riau", region: "Sumatera" },
    "0454a": { city: "Siak", provinsi: "Riau", region: "Sumatera" },
    "0455a": { city: "Tembilahan", provinsi: "Riau", region: "Sumatera" },
    "0456a": { city: "Rengat", provinsi: "Riau", region: "Sumatera" },
    "0457a": { city: "Pekanbaru (selatan)", provinsi: "Riau", region: "Sumatera" },
    "0458a": { city: "Pekanbaru (utara)", provinsi: "Riau", region: "Sumatera" },
    "0460": { city: "Makassar (selatan)", provinsi: "Sulawesi Selatan", region: "Sulawesi" },
    "0461a": { city: "Padang", provinsi: "Sumatera Barat", region: "Sumatera" },
    "0462a": { city: "Bukittinggi", provinsi: "Sumatera Barat", region: "Sumatera" },
    "0463a": { city: "Padang Panjang", provinsi: "Sumatera Barat", region: "Sumatera" },
    "0464a": { city: "Payakumbuh", provinsi: "Sumatera Barat", region: "Sumatera" },
    "0465a": { city: "Solok", provinsi: "Sumatera Barat", region: "Sumatera" },
    "0466": { city: "Sijunjung", provinsi: "Sumatera Barat", region: "Sumatera" },
    "0467": { city: "Painan, Pesisir Selatan", provinsi: "Sumatera Barat", region: "Sumatera" },
    "0468": { city: "Mukomuko", provinsi: "Bengkulu", region: "Sumatera" },
    "0469": { city: "Mentawai", provinsi: "Sumatera Barat", region: "Sumatera" },
    "0470": { city: "Bengkulu", provinsi: "Bengkulu", region: "Sumatera" },
    "0471a": { city: "Bengkulu", provinsi: "Bengkulu", region: "Sumatera" },
    "0472a": { city: "Curup", provinsi: "Bengkulu", region: "Sumatera" },
    "0473a": { city: "Manna", provinsi: "Bengkulu", region: "Sumatera" },
    "0474a": { city: "Mukomuko", provinsi: "Bengkulu", region: "Sumatera" },
    "0475": { city: "Lahat", provinsi: "Sumatera Selatan", region: "Sumatera" },
    "0476": { city: "Muara Enim", provinsi: "Sumatera Selatan", region: "Sumatera" },
    "0477": { city: "Baturaja", provinsi: "Sumatera Selatan", region: "Sumatera" },
    "0478": { city: "Martapura", provinsi: "Sumatera Selatan", region: "Sumatera" },
    "0479": { city: "Palembang (utara)", provinsi: "Sumatera Selatan", region: "Sumatera" },
    "0480": { city: "Prabumulih", provinsi: "Sumatera Selatan", region: "Sumatera" },
    "0481": { city: "Pangkalan Balai", provinsi: "Sumatera Selatan", region: "Sumatera" },
    "0482": { city: "Sekayu, Musi Banyuasin", provinsi: "Sumatera Selatan", region: "Sumatera" },
    "0483": { city: "Kayu Agung", provinsi: "Sumatera Selatan", region: "Sumatera" },
    "0484": { city: "Indralaya, Ogan Ilir", provinsi: "Sumatera Selatan", region: "Sumatera" },
    "0485": { city: "Tanjung Rajak, Banyuasin", provinsi: "Sumatera Selatan", region: "Sumatera" },
    "0486": { city: "Belinyu", provinsi: "Kepulauan Bangka Belitung", region: "Sumatera" },
    "0487": { city: "Toboali", provinsi: "Kepulauan Bangka Belitung", region: "Sumatera" },
    "0488": { city: "Mentok", provinsi: "Kepulauan Bangka Belitung", region: "Sumatera" },
    "0489": { city: "Pangkalpinang", provinsi: "Kepulauan Bangka Belitung", region: "Sumatera" },
    "0490": { city: "Sungai Liat", provinsi: "Kepulauan Bangka Belitung", region: "Sumatera" },
    "0491a": { city: "Bandar Lampung", provinsi: "Lampung", region: "Sumatera" },
    "0492a": { city: "Liwa", provinsi: "Lampung", region: "Sumatera" },
    "0493a": { city: "Tanjung Karang", provinsi: "Lampung", region: "Sumatera" },
    "0494a": { city: "Kotabumi", provinsi: "Lampung", region: "Sumatera" },
    "0495a": { city: "Menggala", provinsi: "Lampung", region: "Sumatera" },
    "0496a": { city: "Liwa", provinsi: "Lampung", region: "Sumatera" },
    "0497a": { city: "Pringsewu", provinsi: "Lampung", region: "Sumatera" },
    "0498": { city: "Metro", provinsi: "Lampung", region: "Sumatera" },
    "0499": { city: "Liwa", provinsi: "Lampung", region: "Sumatera" },

    // Sulawesi Selatan
    "0401": { city: "Watansoppeng, Soppeng", provinsi: "Sulawesi Selatan", region: "Sulawesi" },
    "0402": { city: "Sinjai", provinsi: "Sulawesi Selatan", region: "Sulawesi" },
    "0403": { city: "Bulukumba", provinsi: "Sulawesi Selatan", region: "Sulawesi" },
    "0404": { city: "Bantaeng", provinsi: "Sulawesi Selatan", region: "Sulawesi" },
    "0405": { city: "Jeneponto", provinsi: "Sulawesi Selatan", region: "Sulawesi" },
    "0406": { city: "Takalar", provinsi: "Sulawesi Selatan", region: "Sulawesi" },
    "0407": { city: "Maros", provinsi: "Sulawesi Selatan", region: "Sulawesi" },
    "0408": { city: "Pangkajene, Pangkep", provinsi: "Sulawesi Selatan", region: "Sulawesi" },
    "0409": { city: "Barru", provinsi: "Sulawesi Selatan", region: "Sulawesi" },
    "0410a": { city: "Bone, Watampone", provinsi: "Sulawesi Selatan", region: "Sulawesi" },
    "0411b": { city: "Sengkang, Wajo", provinsi: "Sulawesi Selatan", region: "Sulawesi" },
    "0412": { city: "Wajo", provinsi: "Sulawesi Selatan", region: "Sulawesi" },
    "0413a": { city: "Pare-Pare", provinsi: "Sulawesi Selatan", region: "Sulawesi" },
    "0414a": { city: "Pinrang", provinsi: "Sulawesi Selatan", region: "Sulawesi" },
    "0415a": { city: "Majene", provinsi: "Sulawesi Barat", region: "Sulawesi" },
    "0416a": { city: "Polewali", provinsi: "Sulawesi Barat", region: "Sulawesi" },
    "0417a": { city: "Mamuju", provinsi: "Sulawesi Barat", region: "Sulawesi" },
    "0418": { city: "Makassar (selatan)", provinsi: "Sulawesi Selatan", region: "Sulawesi" },
    "0419": { city: "Malino, Gowa", provinsi: "Sulawesi Selatan", region: "Sulawesi" },
    "0420a": { city: "Tana Toraja, Makale", provinsi: "Sulawesi Selatan", region: "Sulawesi" },
    "0421b": { city: "Tana Toraja", provinsi: "Sulawesi Selatan", region: "Sulawesi" },
    "0422b": { city: "Enrekang", provinsi: "Sulawesi Selatan", region: "Sulawesi" },
    "0423b": { city: "Pare-Pare (utara)", provinsi: "Sulawesi Selatan", region: "Sulawesi" },
    "0426a": { city: "Sidrap, Pangkajene", provinsi: "Sulawesi Selatan", region: "Sulawesi" },
    "0427a": { city: "Soppeng", provinsi: "Sulawesi Selatan", region: "Sulawesi" },
    "0428a": { city: "Barru (utara)", provinsi: "Sulawesi Selatan", region: "Sulawesi" },
    "0429a": { city: "Sinjai", provinsi: "Sulawesi Selatan", region: "Sulawesi" },

    // Maluku & Papua
    "0910": { city: "Ambon", provinsi: "Maluku", region: "Maluku" },
    "0911": { city: "Ambon, Lease Islands", provinsi: "Maluku", region: "Maluku" },
    "0912": { city: "Tual, Kai Islands", provinsi: "Maluku", region: "Maluku" },
    "0913": { city: "Namlea, Buru", provinsi: "Maluku", region: "Maluku" },
    "0914": { city: "Masohi, Seram", provinsi: "Maluku", region: "Maluku" },
    "0915": { city: "Taniwel, Seram Barat", provinsi: "Maluku", region: "Maluku" },
    "0916": { city: "Piru, Seram Barat", provinsi: "Maluku", region: "Maluku" },
    "0917": { city: "Dataran Honipopu, Seram", provinsi: "Maluku", region: "Maluku" },
    "0918": { city: "Amahai, Seram Utara", provinsi: "Maluku", region: "Maluku" },
    "0919": { city: "Banda, Banda Islands", provinsi: "Maluku", region: "Maluku" },
    "0920": { city: "Saparua, Lease Islands", provinsi: "Maluku", region: "Maluku" },
    "0921": { city: "Haruku, Lease Islands", provinsi: "Maluku", region: "Maluku" },
    "0922": { city: "Nusalaut, Lease Islands", provinsi: "Maluku", region: "Maluku" },
    "0923": { city: "Wahai, Seram Utara", provinsi: "Maluku", region: "Maluku" },
    "0924": { city: "Tanjung Pelayeman, Manipa", provinsi: "Maluku", region: "Maluku" },
    "0925": { city: "Tepa, Babar", provinsi: "Maluku", region: "Maluku" },
    "0926": { city: "Saumlaki, Yamdena", provinsi: "Maluku", region: "Maluku" },
    "0927": { city: "Wonreli, Kisar", provinsi: "Maluku", region: "Maluku" },
    "0928": { city: "Dobo, Aru Islands", provinsi: "Maluku", region: "Maluku" },
    "0929": { city: "Moa, Leti, Moa", provinsi: "Maluku", region: "Maluku" },
    "0930": { city: "Ternate", provinsi: "Maluku Utara", region: "Maluku" },
    "0931": { city: "Ternate", provinsi: "Maluku Utara", region: "Maluku" },
    "0932": { city: "Tidore", provinsi: "Maluku Utara", region: "Maluku" },
    "0933": { city: "Bacan, Halmahera Selatan", provinsi: "Maluku Utara", region: "Maluku" },
    "0934": { city: "Labuha, Halmahera Selatan", provinsi: "Maluku Utara", region: "Maluku" },
    "0935": { city: "Daruba, Morotai", provinsi: "Maluku Utara", region: "Maluku" },
    "0936": { city: "Tobelo, Halmahera Utara", provinsi: "Maluku Utara", region: "Maluku" },
    "0937": { city: "Kao, Halmahera Utara", provinsi: "Maluku Utara", region: "Maluku" },
    "0938": { city: "Daruba", provinsi: "Maluku Utara", region: "Maluku" },
    "0939": { city: "Tobelo (selatan)", provinsi: "Maluku Utara", region: "Maluku" },
    "0940": { city: "Wedaha, Halmahera Tengah", provinsi: "Maluku Utara", region: "Maluku" },
    "0941": { city: "Maba, Halmahera Timur", provinsi: "Maluku Utara", region: "Maluku" },
    "0942": { city: "Buli, Halmahera Timur", provinsi: "Maluku Utara", region: "Maluku" },
    "0943": { city: "Tahane, Halmahera Barat", provinsi: "Maluku Utara", region: "Maluku" },
    "0944": { city: "Jailolo, Halmahera Barat", provinsi: "Maluku Utara", region: "Maluku" },
    "0945": { city: "Ternate (selatan)", provinsi: "Maluku Utara", region: "Maluku" },
    "0946": { city: "Sanana, Sula", provinsi: "Maluku Utara", region: "Maluku" },
    "0947": { city: "Lekalaba, Halmahera Selatan", provinsi: "Maluku Utara", region: "Maluku" },
    "0948": { city: "Sofifi", provinsi: "Maluku Utara", region: "Maluku" },
    "0949": { city: "Tidore (selatan)", provinsi: "Maluku Utara", region: "Maluku" },
    "0951": { city: "Sorong", provinsi: "Papua Barat", region: "Papua" },
    "0952": { city: "Teminabuan, Sorong Selatan", provinsi: "Papua Barat", region: "Papua" },
    "0953": { city: "Bintuni, Teluk Bintuni", provinsi: "Papua Barat", region: "Papua" },
    "0954": { city: "Fakfak", provinsi: "Papua Barat", region: "Papua" },
    "0955": { city: "Kaimana", provinsi: "Papua Barat", region: "Papua" },
    "0956": { city: "Raja Ampat, Waisai", provinsi: "Papua Barat", region: "Papua" },
    "0966": { city: "Manokwari", provinsi: "Papua Barat", region: "Papua" },
    "0967": { city: "Manokwari (selatan)", provinsi: "Papua Barat", region: "Papua" },
    "0968": { city: "Manokwari (utara)", provinsi: "Papua Barat", region: "Papua" },
    "0969": { city: "Bintuni", provinsi: "Papua Barat", region: "Papua" },
    "0971": { city: "Wamena, Jayawijaya", provinsi: "Papua", region: "Papua" },
    "0972": { city: "Tiom, Lanny Jaya", provinsi: "Papua", region: "Papua" },
    "0973": { city: "Karubaga, Tolikara", provinsi: "Papua", region: "Papua" },
    "0974": { city: "Kurima, Yahukimo", provinsi: "Papua", region: "Papua" },
    "0975": { city: "Sumurai, Puncak Jaya", provinsi: "Papua", region: "Papua" },
    "0976": { city: "Logotik, Tolikara", provinsi: "Papua", region: "Papua" },
    "0977": { city: "Elelim, Yalimo", provinsi: "Papua", region: "Papua" },
    "0978": { city: "Tingginap, Puncak Jaya", provinsi: "Papua", region: "Papua" },
    "0979": { city: "Bokondini", provinsi: "Papua", region: "Papua" },
    "0980": { city: "Mamugu, Pegunungan Bintang", provinsi: "Papua", region: "Papua" },
    "0981": { city: "Borme, Pegunungan Bintang", provinsi: "Papua", region: "Papua" },
    "0982": { city: "Oksibil, Pegunungan Bintang", provinsi: "Papua", region: "Papua" },
    "0983": { city: "Kiunggduk, Tolikara", provinsi: "Papua", region: "Papua" },
    "0984": { city: "Abenaho, Yalimo", provinsi: "Papua", region: "Papua" },
    "0985": { city: "Wutung, Jayapura", provinsi: "Papua", region: "Papua" },
    "0986": { city: "Senggi, Jayapura", provinsi: "Papua", region: "Papua" },
    "0987": { city: "Arso, Jayapura", provinsi: "Papua", region: "Papua" },
    "0988": { city: "Skouw, Jayapura", provinsi: "Papua", region: "Papua" },
    "0989": { city: "Genyem, Jayapura", provinsi: "Papua", region: "Papua" },
    "0901": { city: "Jayapura", provinsi: "Papua", region: "Papua" },
    "0902": { city: "Sarmi", provinsi: "Papua", region: "Papua" },
    "0903": { city: "Wari, Paniai", provinsi: "Papua", region: "Papua" },
    "0904": { city: "Nabire", provinsi: "Papua", region: "Papua" },
    "0905": { city: "Enarotali", provinsi: "Papua", region: "Papua" },
    "0906": { city: "Sugapa, Intan Jaya", provinsi: "Papua", region: "Papua" },
    "0907": { city: "Tiggi, Paniai", provinsi: "Papua", region: "Papua" },
    "0908": { city: "Kokonao, Mimika", provinsi: "Papua", region: "Papua" },
    "0909": { city: "Mimika, Timika", provinsi: "Papua", region: "Papua" },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function normalizeNomor(input) {
    let n = (input || "").toString().trim()
    // Strip spaces, dashes, dots, parentheses
    n = n.replace(/[\s\-().]/g, "")
    // Convert +62 → 0
    if (n.startsWith("+62")) n = "0" + n.slice(3)
    else if (n.startsWith("62")) n = "0" + n.slice(2)
    return n
}

function lookupMobile(nomor) {
    // Try matching longest prefix first (0811, 0812, ... 0889)
    // Sorted by length desc to ensure 0811 matches before 08
    const sorted = [...OPERATORS].sort((a, b) => b.prefix.length - a.prefix.length)
    for (const op of sorted) {
        if (nomor.startsWith(op.prefix)) {
            return {
                type: "mobile",
                input: nomor,
                operator: op.operator,
                brand: op.brand,
                cardType: op.type,
                prefix: op.prefix,
                note: "Operator = operator ASAL prefix (sebelum MNP). Nomor bisa dipindah ke operator lain via Mobile Number Portability tanpa ganti nomor.",
            }
        }
    }
    return null
}

function lookupPSTN(nomor) {
    // PSTN starts with 0 + 1-3 digits area code
    // Try longest first (4 digit: 0XXX), then 3 (0XX), then 2 (0X)
    if (nomor.length < 3) return null
    const candidates = [
        nomor.slice(0, 4),
        nomor.slice(0, 3),
        nomor.slice(0, 2),
    ]
    for (const code of candidates) {
        if (PSTN_AREAS[code]) {
            return {
                type: "pstn",
                input: nomor,
                areaCode: code,
                ...PSTN_AREAS[code],
            }
        }
    }
    return null
}

export default {
    route: {
        method: "get",
        path: "/search/gsm-area",
        auth: false,
        tags: ["Search"],
        summary: "Cek nomor GSM/HP (operator) & kode area telepon kota (PSTN)",
        description:
            "Lookup nomor telepon Indonesia. Otomatis deteksi 2 mode:\n\n" +
            "**1. Nomor HP Mobile** (08xxx / +628xxx / 628xxx):\n" +
            "- Operator: Telkomsel, XL, Indosat, Tri (3), Smartfren, AXIS\n" +
            "- Brand: simPATI, Kartu As, IM3, XL Regular, by.U, dll\n" +
            "- Tipe kartu: prepaid / postpaid\n" +
            "- Contoh: `?nomor=081234567890`\n\n" +
            "**2. Kode area telepon kota / PSTN** (021 / 031 / 0274 / dll):\n" +
            "- Nama kota + provinsi\n" +
            "- Contoh: `?nomor=0211234567` (Jakarta), `?nomor=031` (Surabaya), `?nomor=0274` (Yogyakarta)\n\n" +
            "**Catatan MNP:** Sejak Mobile Number Portability, nomor HP bisa pindah operator tanpa ganti nomor, " +
            "jadi hasil `operator` = operator ASAL prefix (bukan operator yang sekarang dipakai user).",
        parameters: [
            {
                name: "nomor",
                in: "query",
                required: true,
                description: "Nomor telepon Indonesia. Format apa pun diterima: 08xxx, +628xxx, 628xxx, 021xxx, dll.",
                schema: { type: "string", example: "081234567890" },
            },
        ],
        responses: {
            "200": {
                description: "Hasil lookup nomor HP atau kode area kota",
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                ok: { type: "boolean", example: true },
                                result: {
                                    type: "object",
                                    properties: {
                                        type: { type: "string", enum: ["mobile", "pstn"] },
                                        input: { type: "string" },
                                        // For mobile:
                                        operator: { type: "string", description: "Operator ASAL prefix" },
                                        brand: { type: "string" },
                                        cardType: { type: "string" },
                                        prefix: { type: "string" },
                                        note: { type: "string" },
                                        // For PSTN:
                                        areaCode: { type: "string" },
                                        city: { type: "string" },
                                        provinsi: { type: "string" },
                                        region: { type: "string" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            "400": { description: "Parameter tidak valid" },
            "404": { description: "Nomor tidak dikenali" },
        },
    },

    handler: async (req, res) => {
        const { nomor } = req.query
        if (!nomor || !String(nomor).trim()) {
            return res.status(400).json({ ok: false, error: "nomor wajib diisi", hint: "Contoh: ?nomor=081234567890 (HP) atau ?nomor=021 (kode area Jakarta)" })
        }
        const normalized = normalizeNomor(nomor)
        if (!/^\d+$/.test(normalized)) {
            return res.status(400).json({ ok: false, error: "Nomor hanya boleh berisi angka (setelah normalisasi)", input: String(nomor) })
        }

        // Try mobile prefix first (08xxx)
        if (normalized.startsWith("08") && normalized.length >= 4) {
            const result = lookupMobile(normalized)
            if (result) {
                return res.json({ ok: true, result })
            }
        }

        // Try PSTN area code (0XX...)
        if (normalized.startsWith("0") && normalized.length >= 2) {
            const result = lookupPSTN(normalized)
            if (result) {
                return res.json({ ok: true, result })
            }
        }

        // Unknown
        return res.status(404).json({
            ok: false,
            error: "Nomor tidak dikenali sebagai nomor HP Indonesia atau kode area kota",
            input: String(nomor),
            normalized,
            hint: "Pastikan format benar: 08xxx (HP), +628xxx (HP internasional), atau 0XXX (kode area kota, mis. 021 Jakarta)",
        })
    },
}
