
document.addEventListener("DOMContentLoaded", function() {
    window.onload = function() {
        var loadingScreen = document.getElementById("loading-screen");
        var content = document.getElementById("content");

        // Hide the loading screen
        loadingScreen.style.display = "none";
        // Show the main content
         
    };
});

 // Inisialisasi variabel audio dan status pemutaran
let currentAudio = new Audio('./song.MP3'); // Path ke file audio lokal
let isPlaying = false;
function playPreview() {
    if (isPlaying) {
        currentAudio.pause();
        document.getElementById('uu').classList.remove('playing'); // Menghapus outline saat dipause
    } else {
        currentAudio.play();
        document.getElementById('uu').classList.add('playing'); // Menambahkan outline saat diputar
    }
    isPlaying = !isPlaying; // Toggle status pemutaran
}

// Menambahkan event listener ke elemen gambar
document.getElementById('uu').addEventListener('click', playPreview);

// Mengatur status pemutaran saat audio selesai
currentAudio.onended = () => {
    isPlaying = false;
    document.getElementById('uu').classList.remove('playing'); // Menghapus outline saat audio selesai
};

// Memeriksa jika layar dalam desktop mode
if (window.innerWidth >= 1320) {
    // Menampilkan popup saat halaman dibuka di desktop
    document.getElementById('popup').style.display = 'flex';
}

document.getElementById('closeBtn').addEventListener('click', function() {
    // Menutup pop-up saat tombol Close ditekan
   window.close()
});

document.getElementById('openBtn').addEventListener('click', function() {
    // Fungsi untuk membuka sesuatu jika Open Anywhere ditekan (misalnya redirect atau aksi lain)
    document.getElementById('popup').style.display = 'none';
});