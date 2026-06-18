import fetch from "node-fetch"; // natively available in Node 18+ as global fetch, but let's just use global
const res = await fetch('https://lh3.googleusercontent.com/d/1EzVNByqEjKaDt743_VvPodzk_ddCNFmT');
console.log(res.status);
console.log(await res.text());
