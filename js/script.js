// =====================================================
// 1. MENU MOBILE
// =====================================================

const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");

if (menuToggle && navLinks) {

    menuToggle.addEventListener("click", () => {

        navLinks.classList.toggle("active");

    });

}


// =====================================================
// 2. FERMER LE MENU APRÈS UN CLIC
// =====================================================

if (navLinks) {

    const navItems = navLinks.querySelectorAll("a");

    navItems.forEach(link => {

        link.addEventListener("click", () => {

            navLinks.classList.remove("active");

        });

    });

}


// =====================================================
// 3. BOUTON RETOUR EN HAUT
// =====================================================

const backToTop = document.getElementById("backToTop");

if (backToTop) {

    window.addEventListener("scroll", () => {

        if (window.scrollY > 300) {

            backToTop.style.display = "block";

        } else {

            backToTop.style.display = "none";

        }

    });


    backToTop.addEventListener("click", () => {

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    });

}


// =====================================================
// 4. FORMULAIRE DE RÉSERVATION
// =====================================================

const reservationForm = document.getElementById("reservationForm");

if (reservationForm) {

    reservationForm.addEventListener("submit", (event) => {

        event.preventDefault();

        alert(
            "🎉 Votre réservation a été enregistrée avec succès !"
        );

        reservationForm.reset();

    });

}


// =====================================================
// 5. FILTRE DES SPÉCIALITÉS
// =====================================================

const filterButtons = document.querySelectorAll(".filter-btn");
const cards = document.querySelectorAll(".plat-card");

if (filterButtons.length > 0 && cards.length > 0) {

    filterButtons.forEach(button => {

        button.addEventListener("click", () => {

            const filter = button.dataset.filter;


            // Bouton actif
            filterButtons.forEach(btn => {

                btn.classList.remove("active");

            });

            button.classList.add("active");


            // Filtrage
            cards.forEach(card => {

                const category = card.dataset.category;


                if (
                    filter === "all" ||
                    category === filter
                ) {

                    card.style.display = "";

                } else {

                    card.style.display = "none";

                }

            });

        });

    });

}