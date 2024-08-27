
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
let currentAudio = new Audio('./est ce que tu maimes.mp3'); // Path ke file audio lokal
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