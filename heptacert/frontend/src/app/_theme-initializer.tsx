export function ThemeInitializer() {
  const themeScript = `
    (function() {
      localStorage.setItem('heptacert-theme', 'light');
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
}
