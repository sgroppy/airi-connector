import { stringify, parse } from "superjson";

// Test what format we need
const testEvent = {
  type: "speak:text",
  id: "test-1",
  data: { text: "Hello" }
};

// Stringify with superjson
const superjsonStr = stringify(testEvent);
console.log("Superjson output:");
console.log(superjsonStr);
console.log();

// Parse it back
const parsed = parse(superjsonStr);
console.log("Parsed back:");
console.log(parsed);
console.log();

// Try parsing plain JSON
const plainJson = JSON.stringify(testEvent);
console.log("Plain JSON:");
console.log(plainJson);
console.log();

try {
  const parsedPlain = parse(plainJson);
  console.log("Parsed plain JSON with superjson:");
  console.log(parsedPlain);
} catch(e) {
  console.log("Error parsing plain JSON:", e.message);
}
