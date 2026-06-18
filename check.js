// check.js
import fs from "fs";
const html = fs.readFileSync("src/assets/images/timbrado.jpg", "utf8");
console.log(html.slice(0, 1000));
