new Swiper(".wrapper", {
  loop: true,
  spaceBetween: 30,

  // Autoplay
  autoplay: {
    delay: 5000,                 // Tempo entre os slides (5s)
    disableOnInteraction: false, // Continua após interação
    pauseOnMouseEnter: true      // Pausa ao passar o mouse
  },

  // Paginação (bolinhas abaixo do carrossel)
  pagination: {
    el: ".swiper-pagination",
    clickable: true,
    dynamicBullets: true         // Bolinhas ajustáveis ao número de slides
  },

  // Botões de navegação (setas)
  navigation: {
    nextEl: ".swiper-button-next",
    prevEl: ".swiper-button-prev"
  },

  // Responsividade
  breakpoints: {
    0: {
      slidesPerView: 1           // Celulares
    },
    768: {
      slidesPerView: 2           // Tablets
    },
    1024: {
      slidesPerView: 3           // Desktops
    }
  }
});
