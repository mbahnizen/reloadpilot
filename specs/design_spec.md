# Spesifikasi Desain - ReloadPilot

Dokumen ini menjelaskan struktur desain dan antarmuka pengguna (UI/UX) ReloadPilot v1.2.0.

## Identitas Visual

- **Tema Utama**: Midnight Glass (gelap, modern, transparan parsial).
- **Warna Utama**: Deep Blue (`#2523a7`) & Bright Cyan (`#12c7f4`).
- **Latar Belakang**: Dark near-black (`#080c13`).
- Estetika UI tidak menggunakan warna hijau, kuning/oranye (kecuali untuk warning/pause), atau merah (kecuali untuk aksi destruktif).

## Struktur Layout Popup

Popup memiliki lebar yang dikunci (sekitar 360px) untuk menjaga konsistensi ekstensi, terdiri dari 3 tab utama:

### 1. Tab "Current"
Tab default yang berfokus pada halaman aktif.
- **Header**: Logo, nama ekstensi, dan Status Pill (Idle/Active/Paused).
- **Domain Info**: Menampilkan domain halaman secara besar dan URL penuh secara terpotong (truncated) untuk keterbacaan.
- **Active Status (jika aktif)**:
  - Countdown: "Next reload in MM:SS".
  - Progress bar yang terisi penuh menjelang waktu reload.
- **Control Panel**:
  - Input angka dan pemilih satuan interval (Sec/Min/Hr).
  - Tombol preset cepat (15s, 30s, 1m, 5m).
  - Tombol utama: "Start Reloading" (cyan) atau "Stop Reloading" (merah).

### 2. Tab "Bulk"
Dirancang untuk mengelola banyak URL sekaligus (misalnya untuk support desk).
- Input interval spesifik untuk URL bulk.
- Textarea besar untuk mendaftar URL (satu URL per baris).
- **Validasi Live**: Mengidentifikasi URL valid (`http`/`https`) dan URL tidak valid (misalnya tanpa protokol). URL tidak valid tetap berada di kotak teks setelah submit untuk dikoreksi.

### 3. Tab "Managed"
Daftar semua URL yang saat ini dikelola oleh ekstensi.
- **Global Control**: Tombol "Pause All" / "Resume All" untuk menangguhkan sementara timer tanpa menghapus URL.
- **Daftar URL**: Tiap baris menampilkan domain, URL, badge interval, tombol Edit (inline), dan tombol Delete.
- **Clear All**: Tombol opsional (dengan konfirmasi) untuk menghapus seluruh daftar pantauan.

## Halaman Options (Backup & Restore)

Halaman eksternal untuk mengelola data ekstensi:
- Layout Hero dengan informasi aplikasi dan versi.
- Fitur **Export JSON**: Menyimpan data `monitoredUrls` saat ini ke komputer lokal.
- Fitur **Import JSON**: Mengembalikan atau menggabungkan data dari backup JSON ke ekstensi.

## Strategi Countdown & Badge

### 1. Toolbar Badge
- Hanya muncul di **5 detik terakhir** sebelum halaman memuat ulang.
- Teks menghitung mundur: 5, 4, 3, 2, 1.
- Badge berlatar belakang Cyan (`#12c7f4`) dengan teks hitam (`#080c13`).
- Tidak aktif jika interval masih lama, untuk mencegah distraksi visual.

### 2. Popup Countdown
- Selalu terlihat jika tab yang dimonitor sedang aktif dan popup dibuka.
- Menampilkan sisa waktu pasti jika diketahui. Jika ekstensi baru saja di-load ulang atau timer dalam antrian panjang, mungkin akan menampilkan teks fallback "Reloading every Xs".

## Panduan Motion & Animasi

- Mengutamakan animasi halus dan linear.
- Durasi transisi elemen UI: 120ms - 160ms.
- Mendukung fitur OS `prefers-reduced-motion` untuk mematikan seluruh animasi ekstensi.
- Progress bar linear menuju cyan cerah (`#61efff`).
