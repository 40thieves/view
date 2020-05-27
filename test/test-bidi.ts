import ist from "ist"
import {__test, BidiSpan} from "@codemirror/next/view"
import {Text} from "@codemirror/next/text"

function queryBrowserOrder(strings: readonly string[]) {
  let scratch = document.body.appendChild(document.createElement("div"))
  for (let str of strings) {
    let wrap = scratch.appendChild(document.createElement("div"))
    wrap.style.whiteSpace = "pre"
    for (let ch of str) {
      let span = document.createElement("span")
      span.textContent = ch
      wrap.appendChild(span)
    }
  }
  let ltr: (readonly number[])[] = [], rtl: (readonly number[])[] = []
  for (let i = 0; i < 2; i++) {
    let dest = i ? rtl : ltr
    scratch.style.direction = i ? "rtl" : "ltr"
    for (let cur = scratch.firstChild; cur; cur = cur.nextSibling) {
      let positions = []
      for (let sp = cur.firstChild, i = 0; sp; sp = sp.nextSibling) positions.push([i++, (sp as HTMLElement).offsetLeft])
      dest.push(positions.sort((a, b) => a[1] - b[1]).map(x => x[0]))
    }
  }
  scratch.remove()
  return {ltr, rtl}
}

const cases = [
  "codemirror",
  "كودالمرآة",
  "codeمرآة",
  "الشفرةmirror",
  "codeمرآةabc",
  "كود1234المرآة",
  "كودabcالمرآة",
  "code123مرآة157abc",
  "  foo  ",
  "  مرآة  ",
  "ab12-34%م",
  "م1234%bc",
  "ر12:34ر",
  "xyאהxyאהxyאהxyאהxyאהxyאהxyאה",
  "ab مرآة10 cde 20مرآة!",
]

let queried: {ltr: (readonly number[])[], rtl: (readonly number[])[]} | null = null
function getOrder(i: number, dir: "ltr" | "rtl") {
  if (!queried) queried = queryBrowserOrder(cases)
  return queried[dir][i]
}

function ourOrder(order: readonly BidiSpan[], dir: "ltr" | "rtl") {
  let result = []
  for (let span of dir == "ltr" ? order : order.slice().reverse()) {
    if (span.level % 2) for (let i = span.to - 1; i >= span.from; i--) result.push(i)
    else for (let i = span.from; i < span.to; i++) result.push(i)
  }
  return result
}

function tests(dir: "ltr" | "rtl") {
  describe(dir + " context", () => {
    for (let i = 0; i < cases.length; i++) it(cases[i], () => {
      ist(ourOrder(__test.computeOrder(cases[i], dir), dir).join("-"), getOrder(i, dir).join("-"))
    })
  })

  describe(dir + " motion", () => {
    for (let i = 0; i < cases.length; i++) {
      for (let forward = true;; forward = false) {
        it(cases[i] + (forward ? " forward" : " backward"), () => {
          let order = __test.computeOrder(cases[i], dir)
          let line = Text.of([cases[i]]).line(1)
          let seen = []
          for (let p = __test.lineSide(line, order, dir, !forward);;) {
            ist(!seen[p.index])
            seen[p.index] = true
            let next = __test.moveVisually(line, order, dir, p.index, p.level, forward)
            if (!next) break
            p = next
          }
          ist(seen.length, cases[i].length + 1)
          for (let i = 0; i < seen.length; i++) ist(seen[i])
        })
        if (!forward) break
      }
    }

    it("handles extending characters", () => {
      let str = "aé̠őx 😎🙉 👨‍🎤💪🏽👩‍👩‍👧‍👦 🇩🇪🇫🇷"
      let points = [0, 1, 4, 6, 7, 8, 10, 12, 13, 18, 22, 33, 34, 38, 42]
      let line = Text.of([str]).line(1)
      let order = __test.computeOrder(str, "ltr")
      for (let i = 1; i < points.length; i++) {
        ist(__test.moveVisually(line, order, "ltr", points[i - 1], 0, true)!.index, points[i])
        ist(__test.moveVisually(line, order, "ltr", points[i], 0, false)!.index, points[i - 1])
      }
    })
  })
}

describe("bidi", () => {
  tests("ltr")
  tests("rtl")
})
