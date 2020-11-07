let mainNav = document.getElementById('js-menu');
let navBarToggle = document.getElementById('js-navbar-toggle');

navBarToggle.addEventListener('click', function () {
    mainNav.classList.toggle('active');
});

mainNav.addEventListener('click', function () {
    if (mainNav.classList.item(1) == "active") {
        mainNav.classList.toggle('active');
    }
});
