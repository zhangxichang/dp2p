/* eslint-disable */
import { defineConfig } from "@solidjs/start/config";
import { config } from "./app.config";

config.server.preset = "static";

export default defineConfig(config);
