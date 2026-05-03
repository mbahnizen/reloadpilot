# Feature Roadmap - ReloadPilot

Dokumen ini melacak fitur yang telah dirilis dan rencana pengembangan ReloadPilot di masa mendatang.

## v1.2.0 (Current Release) - Selesai ✅

- [x] Cleanup legacy content script (Zero-API architecture).
- [x] Polish interval inputs so UI min values feel consistent.
- [x] Improve Bulk Add validation feedback.
- [x] Disable Bulk Add when no valid URLs are available.
- [x] Add Options/About page.
- [x] Add managed URL export (JSON).
- [x] Add managed URL import (JSON).
- [x] Add Pause All / Resume All global controls.
- [x] Add manual test checklist.
- [x] Update documentation (README, CONTRIBUTING, CHANGELOG, LICENSE).

## Future Ideas (Backlog)

Berikut ini adalah fitur-fitur yang mungkin akan dieksplorasi di rilis berikutnya:

- [ ] **Tab Wakeup / Alarm**: Memberikan notifikasi suara (opsional) saat halaman selesai dimuat ulang (berguna untuk pemantauan antrian support).
- [ ] **Theme Toggle**: Pengaturan Light Mode untuk pengguna yang tidak menggunakan Dark Mode pada sistem operasi.
- [ ] **Wildcard URL Matching**: Kemampuan memonitor URL berdasarkan _pattern_ atau domain wildcard (misalnya `*.example.com/*`).
- [ ] **Auto-Pause on Inactivity**: Menjeda autorefresh secara otomatis jika browser tidak aktif untuk menghemat daya.
