// Safe, dependency-free recursive-descent mathematical expression evaluator

type Token =
  | { type: 'num'; value: number }
  | { type: 'op'; value: string }
  | { type: 'fn'; value: string }
  | { type: 'lparen' }
  | { type: 'rparen' };

const FUNCTIONS = new Set(['sin', 'cos', 'tan', 'log', 'ln', 'sqrt', 'abs']);

function tokenize(expr: string): Token[] {
  const normalized = expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/π/g, `(${Math.PI})`)
    .replace(/√/g, 'sqrt')
    .replace(/\s+/g, '');

  const tokens: Token[] = [];
  let i = 0;

  while (i < normalized.length) {
    const ch = normalized[i];

    // Number literal
    if ((ch >= '0' && ch <= '9') || ch === '.') {
      let numStr = '';
      let dotCount = 0;
      while (i < normalized.length && ((normalized[i] >= '0' && normalized[i] <= '9') || normalized[i] === '.')) {
        if (normalized[i] === '.') {
          dotCount++;
          if (dotCount > 1) throw new Error('Invalid decimal');
        }
        numStr += normalized[i++];
      }
      if (numStr === '.') throw new Error('Invalid number');
      const prev = tokens[tokens.length - 1];
      if (prev && prev.type === 'rparen') {
        tokens.push({ type: 'op', value: '*' });
      }
      tokens.push({ type: 'num', value: parseFloat(numStr) });
      continue;
    }

    // Identifiers (functions or constant e)
    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')) {
      let ident = '';
      while (i < normalized.length && /[a-zA-Z]/.test(normalized[i])) {
        ident += normalized[i++].toLowerCase();
      }
      const prev = tokens[tokens.length - 1];
      if (prev && (prev.type === 'num' || prev.type === 'rparen')) {
        tokens.push({ type: 'op', value: '*' });
      }
      if (ident === 'e') {
        tokens.push({ type: 'num', value: Math.E });
      } else if (FUNCTIONS.has(ident)) {
        tokens.push({ type: 'fn', value: ident });
      } else {
        throw new Error(`Unknown symbol: ${ident}`);
      }
      continue;
    }

    if (ch === '(') {
      const prev = tokens[tokens.length - 1];
      if (prev && (prev.type === 'num' || prev.type === 'rparen')) {
        tokens.push({ type: 'op', value: '*' });
      }
      tokens.push({ type: 'lparen' });
      i++;
      continue;
    }

    if (ch === ')') {
      tokens.push({ type: 'rparen' });
      i++;
      continue;
    }

    if (ch === '%') {
      // Treat % as / 100 postfix operator
      tokens.push({ type: 'op', value: '/' });
      tokens.push({ type: 'num', value: 100 });
      i++;
      continue;
    }

    if ('+-*/^'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }

    throw new Error(`Unexpected character: ${ch}`);
  }

  return tokens;
}

export function evaluateMathExpression(expr: string): number {
  const tokens = tokenize(expr);
  if (tokens.length === 0) throw new Error('Empty expression');
  let pos = 0;

  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  function parseExpression(): number {
    let left = parseTerm();
    while (peek()?.type === 'op' && (peek() as { type: 'op'; value: string }).value.match(/^[+-]$/)) {
      const op = (consume() as { type: 'op'; value: string }).value;
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseTerm(): number {
    let left = parsePower();
    while (peek()?.type === 'op' && (peek() as { type: 'op'; value: string }).value.match(/^[*/]$/)) {
      const op = (consume() as { type: 'op'; value: string }).value;
      const right = parsePower();
      if (op === '/') {
        if (right === 0) throw new Error('Division by zero');
        left = left / right;
      } else {
        left = left * right;
      }
    }
    return left;
  }

  function parsePower(): number {
    const base = parseUnary();
    if (peek()?.type === 'op' && (peek() as { type: 'op'; value: string }).value === '^') {
      consume();
      const exp = parsePower(); // right-associative
      return Math.pow(base, exp);
    }
    return base;
  }

  function parseUnary(): number {
    if (peek()?.type === 'op') {
      const op = (peek() as { type: 'op'; value: string }).value;
      if (op === '-') {
        consume();
        return -parseUnary();
      }
      if (op === '+') {
        consume();
        return parseUnary();
      }
    }
    return parsePrimary();
  }

  function parsePrimary(): number {
    const tok = peek();
    if (!tok) throw new Error('Unexpected end of expression');

    if (tok.type === 'num') {
      consume();
      return tok.value;
    }

    if (tok.type === 'fn') {
      consume();
      let arg: number;
      if (peek()?.type === 'lparen') {
        consume();
        arg = parseExpression();
        if (peek()?.type !== 'rparen') throw new Error('Missing closing parenthesis');
        consume();
      } else {
        arg = parseUnary();
      }

      switch (tok.value) {
        case 'sin':
          return Math.sin((arg * Math.PI) / 180);
        case 'cos':
          return Math.cos((arg * Math.PI) / 180);
        case 'tan':
          return Math.tan((arg * Math.PI) / 180);
        case 'log':
          if (arg <= 0) throw new Error('Invalid log input');
          return Math.log10(arg);
        case 'ln':
          if (arg <= 0) throw new Error('Invalid ln input');
          return Math.log(arg);
        case 'sqrt':
          if (arg < 0) throw new Error('Negative root');
          return Math.sqrt(arg);
        case 'abs':
          return Math.abs(arg);
        default:
          throw new Error('Unknown function');
      }
    }

    if (tok.type === 'lparen') {
      consume();
      const val = parseExpression();
      if (peek()?.type !== 'rparen') throw new Error('Missing closing parenthesis');
      consume();
      return val;
    }

    throw new Error('Invalid syntax');
  }

  const result = parseExpression();
  if (pos < tokens.length) {
    throw new Error('Unexpected trailing input');
  }
  if (!Number.isFinite(result)) {
    throw new Error('Math overflow');
  }
  // Clean floating point artifacts (e.g., 0.1 + 0.2 = 0.3)
  return Number(result.toPrecision(12));
}

export function formatMathResult(val: number): string {
  if (!Number.isFinite(val)) return 'Error';
  if (Math.abs(val) >= 1e12 || (Math.abs(val) > 0 && Math.abs(val) < 1e-8)) {
    return val.toExponential(6).replace(/\.?0+e/, 'e');
  }
  return String(Number(val.toFixed(10)));
}
