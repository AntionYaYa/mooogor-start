<script lang="ts">
function setTheme(theme: "light" | "dark") {
  const root = document.documentElement; 
  root.classList.remove("light", "dark");
  root.classList.add(theme);             
}
</script>

<button on:click={() => setTheme("dark")}>Dark Theme</button>
<button on:click={() => setTheme("light")}>Light Theme</button>