export class Settings {
    constructor() {
        this.dialog = document.getElementById('settings-dialog');
        this.btn = document.getElementById('settings-btn');
        this.form = document.getElementById('settings-form');
        
        // Inputs
        this.primaryColorInput = document.getElementById('primary-color-input');
        this.secondaryColorInput = document.getElementById('secondary-color-input');
        this.baseHueInput = document.getElementById('base-hue-input');
        this.glassOpacityInput = document.getElementById('glass-opacity-input');
        this.glassBlurInput = document.getElementById('glass-blur-input');
        this.radiusInput = document.getElementById('radius-input');
        
        // Value Displays
        this.baseHueVal = document.getElementById('base-hue-val');
        this.glassOpacityVal = document.getElementById('glass-opacity-val');
        this.glassBlurVal = document.getElementById('glass-blur-val');
        this.radiusVal = document.getElementById('radius-val');
        
        // Theme Buttons
        this.themeOpts = document.querySelectorAll('.theme-opt');

        this.init();
    }

    init() {
        this.loadSettings();
        this.addEventListeners();
    }

    addEventListeners() {
        // Open Dialog
        if (this.btn && this.dialog) {
            this.btn.addEventListener('click', () => {
                this.dialog.showModal();
            });
        }

        // Theme Options
        if (this.themeOpts) {
            this.themeOpts.forEach(btn => {
                btn.addEventListener('click', () => {
                    const theme = btn.dataset.theme;
                    document.documentElement.setAttribute('data-theme', theme);
                    localStorage.setItem('stacklink_theme', theme);
                    if (window.updateThemeIcon) window.updateThemeIcon(theme);
                    this.saveSettings();
                });
            });
        }

        // Accent Colors
        if (this.primaryColorInput) {
            this.primaryColorInput.addEventListener('input', (e) => {
                document.documentElement.style.setProperty('--accent-primary', e.target.value);
                this.saveSettings();
            });
        }
        
        if (this.secondaryColorInput) {
            this.secondaryColorInput.addEventListener('input', (e) => {
                document.documentElement.style.setProperty('--accent-secondary', e.target.value);
                this.saveSettings();
            });
        }

        // Base Hue
        if (this.baseHueInput && this.baseHueVal) {
            this.baseHueInput.addEventListener('input', (e) => {
                const val = e.target.value;
                this.baseHueVal.textContent = `${val}°`;
                document.documentElement.style.setProperty('--base-hull', val);
                this.saveSettings();
            });
        }

        // Glass Opacity
        if (this.glassOpacityInput && this.glassOpacityVal) {
            this.glassOpacityInput.addEventListener('input', (e) => {
                const val = e.target.value;
                this.glassOpacityVal.textContent = `${val}%`;
                document.documentElement.style.setProperty('--glass-opacity', val / 100);
                this.saveSettings();
            });
        }

        // Glass Blur
        if (this.glassBlurInput && this.glassBlurVal) {
            this.glassBlurInput.addEventListener('input', (e) => {
                const val = e.target.value;
                this.glassBlurVal.textContent = `${val}px`;
                document.documentElement.style.setProperty('--glass-blur', `${val}px`);
                this.saveSettings();
            });
        }

        // Radius
        if (this.radiusInput && this.radiusVal) {
            this.radiusInput.addEventListener('input', (e) => {
                const val = e.target.value;
                this.radiusVal.textContent = `${val}px`;
                document.documentElement.style.setProperty('--radius-lg', `${val}px`);
                document.documentElement.style.setProperty('--radius-md', `${Math.max(8, val - 10)}px`);
                this.saveSettings();
            });
        }
    }

    saveSettings() {
        const settings = {
            primaryColor: this.primaryColorInput.value,
            secondaryColor: this.secondaryColorInput.value,
            baseHue: this.baseHueInput.value,
            glassOpacity: this.glassOpacityInput.value,
            glassBlur: this.glassBlurInput.value,
            radius: this.radiusInput.value
        };
        localStorage.setItem('stacklink_custom_settings', JSON.stringify(settings));
    }

    loadSettings() {
        const saved = localStorage.getItem('stacklink_custom_settings');
        if (saved) {
            const settings = JSON.parse(saved);
            
            if (settings.primaryColor && this.primaryColorInput) {
                this.primaryColorInput.value = settings.primaryColor;
                document.documentElement.style.setProperty('--accent-primary', settings.primaryColor);
            }
            if (settings.secondaryColor && this.secondaryColorInput) {
                this.secondaryColorInput.value = settings.secondaryColor;
                document.documentElement.style.setProperty('--accent-secondary', settings.secondaryColor);
            }
            if (settings.baseHue && this.baseHueInput && this.baseHueVal) {
                this.baseHueInput.value = settings.baseHue;
                this.baseHueVal.textContent = `${settings.baseHue}°`;
                document.documentElement.style.setProperty('--base-hull', settings.baseHue);
            }
            if (settings.glassOpacity && this.glassOpacityInput && this.glassOpacityVal) {
                this.glassOpacityInput.value = settings.glassOpacity;
                this.glassOpacityVal.textContent = `${settings.glassOpacity}%`;
                document.documentElement.style.setProperty('--glass-opacity', settings.glassOpacity / 100);
            }
            if (settings.glassBlur && this.glassBlurInput && this.glassBlurVal) {
                this.glassBlurInput.value = settings.glassBlur;
                this.glassBlurVal.textContent = `${settings.glassBlur}px`;
                document.documentElement.style.setProperty('--glass-blur', `${settings.glassBlur}px`);
            }
            if (settings.radius && this.radiusInput && this.radiusVal) {
                this.radiusInput.value = settings.radius;
                this.radiusVal.textContent = `${settings.radius}px`;
                document.documentElement.style.setProperty('--radius-lg', `${settings.radius}px`);
                document.documentElement.style.setProperty('--radius-md', `${Math.max(8, settings.radius - 10)}px`);
            }
        }
    }
}
