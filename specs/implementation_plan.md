# Arsitektur Ekstensi - ReloadPilot

Dokumen ini mendeskripsikan arsitektur dan implementasi ReloadPilot saat ini (v1.2.0).

## Filosofi Desain

ReloadPilot dibangun dengan prinsip "Zero Content Script" dan efisiensi memori. Alih-alih menyuntikkan script berat ke setiap halaman, ReloadPilot sepenuhnya dikelola di level _background_ dan menggunakan API native browser saat dibutuhkan.

## Komponen Utama

### 1. Manifest (V3)
- **Permissions**: `storage`, `tabs`, `scripting`.
- **Host Permissions**: `*://*/*` (diperlukan untuk `scripting.executeScript`).
- **Background**: Berjalan sebagai `module` (`background.js`).
- **Popup & Options**: Disediakan sebagai halaman mandiri (UI).

### 2. Background Script (`background.js`)
Ini adalah _otak_ dari ekstensi.
- **State Management**:
  - `monitoredUrls`: Menyimpan URL yang dimonitor beserta intervalnya, disinkronkan dengan `browser.storage.local`.
  - `tabStates`: Map memory-only untuk melacak ID tab, `nextReloadAt`, dan timer badge untuk setiap tab aktif.
  - `isPaused`: Status global Pause All / Resume All.
- **Reload Mechanism**:
  - Menggunakan `browser.scripting.executeScript` untuk menyuntikkan `setTimeout` secara temporer yang akan memanggil `location.reload()`. Ini menjaga cache browser tetap berfungsi (soft refresh).
  - Tidak ada persistent content script yang tertinggal di halaman.
- **Badge Countdown**:
  - Untuk menghindari _memory leak_ dan beban UI, perhitungan mundur (countdown) pada badge ekstensi HANYA berjalan di **5 detik terakhir** sebelum reload.
  - Menggunakan native `browser.action.setBadgeText()`.

### 3. Popup UI (`popup/`)
- Antarmuka 3-tab:
  - **Current**: Konfigurasi interval untuk tab aktif. Sinkronisasi status timer (_Next reload in..._) dengan `background.js`.
  - **Bulk**: Menambahkan beberapa URL sekaligus dengan validasi otomatis (hanya `http`/`https`).
  - **Managed**: Daftar URL yang dimonitor, dilengkapi dengan tombol hapus dan fitur Edit Interval secara inline.
- UI tidak menyimpan _source of truth_ timer. Semua status `active`, `paused`, dan `nextReloadAt` diambil langsung dari _background script_ saat popup dibuka.

### 4. Options Page (`options/`)
- Halaman mandiri untuk mengelola backup.
- **Export**: Mengubah data `monitoredUrls` di local storage menjadi file JSON yang bisa diunduh.
- **Import**: Membaca file JSON, memvalidasi URL, dan menggabungkannya ke dalam state ekstensi.

## Komunikasi Data (Messaging)
Popup, Options, dan Background berkomunikasi melalui `browser.runtime.sendMessage()`.
Message types:
- `ADD_URL` / `REMOVE_URL`: Memodifikasi daftar monitor.
- `CLEAR_ALL`: Menghapus semua monitoring.
- `SET_PAUSED`: Pause/Resume monitoring global.
- `GET_TAB_STATUS`: Mengambil sisa waktu hitung mundur dari tab aktif untuk ditampilkan di UI.
- `RELOAD_STATE`: Memaksa sinkronisasi state dari local storage (dipanggil setelah import data).

## Lifecycle Tab
1. Pengguna membuka URL yang masuk dalam `monitoredUrls`.
2. Event `browser.tabs.onUpdated` (`status: complete`) terpicu.
3. Background script mengecek URL tab. Jika sesuai, timer reload di-_inject_ ke tab tersebut.
4. Timer badge di-_schedule_ untuk muncul 5 detik sebelum reload.
5. Jika tab ditutup (event `browser.tabs.onRemoved`), semua timer terkait tab tersebut akan dibersihkan dari `tabStates` untuk mencegah memory leak.
