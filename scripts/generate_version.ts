await Bun.write("public/version", process.argv.slice(2)[0]);
