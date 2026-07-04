import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const length = 24;

const nanoid = customAlphabet(alphabet, length);

export function generateInboxEmailToken() {
  return nanoid();
}
