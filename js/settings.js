export class Settings {
    constructor() {
        this.dialog = document.getElementById('settings-dialog');
        this.btn = document.getElementById('settings-btn');

        this.primaryColorInput = document.getElementById('primary-color-input');
        this.secondaryColorInput = document.getElementById('secondary-color-input');
        this.radiusInput = document.getElementById('radius-input');
        this.radiusVal = document.getElementById('radius-val');
        this.themeOpts = document.querySelectorAll('.theme-opt');

        this.init();
    }

    init() {
        this.loadSettings();
        this.syncThemeButtons();
        this.addEventListeners();
    }

    addEventListeners() {
        if (this.btn && this.dialog) {
            this.btn.addEventListener('click', () => this.dialog.showModal());
        }

        this.themeOpts.forEach(btn => {
            btn.addEventListener('click', () => {
                const theme = btn.dataset.theme;
                document.documentElement.setAttribute('data-theme', theme);
                localStorage.setItem('aroundwise_theme', theme);
                if (window.updateThemeIcon) window.updateThemeIcon(theme);
                this.syncThemeButtons();
            });
        });

        if (this.primaryColorInput) {
            this.primaryColorInput.addEventListener('input', (e) => {
                document.documentElement.style.setProperty('--accent-primary', e.target.value);
                document.documentElement.style.setProperty('--accent-soft', e.target.value + '17');
                this.saveSettings();
            });
        }

        if (this.secondaryColorInput) {
            this.secondaryColorInput.addEventListener('input', (e) => {
                document.documentElement.style.setProperty('--accent-gold', e.target.value);
                this.saveSettings();
            });
        }

        if (this.radiusInput && this.radiusVal) {
            this.radiusInput.addEventListener('input', (e) => {
                const val = e.target.value;
                this.radiusVal.textContent = `${val}px`;
                document.documentElement.style.setProperty('--radius-lg', `${val}px`);
                document.documentElement.style.setProperty('--radius-md', `${Math.max(6, val - 4)}px`);
                this.saveSettings();
            });
        }
    }

    syncThemeButtons() {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        this.themeOpts.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === current);
        });
    }

    saveSettings() {
        const settings = {
            primaryColor: this.primaryColorInput.value,
            secondaryColor: this.secondaryColorInput.value,
            radius: this.radiusInput.value,
        };
        localStorage.setItem('aroundwise_custom_settings', JSON.stringify(settings));
    }

    loadSettings() {
        const saved = localStorage.getItem('aroundwise_custom_settings');
        if (!saved) return;
        const settings = JSON.parse(saved);

        if (settings.primaryColor && this.primaryColorInput) {
            this.primaryColorInput.value = settings.primaryColor;
            document.documentElement.style.setProperty('--accent-primary', settings.primaryColor);
            document.documentElement.style.setProperty('--accent-soft', settings.primaryColor + '17');
        }
        if (settings.secondaryColor && this.secondaryColorInput) {
            this.secondaryColorInput.value = settings.secondaryColor;
            document.documentElement.style.setProperty('--accent-gold', settings.secondaryColor);
        }
        if (settings.radius && this.radiusInput && this.radiusVal) {
            this.radiusInput.value = settings.radius;
            this.radiusVal.textContent = `${settings.radius}px`;
            document.documentElement.style.setProperty('--radius-lg', `${settings.radius}px`);
            document.documentElement.style.setProperty('--radius-md', `${Math.max(6, settings.radius - 4)}px`);
        }
    }
}
