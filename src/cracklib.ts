import { createHash } from "crypto";
import * as fs from "fs";
import { resolve } from "path";

const defaultWordListFile = resolve(__dirname, "cracklib-small.txt");

export interface CracklibParams {
  dict?: string | string[] | Set<string>;
  minLength?: number;
  loose?: boolean;
  compatibilityMode?: boolean;
}

type Method = "md5" | "sha1" | "sha256" | "sha512";

const hashString =
  (method: Method) =>
  (s = ""): string =>
    createHash(method).update(s).digest("hex");

const md5String = hashString("md5");
const sha1String = hashString("sha1");
const sha256String = hashString("sha256");
const sha512String = hashString("sha512");

const leetSubstitutions: Array<[string, string]> = [
  ["@4^", "a"],
  ["86ß", "b"],
  ["©¢<[({", "c"],
  [")?", "d"],
  ["3&€", "e"],
  ["ƒ", "f"],
  ["69&", "g"],
  ["#", "h"],
  ["1!¡|]", "i"],
  ["]¿", "j"],
  ["1|£¬", "l"],
  ["0°", "o"],
  ["9¶", "p"],
  ["9", "q"],
  ["2®", "r"],
  ["5$§", "s"],
  ["7+†", "t"],
  ["µ", "u"],
  ["^", "v"],
  ["%*", "x"],
  ["¥", "y"],
  ["2%", "z"],
];

const maxLeetVariants = 256;

const lettersOnlyString = (s = ""): string => s.toLowerCase().replace(/[^a-z]/g, "");

const leetLetters = (char: string): string[] =>
  /[a-z]/.test(char)
    ? [char]
    : leetSubstitutions.filter(([chars]) => chars.includes(char)).map(([, letter]) => letter);

const unleetStrings = (s = ""): string[] =>
  s
    .toLowerCase()
    .split("")
    .reduce<string[]>((variants, char) => {
      const letters = leetLetters(char);
      const capped = variants.length * letters.length > maxLeetVariants ? letters.slice(0, 1) : letters;
      return letters.length === 0 ? variants : variants.flatMap((variant) => capped.map((l) => variant + l));
    }, [""]);

export class PasswordValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PasswordValidationError";
  }
}

export class Cracklib {
  private readonly dictionary: Set<string>;
  private readonly minLength: number;
  private readonly loose: boolean;
  private readonly compatibilityMode: boolean;

  constructor(c: CracklibParams = {}) {
    const { dict = defaultWordListFile, minLength = 8, loose = false, compatibilityMode = false } = c;
    this.minLength = minLength;
    this.loose = loose;
    this.compatibilityMode = compatibilityMode;
    this.dictionary = this.loadDictionary(dict);
  }

  private loadDictionaryFromTextFile(filePath: string): Set<string> {
    const prefilterMapping = this.loose ? (s: string) => s.trim() : (s: string) => s.toLowerCase();
    const reverseString = (s: string = ""): string => s.split("").reverse().join("");
    const hashWord = (s: string = ""): string[] => [md5String(s), sha1String(s), sha256String(s), sha512String(s)];
    const words = fs
      .readFileSync(resolve(filePath), "utf8")
      .split(/\r?\n/)
      .filter((a) => a)
      .map(prefilterMapping);
    return new Set(this.loose ? words : [...words, ...words.map(reverseString), ...words.map(hashWord).flat()]);
  }

  private loadDictionaryFromJsonFile(filePath: string): Set<string> {
    return new Set(JSON.parse(fs.readFileSync(resolve(filePath), "utf8")) as string[]);
  }

  private loadDictionary(dict: string | string[] | Set<string>): Set<string> {
    if (typeof dict === "string") {
      let dictPath = resolve(dict);
      if (!fs.existsSync(dictPath) && this.compatibilityMode) {
        dictPath = defaultWordListFile;
      }
      if (dict.endsWith(".json")) {
        return this.loadDictionaryFromJsonFile(dictPath);
      }
      return this.loadDictionaryFromTextFile(dictPath);
    }
    return new Set(dict);
  }

  private hasDictionaryVariant(word: string): boolean {
    return this.dictionary.has(lettersOnlyString(word)) || unleetStrings(word).some((v) => this.dictionary.has(v));
  }

  public saveDictionary(filePath: string): void {
    if (filePath.endsWith(".json")) {
      fs.writeFileSync(resolve(filePath), JSON.stringify(Array.from(this.dictionary)));
    } else {
      throw new Error("Filename must end with .json");
    }
  }

  public validate(word: string = ""): string | Error {
    if (!word.length || /^\s+$/.test(word)) {
      throw new PasswordValidationError("Password is empty or all whitespace");
    }
    if (word.length < this.minLength) {
      throw new PasswordValidationError("Password is too short");
    }
    if (this.dictionary.has(word)) {
      throw new PasswordValidationError("Password is too common");
    }
    if (!this.loose && this.hasDictionaryVariant(word)) {
      throw new PasswordValidationError("Password is too similar to a dictionary word");
    }
    return word;
  }
}
