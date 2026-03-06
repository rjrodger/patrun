const { describe, test } = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')

const Patrun = require('../dist/patrun')

const DATA_DIR = path.join(__dirname, 'data')

function parseTSV(filepath) {
  const content = fs.readFileSync(filepath, 'utf8')
  const lines = content.split('\n')
  const ops = []

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const parts = trimmed.split('\t')
    const op = parts[0]
    const patStr = parts[1] || '{}'
    const data = parts[2] !== undefined ? parts[2] : undefined
    const extra = parts[3] || undefined

    let pat
    try {
      pat = JSON.parse(patStr)
    } catch {
      pat = {}
    }

    ops.push({ op, pat, data, extra, line: i + 1 })
  }

  return ops
}

// Group operations into sections separated by "clear".
// Each section becomes one test that runs all ops sequentially.
function groupSections(ops) {
  const sections = []
  let current = { opts: {}, ops: [] }

  for (const op of ops) {
    if (op.op === 'clear') {
      if (current.ops.length > 0) {
        sections.push(current)
      }
      let opts = {}
      if (op.extra) {
        try { opts = JSON.parse(op.extra) } catch {}
      }
      current = { opts, ops: [] }
    } else {
      current.ops.push(op)
    }
  }

  if (current.ops.length > 0) {
    sections.push(current)
  }

  return sections
}

function runTSVFile(filepath) {
  const filename = path.basename(filepath, '.tsv')
  const ops = parseTSV(filepath)
  const sections = groupSections(ops)

  describe(`tsv: ${filename}`, () => {
    for (let si = 0; si < sections.length; si++) {
      const section = sections[si]
      const assertions = section.ops.filter(o =>
        ['find', 'findexact', 'collect', 'list'].includes(o.op)
      )
      if (assertions.length === 0) continue

      const firstAssert = assertions[0]
      const label = `section ${si + 1}: ${assertions.map(a => `${a.op}@L${a.line}`).join(', ')}`

      test(label, () => {
        const pr = Patrun(section.opts)

        for (const { op, pat, data, extra, line } of section.ops) {
          switch (op) {
            case 'add':
              pr.add(pat, data === 'null' ? null : data)
              break

            case 'find': {
              const result = pr.find(pat)
              const expected = data === 'null' ? null : data
              assert.strictEqual(result, expected,
                `L${line}: find(${JSON.stringify(pat)}) expected ${JSON.stringify(expected)} got ${JSON.stringify(result)}`)
              break
            }

            case 'findexact': {
              const result = pr.findexact(pat)
              const expected = data === 'null' ? null : data
              assert.strictEqual(result, expected,
                `L${line}: findexact(${JSON.stringify(pat)}) expected ${JSON.stringify(expected)} got ${JSON.stringify(result)}`)
              break
            }

            case 'remove':
              pr.remove(pat)
              break

            case 'collect': {
              const result = pr.find(pat, false, true)
              let expected
              try { expected = JSON.parse(data) } catch { expected = [] }
              assert.deepStrictEqual(result, expected,
                `L${line}: collect(${JSON.stringify(pat)}) expected ${JSON.stringify(expected)} got ${JSON.stringify(result)}`)
              break
            }

            case 'list': {
              const result = pr.list(pat)
              let expected
              try { expected = JSON.parse(data) } catch { expected = [] }
              const simplified = result.map(r => ({ match: r.match, data: r.data }))
              assert.deepStrictEqual(simplified, expected,
                `L${line}: list(${JSON.stringify(pat)}) expected ${JSON.stringify(expected)} got ${JSON.stringify(simplified)}`)
              break
            }
          }
        }
      })
    }
  })
}

// Discover and run all TSV files
const tsvFiles = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.tsv')).sort()

for (const file of tsvFiles) {
  runTSVFile(path.join(DATA_DIR, file))
}
