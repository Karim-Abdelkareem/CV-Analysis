import fs from "fs";
import path from "path";

function readDir(dir, result = {}) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      result[file] = readDir(fullPath, {});
    } else if (file.endsWith(".js")) {
      result[file] = fs.readFileSync(fullPath, "utf8");
    }
  });

  return result;
}

const snapshot = readDir("./src");
fs.writeFileSync("ai-snapshot.json", JSON.stringify(snapshot, null, 2));
