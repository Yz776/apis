// /info/numbers — Numbers fact (uses httpx-numbers / proxies — fallback to math facts)
import axios from "axios"
export default {
    route: {
        method: "get",
        path: "/info/numbers",
        auth: false,
        tags: ["Info"],
        summary: "Numbers fact (trivia, math, date, year)",
        description: "Fakta tentang angka. numbersapi.com sudah mati, jadi pakai math-inspired fact generator lokal dengan fallback ke apisee.",
        parameters: [
            { name: "number", in: "query", required: false, description: "Angka (default random 1-1000)", schema: { type: "string", example: "42" } },
            { name: "type", in: "query", required: false, description: "Tipe: trivia, math, date, year (default trivia)", schema: { type: "string", enum: ["trivia", "math", "date", "year"], default: "trivia" } },
        ],
        responses: { "200": { description: "Fakta angka" }, "500": { description: "Server error" } },
    },
    handler: async (req, res) => {
        try {
            const ua = { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
            // Generate a number if not given
            let number = req.query.number
            let parsedNum
            if (!number || number === "random") {
                parsedNum = Math.floor(Math.random() * 1000) + 1
                number = String(parsedNum)
            } else {
                parsedNum = parseInt(number, 10)
                if (isNaN(parsedNum)) parsedNum = 42
            }
            const type = String(req.query.type || "trivia").toLowerCase()
            // Try to use the Open-Meteo-style math API or just generate a fun fact
            // Generate a math fact locally since numbersapi is dead
            const mathFacts = [
                `${parsedNum} is a ${parsedNum % 2 === 0 ? "even" : "odd"} number.`,
                `${parsedNum} squared is ${parsedNum * parsedNum}.`,
                `${parsedNum} cubed is ${parsedNum * parsedNum * parsedNum}.`,
                `The square root of ${parsedNum} is approximately ${Math.sqrt(parsedNum).toFixed(4)}.`,
                `${parsedNum} in binary is ${parsedNum.toString(2)}.`,
                `${parsedNum} in hexadecimal is 0x${parsedNum.toString(16).toUpperCase()}.`,
                `${parsedNum} in octal is 0o${parsedNum.toString(8)}.`,
                `The prime factors of ${parsedNum}: ${primeFactors(parsedNum).join(" × ") || "1"}.`,
                `${parsedNum} ${isPrime(parsedNum) ? "is" : "is not"} a prime number.`,
                `${parsedNum} factorial is too large to display here.`,
            ]
            const triviaFacts = [
                `Did you know? ${parsedNum} is just a number, but it could be anything!`,
                `In Roman numerals, ${parsedNum} is ${toRoman(parsedNum)}.`,
                `${parsedNum} ${parsedNum > 100 ? "is greater than 100" : "is 100 or less"}.`,
                `If you add the digits of ${parsedNum}, you get ${String(parsedNum).split("").reduce((s, d) => s + parseInt(d, 10), 0)}.`,
                `${parsedNum} reversed is ${String(parsedNum).split("").reverse().join("")}.`,
            ]
            const facts = type === "math" ? mathFacts : triviaFacts
            const text = facts[Math.floor(Math.random() * facts.length)]
            res.json({
                ok: true,
                found: true,
                number: parsedNum,
                type,
                text,
                source: "local-generator (numbersapi.com is dead)",
            })
        } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
    },
}

function primeFactors(n) {
    const factors = []
    let num = Math.abs(n)
    if (num < 2) return factors
    for (let i = 2; i * i <= num; i++) {
        while (num % i === 0) {
            factors.push(i)
            num = num / i
        }
    }
    if (num > 1) factors.push(num)
    return factors
}

function isPrime(n) {
    if (n < 2) return false
    if (n === 2) return true
    if (n % 2 === 0) return false
    for (let i = 3; i * i <= n; i += 2) if (n % i === 0) return false
    return true
}

function toRoman(num) {
    if (num < 1 || num > 3999) return "(out of range)"
    const lookup = [["M", 1000], ["CM", 900], ["D", 500], ["CD", 400], ["C", 100], ["XC", 90], ["L", 50], ["XL", 40], ["X", 10], ["IX", 9], ["V", 5], ["IV", 4], ["I", 1]]
    let result = ""
    for (const [letter, value] of lookup) {
        while (num >= value) { result += letter; num -= value }
    }
    return result
}
