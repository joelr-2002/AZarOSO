document.addEventListener('DOMContentLoaded', function() {
    // Inicializar componentes de Materialize
    var sidenav = document.querySelectorAll('.sidenav');
    M.Sidenav.init(sidenav);
});

function loadApp(app) {
    const frame = document.getElementById('content-frame');
    const welcome = document.getElementById('welcome-screen');
    const appUrls = {
        'ruleta': './assets/pages/ruleta.html',
        'dado': './assets/pages/dado.html',
        'moneda': './assets/pages/moneda.html',
        'barajar': './assets/pages/barajar.html'
    };

    if (appUrls[app]) {
        frame.style.display = 'block';
        welcome.style.display = 'none';
        frame.src = appUrls[app];
        
        // Cerrar sidenav en móviles
        var instance = M.Sidenav.getInstance(document.querySelector('.sidenav'));
        if (instance) {
            instance.close();
        }
    }
}
