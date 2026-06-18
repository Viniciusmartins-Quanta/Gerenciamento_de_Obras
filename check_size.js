import fs from "fs";
const stats = fs.statSync("src/assets/images/timbrado.jpg");
console.log("Size in bytes:", stats.size);
