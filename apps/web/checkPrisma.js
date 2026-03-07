const path = require.resolve("@prisma/client");
console.log("resolved @prisma/client:", path);

const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

console.log("has sevaActivity:", !!p.sevaActivity);
console.log("delegates:", Object.keys(p).filter(k => !k.startsWith("$")).sort());

p.$disconnect();
