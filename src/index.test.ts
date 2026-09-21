import * as fs from "fs";
import { resolve } from "path";
import test from "tape";
import crack from ".";
import { Cracklib } from "./cracklib";

const fakePath = resolve(__dirname, "not-real.txt");

test("cracklibjs", (t) => {
  const okWord = "alksdfjlkj1232345sdlkjcs8!!";
  t.equals(crack()(okWord), okWord, "random word is ok, no options");
  t.equals(crack({})(okWord), okWord, "random word is ok, empty options");
  t.equals(typeof crack(), "function", "crack() returns a function");
  t.throws(() => crack({ minLength: 9 })("asdf11!!"), /Password is too short/, "crack with minLength fails");
  t.throws(() => crack()(""), /Password is empty or all whitespace/, "empty password fails");
  t.throws(() => crack()(), /Password is empty or all whitespace/, "no password fails");
  t.throws(() => crack()("\t   \n"), /Password is empty or all whitespace/, "whitespace password fails");
  t.throws(() => crack({ minLength: 2 })("one"), /Password is too common/, 'crack with "one" fails');
  t.throws(() => crack({ minLength: 2 })("eno"), /Password is too common/, 'crack with "eno" (reversed "one") fails');
  t.throws(
    () => crack()("abandon#ment"),
    /Password is too similar to a dictionary word/,
    'crack with "abandon#ment" fails'
  );
  t.throws(() => crack()("p@ssw0rd"), /Password is too similar to a dictionary word/, 'crack with "p@ssw0rd" fails');
  t.throws(() => crack()("e1ephant"), /Password is too similar to a dictionary word/, 'crack with "e1ephant" fails');
  t.throws(
    () => crack({ minLength: 7 })("&arba&e"),
    /Password is too similar to a dictionary word/,
    'crack with "&arba&e" fails'
  );
  t.throws(
    () => crack()("©0mpu7er"),
    /Password is too similar to a dictionary word/,
    'crack with "©0mpu7er" fails'
  );
  t.throws(
    () => crack({ minLength: 6 })("£e§§on"),
    /Password is too similar to a dictionary word/,
    'crack with "£e§§on" fails'
  );
  t.equals(crack()("q9wxz47k"), "q9wxz47k", 'crack with "q9wxz47k" is ok, not a leet dictionary word');
  t.equals(crack({ minLength: 2, loose: true })("eno"), "eno", 'crack with "eno" is okay with loose option');
  t.equals(crack({ dict: fakePath })(okWord), okWord, "works with broken path");
  t.equals(new Cracklib().validate(okWord), okWord, "works with default Cracklib instance");
  t.throws(
    () => new Cracklib({ dict: fakePath }).validate(okWord),
    /ENOENT/,
    "Cracklib with broken path throws on empty password"
  );
  t.throws(
    () => new Cracklib({ dict: ["hello", "world"], minLength: 1 }).validate("hello"),
    /Password is too common/,
    "Cracklib with array dict fails on common word"
  );
  t.equals(
    new Cracklib({ dict: ["hello", "world"], minLength: 1 }).validate("olleh"),
    "olleh",
    "Cracklib with array dict passes on non-common word"
  );
  t.true(() => {
    try {
      const cl = new Cracklib({ dict: ["hello", "world"], minLength: 1 });
      cl.saveDictionary("test.json");
      const reread = JSON.parse(fs.readFileSync(resolve("test.json"), "utf8"));
      return reread.includes("hello") && reread.includes("world") && reread.length === 2;
    } finally {
      try {
        fs.unlinkSync(resolve("test.json"));
      } catch (e) {}
    }
  }, "Cracklib with array dict saves dictionary");
  t.throws(
    () => {
      try {
        const cl = new Cracklib({ dict: ["hello", "world"], minLength: 1 });
        cl.saveDictionary("test.json");
        const cl2 = new Cracklib({ dict: "test.json", minLength: 1 });
        return cl2.validate("hello");
      } finally {
        try {
          fs.unlinkSync(resolve("test.json"));
        } catch (e) {}
      }
    },
    /Password is too common/,
    "Cracklib with saved dict fails on common word"
  );
  t.throws(
    () => {
      try {
        const cl = new Cracklib({ dict: ["hello", "world"], minLength: 1 });
        cl.saveDictionary("test.notjson");
      } finally {
        try {
          fs.unlinkSync(resolve("test.notjson"));
        } catch (e) {}
      }
    },
    /must end with .json/,
    "Cracklib saveDictionary fails on non-json filename"
  );
  t.end();
});

