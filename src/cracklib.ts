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

const leetSubstitutions: Array<[RegExp, string]> = [
  [/0/g, "o"],
  [/1/g, "l"],
  [/@/g, "a"],
  [/\$/g, "s"],
];

const lettersOnlyString = (s = ""): string => s.toLowerCase().replace(/[^a-z]/g, "");

const unleetString = (s = ""): string =>
  lettersOnlyString(leetSubstitutions.reduce((acc, [leet, letter]) => acc.replace(leet, letter), s.toLowerCase()));

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
    return this.dictionary.has(lettersOnlyString(word)) || this.dictionary.has(unleetString(word));
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
