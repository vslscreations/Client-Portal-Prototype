function resolvePortalPath(path) {
    const currentPath = window.location.pathname || "";
    const isInPages = currentPath.includes("/pages/");
    return isInPages ? "../" + path : path;
}

function goTo(path) {
    window.location.href = resolvePortalPath(path);
}

function toggleMenu() {
    const sideMenu = document.getElementById("sideMenu");
    if (sideMenu) {
        sideMenu.classList.toggle("active");
    }
}

window.goTo = goTo;
window.toggleMenu = toggleMenu;
window.resolvePortalPath = resolvePortalPath;
