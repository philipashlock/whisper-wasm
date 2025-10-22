// Theme toggle functionality
type Theme = 'system' | 'light' | 'dark';

class ThemeToggle {
  private currentTheme: Theme;

  constructor() {
    this.currentTheme = this.getStoredTheme() || 'system';
    this.init();
  }

  private init(): void {
    this.createToggleButton();
    this.applyTheme(this.currentTheme);
  }

  private getStoredTheme(): Theme | null {
    const stored = localStorage.getItem('whisper-demo-theme');
    return stored && ['system', 'light', 'dark'].includes(stored) ? (stored as Theme) : null;
  }

  private setStoredTheme(theme: Theme): void {
    localStorage.setItem('whisper-demo-theme', theme);
  }

  private applyTheme(theme: Theme): void {
    const body = document.body;

    // Remove existing theme classes
    body.classList.remove('light-theme', 'dark-theme');

    if (theme === 'light') {
      body.classList.add('light-theme');
    } else if (theme === 'dark') {
      body.classList.add('dark-theme');
    }
    // For 'system', we don't add any class, letting CSS media query handle it

    this.updateToggleIcon(theme);
  }

  private cycleTheme(): void {
    const themes: Theme[] = ['system', 'light', 'dark'];
    const currentIndex = themes.indexOf(this.currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];

    this.currentTheme = nextTheme;
    this.setStoredTheme(nextTheme);
    this.applyTheme(nextTheme);
  }

  private updateToggleIcon(theme: Theme): void {
    const icon = document.getElementById('theme-toggle-icon');
    if (icon) {
      switch (theme) {
        case 'system':
          icon.textContent = '🌓';
          break;
        case 'light':
          icon.textContent = '☀️';
          break;
        case 'dark':
          icon.textContent = '🌙';
          break;
      }
    }
  }

  private createToggleButton(): void {
    const button = document.createElement('button');
    button.className = 'theme-toggle';
    button.id = 'theme-toggle';
    button.title = 'Переключить тему';
    button.innerHTML = '<span id="theme-toggle-icon">🌓</span>';

    button.addEventListener('click', () => {
      this.cycleTheme();
    });

    document.body.appendChild(button);
  }
}

// Initialize theme toggle when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ThemeToggle();
});
