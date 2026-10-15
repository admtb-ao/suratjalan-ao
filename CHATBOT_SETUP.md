# Admin AO Portal — Asisten Chatbot

Chatbot tersedia di portal utama dan halaman Address Label. API key Gemini hanya disimpan di environment Vercel, tidak dikirim ke browser.

## Konfigurasi

1. Buka proyek Vercel yang terhubung ke repo ini.
2. Pilih **Settings → Environment Variables**.
3. Tambahkan `GEMINI_API_KEY` berisi API key Google AI.
4. Aktifkan untuk Production (dan Preview/Development jika perlu), lalu redeploy.

Model teks default: `gemini-3.1-flash-lite-preview`. Model bisa diubah melalui `GEMINI_MODEL` ke ID model yang tersedia pada akun Google AI. Untuk membuat gambar, API mencoba model `gemini-2.5-flash-image`; bila model itu tidak tersedia di akun/proyek, atur `GEMINI_IMAGE_MODEL` ke model image-generation yang tersedia.

## Kemampuan

- Menjawab pertanyaan tentang fitur portal dan membantu pencarian data operasional.
- Mengambil data terbaru saat pertanyaan cocok dengan sumber Surat Jalan AO, Surat Pengantar GME, Address Label, Memo, dan Smart Lookup (buku/ORIN). API menggunakan `Cache-Control: no-store`; hasil tetap bergantung pada ketersediaan serta isi endpoint sumber.
- Membuka menu portal melalui perintah seperti **“buka menu Memo”**, **“masuk ke Surat Jalan AO”**, atau **“buka Address Label”**.
- Melampirkan TXT, CSV, JSON, Markdown, PDF, Excel, DOCX, serta gambar PNG/JPG/WEBP. Teks dokumen diekstrak di browser; gambar dikirim ke model sebagai input visual.
- Menyimpan jawaban sebagai TXT/Markdown, mencetak atau menyimpannya sebagai PDF melalui dialog browser, dan mencoba membuat gambar saat diminta.

## Batasan dan keamanan

- Asisten tidak membuat atau mengubah data operasional di Google Sheets/Drive; pencarian dan tanya jawab bersifat baca-saja.
- Pembuatan gambar bergantung pada akses model image generation di Google AI API. Jika model tidak tersedia, cek `GEMINI_IMAGE_MODEL`.
- PDF hasil scan yang tidak memiliki lapisan teks mungkin perlu dikirim sebagai gambar agar bisa dibaca.
- Asisten hanya dapat membaca data yang memang disediakan endpoint Apps Script/CSV yang dikonfigurasi, bukan semua file privat atau seluruh isi setiap halaman secara otomatis.
- Login saat ini sebagian berjalan di sisi klien. Jangan menganggapnya sebagai otorisasi kuat untuk data sensitif; sebelum membuka data sensitif lebih luas, pindahkan autentikasi dan pemeriksaan akses ke server serta tambahkan rate limiting.