const leetCases: Array<[string, string, string]> = [
  ["@", "a", "destin@te"],
  ["4", "a", "m4rkable"],
  ["^", "a", "p^rameter"],
  ["8", "b", "8enefits"],
  ["6", "b", "6linding"],
  ["ß", "b", "rockaßye"],
  ["©", "c", "pre©edented"],
  ["¢", "c", "methodi¢"],
  ["<", "c", "pun<turing"],
  ["[", "c", "[alorimetric"],
  ["(", "c", "(ompilation"],
  ["{", "c", "{yclades"],
  [")", "d", "ju)gments"],
  ["?", "d", "pe?estal"],
  ["3", "e", "storyt3ller"],
  ["&", "e", "h&reinafter"],
  ["€", "e", "v€nturings"],
  ["ƒ", "f", "aƒfirmative"],
  ["6", "g", "earnin6s"],
  ["9", "g", "sta9nant"],
  ["&", "g", "examinin&"],
  ["#", "h", "monarc#ies"],
  ["1", "i", "quatra1n"],
  ["!", "i", "l!terary"],
  ["¡", "i", "obl¡vious"],
  ["|", "i", "respons|vely"],
  ["]", "i", "suff]xer"],
  ["]", "j", "sub]ection"],
  ["¿", "j", "ad¿oining"],
  ["1", "l", "articu1ation"],
  ["|", "l", "nu|lifying"],
  ["£", "l", "de£egate"],
  ["¬", "l", "¬egality"],
  ["0", "o", "n0stromo"],
  ["°", "o", "m°ntmartre"],
  ["9", "p", "a9petite"],
  ["¶", "p", "¶rogrammer"],
  ["9", "q", "9uadrupole"],
  ["2", "r", "a2rangement"],
  ["®", "r", "immig®ant"],
  ["5", "s", "5ustenance"],
  ["$", "s", "generou$ness"],
  ["§", "s", "conden§ate"],
  ["7", "t", "collabora7es"],
  ["+", "t", "locomo+ive"],
  ["†", "t", "mu†eness"],
  ["µ", "u", "redµndancy"],
  ["^", "v", "e^idencing"],
  ["%", "x", "e%erciser"],
  ["*", "x", "e*emplifies"],
  ["¥", "y", "probabilit¥"],
  ["2", "z", "systemati2es"],
  ["%", "z", "authori%ing"],
];

test("leet character substitutions", (t) => {
  const validate = crack();
  leetCases.forEach(([char, letter, password]) => {
    t.throws(
      () => validate(password),
      /Password is too similar to a dictionary word/,
      `"${char}" as "${letter}": "${password}" fails`
    );
  });
  t.end();
});

const unmappedCases: Array<[string, string]> = [
  [" ", "off3r ers"],
  ['"', 'br3a"kpoint'],
  ["'", "r3c'urrences"],
  [",", "br3a,thed"],
  ["-", "lib3r-ates"],
  [".", "positiv3n.ess"],
  ["/", "r3b/ounds"],
  [":", "tachom3t:ers"],
  [";", "l3g;endre"],
  ["=", "trailh3a=d"],
  [">", "d3t>onate"],
  ["\\", "corr3c\\tly"],
  ["_", "handk3r_chief"],
  ["`", "w3l`comed"],
  ["}", "robustn3s}s"],
  ["~", "p3r~meates"],
];

test("characters with no leet mapping", (t) => {
  const validate = crack();
  unmappedCases.forEach(([char, password]) => {
    t.throws(
      () => validate(password),
      /Password is too similar to a dictionary word/,
      `"${char}" is skipped rather than fatal: "${password}" fails`
    );
  });
  t.end();
});
