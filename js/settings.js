import { hexToRgb } from './color-utils.js';

export class Settings {
    constructor() {
        this.dialog = document.getElementById('settings-dialog');
        this.btn = document.getElementById('settings-btn');
        this.form = document.getElementById('settings-form');
        
        // Inputs
        this.bgTypeInputs = document.querySelectorAll('input[name="bg-type"]');
        this.bgColorInput = document.getElementById('bg-color-picker'); // New
        
        this.cardBgInput = document.getElementById('card-bg-picker'); // New
        this.glassOpacityInput = document.getElementById('glass-opacity');
        this.blurStrengthInput = document.getElementById('blur-strength');
        
        this.primaryColorInput = document.getElementById('primary-color-picker');
        this.secondaryColorInput = document.getElementById('secondary-color-picker');
        this.textColorInput = document.getElementById('text-color-picker');
        this.textSecColorInput = document.getElementById('text-sec-color-picker'); // New
        
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

        // Live Preview - Background Color (Solid)
        this.bgColorInput.addEventListener('input', (e) => {
            const color = e.target.value;
            document.documentElement.style.setProperty('--bg-color', color);
            this.applyBackground(document.querySelector('input[name="bg-type"]:checked').value);
            this.saveSettings();
        });

        // Live Preview - Card Base Color
        this.cardBgInput.addEventListener('input', (e) => {
            const hex = e.target.value;
            const { r, g, b } = hexToRgb(hex);
            document.documentElement.style.setProperty('--glass-r', r);
            document.documentElement.style.setProperty('--glass-g', g);
            document.documentElement.style.setProperty('--glass-b', b);
            
            // Also update solid card bg for fallback or non-glass elements
            document.documentElement.style.setProperty('--card-bg', hex);
            this.saveSettings();
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

        // Live Preview - Secondary Text Color
        this.textSecColorInput.addEventListener('input', (e) => {
            const color = e.target.value;
            document.documentElement.style.setProperty('--text-secondary', color);
            this.saveSettings();
        });
    }

    applyBackground(type) {
        let bgStyle = '';
        // Use current CSS var value for base color
        const baseColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-color').trim();
        const primary = this.primaryColorInput.value;
        const secondary = this.secondaryColorInput.value;

        // Helper to get rgba with opacity
        const getRgba = (hex, alpha) => {
            const { r, g, b } = hexToRgb(hex);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };

        switch (type) {
            case 'solid':
                bgStyle = 'none'; // Will show background-color
                break;
            case 'gradient':
                 // Mix base with primary/secondary hint
                const pRgba = getRgba(primary, 0.15);
                const sRgba = getRgba(secondary, 0.1);
                bgStyle = `radial-gradient(circle at 50% 0%, ${pRgba} 0%, ${baseColor} 60%, ${sRgba} 100%)`;
                break;
            case 'mesh':
                bgStyle = `
                    radial-gradient(at 0% 0%, ${getRgba(primary, 0.2)} 0px, transparent 50%),
                    radial-gradient(at 100% 0%, ${getRgba(secondary, 0.2)} 0px, transparent 50%),
                    radial-gradient(at 100% 100%, ${getRgba(primary, 0.15)} 0px, transparent 50%),
                    radial-gradient(at 0% 100%, ${getRgba(secondary, 0.15)} 0px, transparent 50%)
                `;
                break;
        }
        document.body.style.backgroundImage = bgStyle;
    }

    saveSettings() {
        const settings = {
            bgType: document.querySelector('input[name="bg-type"]:checked').value,
            bgColor: this.bgColorInput.value,
            cardBg: this.cardBgInput.value,
            glassOpacity: this.glassOpacityInput.value,
            blurStrength: this.blurStrengthInput.value,
            primaryColor: this.primaryColorInput.value,
            secondaryColor: this.secondaryColorInput.value,
            textColor: this.textColorInput.value,
            textSecColor: this.textSecColorInput.value
        };
        localStorage.setItem('stacklink_settings', JSON.stringify(settings));
    }

    loadSettings() {
        const saved = localStorage.getItem('stacklink_settings');
        if (saved) {
            const settings = JSON.parse(saved);
            
            // Apply Logic
            this.primaryColorInput.value = settings.primaryColor || '#3b82f6';
            this.secondaryColorInput.value = settings.secondaryColor || '#a855f7';
            this.bgColorInput.value = settings.bgColor || '#09090b';
            this.cardBgInput.value = settings.cardBg || '#18181b';
            this.textColorInput.value = settings.textColor || '#f4f4f5';
            this.textSecColorInput.value = settings.textSecColor || '#a1a1aa';
            
            // CSS Vars
            document.documentElement.style.setProperty('--bg-color', this.bgColorInput.value);
            document.documentElement.style.setProperty('--primary-color', this.primaryColorInput.value);
            document.documentElement.style.setProperty('--secondary-color', this.secondaryColorInput.value);
            document.documentElement.style.setProperty('--text-primary', this.textColorInput.value);
            document.documentElement.style.setProperty('--text-secondary', this.textSecColorInput.value);
            
            // Card BG (Convert to RGB for glass)
            const { r, g, b } = hexToRgb(this.cardBgInput.value);
            document.documentElement.style.setProperty('--glass-r', r);
            document.documentElement.style.setProperty('--glass-g', g);
            document.documentElement.style.setProperty('--glass-b', b);
            document.documentElement.style.setProperty('--card-bg', this.cardBgInput.value);

            document.documentElement.style.setProperty('--glass-opacity', settings.glassOpacity / 100);
            document.documentElement.style.setProperty('--glass-blur', `${settings.blurStrength}px`);

            this.applyBackground(settings.bgType);
            

            // Update UI Controls
            const radio = document.querySelector(`input[name="bg-type"][value="${settings.bgType}"]`);
            if (radio) radio.checked = true;

            this.glassOpacityInput.value = settings.glassOpacity;
            this.opacityValue.textContent = `${settings.glassOpacity}%`;

            this.blurStrengthInput.value = settings.blurStrength;
            this.blurValue.textContent = `${settings.blurStrength}px`;

            if (this.colorPreview) {
                this.colorPreview.style.backgroundColor = settings.primaryColor;
            }
        }
    }
}
