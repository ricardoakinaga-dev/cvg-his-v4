#!/usr/bin/env node

const url = process.argv[2] ?? "http://localhost:3001/health";

const response = await fetch(url);
const body = await response.text();

console.log(`status=${response.status}`);
console.log(body);
