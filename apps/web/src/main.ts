import App from "./App.svelte";
import { mount } from "svelte";
import { initTheme } from "@/lib/theme";
import "./styles.css";

initTheme();

const app = mount(App, {
  target: document.getElementById("app")!,
});

export default app;
