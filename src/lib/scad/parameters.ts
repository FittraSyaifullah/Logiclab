export type ParameterValue = number | string | boolean | number[] | string[] | boolean[]

export type ParameterLike = {
  name: string
  type?: 'number' | 'string' | 'boolean' | 'number[]' | 'string[]' | 'boolean[]'
  value: ParameterValue
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function escapeQuotes(input: string): string {
  return input.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function escapeReplacement(input: string): string {
  // Ensure replacement strings for String.replace do not interpret $ groups
  return input.replace(/\$/g, '$$$$')
}

function toScadValue(param: ParameterLike): string {
  const { type, value } = param
  switch (type) {
    case 'string':
      return `"${escapeReplacement(escapeQuotes(String(value)))}"`
    case 'boolean':
      return String(Boolean(value))
    case 'number':
      return String(Number(value))
    case 'string[]': {
      const arr = Array.isArray(value) ? (value as string[]) : []
      const body = arr.map((v) => `"${escapeReplacement(escapeQuotes(String(v)))}"`).join(',')
      return `[${body}]`
    }
    case 'number[]': {
      const arr = Array.isArray(value) ? (value as number[]) : []
      const body = arr.map((v) => String(Number(v))).join(',')
      return `[${body}]`
    }
    case 'boolean[]': {
      const arr = Array.isArray(value) ? (value as boolean[]) : []
      const body = arr.map((v) => String(Boolean(v))).join(',')
      return `[${body}]`
    }
    default: {
      // default to number
      if (Array.isArray(value)) {
        return `[${(value as any[]).join(',')}]`
      }
      if (typeof value === 'string') return `"${escapeReplacement(escapeQuotes(value))}"`
      return String(value)
    }
  }
}

// Update a single-line assignment `name = <expr>;` (with optional trailing comment)
export function updateParameterAssignment(sourceCode: string, parameter: ParameterLike): string {
  const escapedName = escapeRegExp(parameter.name)
  const regex = new RegExp(`^\\s*(${escapedName}\\s*=\\s*)[^;]+;([\\t\\f\\x0B ]*\/\/[^\n]*)?`, 'm')
  const replacement = `$1${toScadValue(parameter)};$2`
  if (regex.test(sourceCode)) {
    return sourceCode.replace(regex, replacement)
  }
  return sourceCode
}

export function updateScadParameters(sourceCode: string, parameters: ParameterLike[], options?: { injectIfMissing?: boolean }): string {
  let code = sourceCode
  for (const p of parameters) {
    const next = updateParameterAssignment(code, p)
    if (next === code && options?.injectIfMissing) {
      // Inject a line near the top if missing
      const line = `${p.name} = ${toScadValue(p)}; // injected by UI\n`
      code = line + code
    } else {
      code = next
    }
  }
  return code
}


