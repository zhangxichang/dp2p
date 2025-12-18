//@refresh reload
import { createHandler, StartServer } from "@solidjs/start/server";

export default createHandler(() => (
  <StartServer
    document={({ assets, scripts, children }) => (
      <html lang="zh" data-theme="starlink-light">
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <link rel="icon" href="/icon.svg" />
          <title>星链</title>
          {assets}
          {scripts}
        </head>
        <body>{children}</body>
      </html>
    )}
  />
));
