export class Settings {
    constructor() {
        this.dialog = document.getElementById('settings-dialog');
        this.btn = document.getElementById('settings-btn');
        this.form = document.getElementById('settings-form');
        
        // Inputs
        this.bgTypeInputs = document.querySelectorAll('input[name="bg-type"]');
        this.glassOpacityInput = document.getElementById('glass-opacity');
        this.blurStrengthInput = document.getElementById('blur-strength');
        this.primaryColorInput = document.getElementById('primary-color-picker');
        this.secondaryColorInput = document.getElementById('secondary-color-picker');
        this.textColorInput = document.getElementById('text-color-picker');
        
        // Display values
        this.opacityValue = document.getElementById('opacity-value');
        this.blurValue = document.getElementById('blur-value');
        this.colorPreview = document.querySelector('.color-preview');

        this.init();
    }

    init() {
        this.loadSettings();
        this.addEventListeners();
    }

    addEventListeners() {
        // Open Dialog
        this.btn.addEventListener('click', () => {
            this.dialog.showModal();
        });

        // Close on backdrop click
        this.dialog.addEventListener('click', (e) => {
            if (e.target === this.dialog) {
                this.dialog.close();
            }
        });

        // Live Preview - Background Type
        this.bgTypeInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                this.applyBackground(e.target.value);
                this.saveSettings();
            });
        });

        // Live Preview - Glass Opacity
        this.glassOpacityInput.addEventListener('input', (e) => {
            const val = e.target.value;
            this.opacityValue.textContent = `${val}%`;
            document.documentElement.style.setProperty('--glass-opacity', val / 100);
            this.saveSettings();
        });

        // Live Preview - Blur Strength
        this.blurStrengthInput.addEventListener('input', (e) => {
            const val = e.target.value;
            this.blurValue.textContent = `${val}px`;
            document.documentElement.style.setProperty('--glass-blur', `${val}px`);
            this.saveSettings();
        });

        // Live Preview - Primary Color
        this.primaryColorInput.addEventListener('input', (e) => {
            const color = e.target.value;
            document.documentElement.style.setProperty('--primary-color', color);
             if (this.colorPreview) {
                this.colorPreview.style.backgroundColor = color;
            }
            this.applyBackground(document.querySelector('input[name="bg-type"]:checked').value);
            this.saveSettings();
        });

         // Live Preview - Secondary Color
        this.secondaryColorInput.addEventListener('input', (e) => {
            const color = e.target.value;
            document.documentElement.style.setProperty('--secondary-color', color);
            this.applyBackground(document.querySelector('input[name="bg-type"]:checked').value);
            this.saveSettings();
        });

        // Live Preview - Text Color
        this.textColorInput.addEventListener('input', (e) => {
            const color = e.target.value;
            document.documentElement.style.setProperty('--text-primary', color);
            this.saveSettings();
        });
    }

    applyBackground(type) {
        let bgStyle = '';
        const baseColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-color').trim();
        const primary = this.primaryColorInput.value;
        const secondary = this.secondaryColorInput.value;

        // Helper to get rgba with opacity
        const hexToRgba = (hex, alpha) => {
            let r = 0, g = 0, b = 0;
            if (hex.length === 4) {
                r = parseInt(hex[1] + hex[1], 16);
                g = parseInt(hex[2] + hex[2], 16);
                b = parseInt(hex[3] + hex[3], 16);
            } else if (hex.length === 7) {
                r = parseInt(hex[1] + hex[2], 16);
                g = parseInt(hex[3] + hex[4], 16);
                b = parseInt(hex[5] + hex[6], 16);
            }
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };

        switch (type) {
            case 'solid':
                bgStyle = 'none';
                break;
            case 'gradient':
                 // Mix base with primary/secondary hint
                const pRgba = hexToRgba(primary, 0.15);
                const sRgba = hexToRgba(secondary, 0.1);
                bgStyle = `radial-gradient(circle at 50% 0%, ${pRgba} 0%, ${baseColor} 60%, ${sRgba} 100%)`;
                break;
            case 'mesh':
                bgStyle = `
                    radial-gradient(at 0% 0%, ${hexToRgba(primary, 0.2)} 0px, transparent 50%),
                    radial-gradient(at 100% 0%, ${hexToRgba(secondary, 0.2)} 0px, transparent 50%),
                    radial-gradient(at 100% 100%, ${hexToRgba(primary, 0.15)} 0px, transparent 50%),
                    radial-gradient(at 0% 100%, ${hexToRgba(secondary, 0.15)} 0px, transparent 50%)
                `;
                break;
        }
        document.body.style.backgroundImage = bgStyle;
    }

    saveSettings() {
        const settings = {
            bgType: document.querySelector('input[name="bg-type"]:checked').value,
            glassOpacity: this.glassOpacityInput.value,
            blurStrength: this.blurStrengthInput.value,
            primaryColor: this.primaryColorInput.value,
            secondaryColor: this.secondaryColorInput.value,
            textColor: this.textColorInput.value
        };
        localStorage.setItem('stacklink_settings', JSON.stringify(settings));
    }

    loadSettings() {
        const saved = localStorage.getItem('stacklink_settings');
        if (saved) {
            const settings = JSON.parse(saved);
            
            // Apply Logic
            // Update inputs first so applyBackground uses correct values
            this.primaryColorInput.value = settings.primaryColor || '#3b82f6';
            this.secondaryColorInput.value = settings.secondaryColor || '#a855f7';
            
            this.applyBackground(settings.bgType);
            
            document.documentElement.style.setProperty('--glass-opacity', settings.glassOpacity / 100);
            document.documentElement.style.setProperty('--glass-blur', `${settings.blurStrength}px`);
            document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
            
            if(settings.secondaryColor) {
                 document.documentElement.style.setProperty('--secondary-color', settings.secondaryColor);
            }

            if (settings.textColor) {
                document.documentElement.style.setProperty('--text-primary', settings.textColor);
                this.textColorInput.value = settings.textColor;
            }

            // Update UI
            // Radio
            const radio = document.querySelector(`input[name="bg-type"][value="${settings.bgType}"]`);
            if (radio) radio.checked = true;

            // Ranges
            this.glassOpacityInput.value = settings.glassOpacity;
            this.opacityValue.textContent = `${settings.glassOpacity}%`;

            this.blurStrengthInput.value = settings.blurStrength;
            this.blurValue.textContent = `${settings.blurStrength}px`;

            // Color
             if (this.colorPreview) {
                this.colorPreview.style.backgroundColor = settings.primaryColor;
            }
        }
    }
}
