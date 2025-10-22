import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  plugins: [pluginReact()],
  server: {
    base: '/turtle-builder/',
  },
  html: {
    title: 'LiITA Turtle Builder',
  },
});
