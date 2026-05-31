import { resolve } from "path";
import tailwindcss from "@tailwindcss/vite";

export default {
  plugins: [tailwindcss()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        services: resolve(__dirname, "services.html"),
        about: resolve(__dirname, "about.html"),
        blog: resolve(__dirname, "blog.html"),
        "blog-post": resolve(__dirname, "blog-post.html"),
        contact: resolve(__dirname, "contact.html")
      }
    }
  }
};
