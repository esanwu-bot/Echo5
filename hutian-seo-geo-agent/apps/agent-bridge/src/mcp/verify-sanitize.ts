/**
 * T4.2 单元门禁 · sanitizeForOpenAI 清洗规则断言
 *
 * 用法：
 *   cd apps/agent-bridge && npm run verify:sanitize
 *
 * 断言（每条独立计数）：
 *  1. 顶层 type=object，缺则补
 *  2. 缺 properties 默认 {}
 *  3. 缺 additionalProperties 默认 false
 *  4. 缺 required 默认 []
 *  5. 递归剥 title（顶层 + 嵌套）
 *  6. anyOf 含 null 收敛为非 null 分支
 *  7. $ref 内联 + $defs 删除
 *  8. 输入不可变（深拷贝）
 */
import { sanitizeForOpenAI } from "./sanitize.ts";

type CheckFn = (out: Record<string, any>, input: unknown) => boolean;

interface Case {
  name: string;
  input: unknown;
  check: CheckFn;
  desc: string;
}

const cases: Case[] = [
  {
    name: "1. 顶层 type=object 缺则补",
    input: { properties: {} },
    check: (o) => o.type === "object",
    desc: "输入无 type，输出应有 type='object'",
  },
  {
    name: "2. properties 缺默认 {}",
    input: { type: "object" },
    check: (o) => typeof o.properties === "object" && o.properties !== null,
    desc: "输入无 properties，输出应有空 properties 对象",
  },
  {
    name: "3. additionalProperties 缺默认 false",
    input: { type: "object", properties: {} },
    check: (o) => o.additionalProperties === false,
    desc: "缺则补 false（OpenAI strict 要求）",
  },
  {
    name: "4. required 缺默认 []",
    input: { type: "object", properties: {} },
    check: (o) => Array.isArray(o.required) && o.required.length === 0,
    desc: "缺则补空数组",
  },
  {
    name: "5. 顶层 title 剥除",
    input: { title: "RunDiagnosisInput", type: "object", properties: {} },
    check: (o) => !("title" in o),
    desc: "pydantic 类名噪声必须剥",
  },
  {
    name: "5b. 嵌套 title 递归剥除",
    input: {
      type: "object",
      properties: {
        url: { type: "string", title: "Url", description: "x" },
      },
    },
    check: (o) => !("title" in o.properties.url) && o.properties.url.description === "x",
    desc: "嵌套属性上的 title 也要剥，description 保留",
  },
  {
    name: "6. anyOf 含 null 收敛",
    input: {
      type: "object",
      properties: {
        expected_type: { anyOf: [{ type: "string" }, { type: "null" }], default: "" },
      },
    },
    check: (o) => o.properties.expected_type.type === "string" && !("anyOf" in o.properties.expected_type),
    desc: "Optional[T] 派生的 anyOf 应收敛为 T，default 保留",
  },
  {
    name: "7. $ref 内联 + $defs 删除",
    input: {
      type: "object",
      properties: {
        nested: { $ref: "#/$defs/Foo" },
      },
      $defs: {
        Foo: { type: "object", properties: { x: { type: "string" } } },
      },
    },
    check: (o) =>
      o.properties.nested.type === "object" &&
      o.properties.nested.properties.x.type === "string" &&
      !("$ref" in o.properties.nested) &&
      !("$defs" in o),
    desc: "$ref 解引用后内联，顶层 $defs 删除",
  },
  {
    name: "8. 输入不可变",
    input: { title: "X", type: "object", properties: {} },
    check: (_o: Record<string, any>, input: unknown) => (input as any).title === "X",
    desc: "输入对象不应被修改（深拷贝）",
  },
];

async function main() {
  console.log("=== T4.2 单元门禁：sanitizeForOpenAI ===\n");

  let pass = 0;
  let fail = 0;

  for (const c of cases) {
    // 注意 case 8 需要原始 input 引用
    const inputCopy = JSON.parse(JSON.stringify(c.input));
    const out = sanitizeForOpenAI(c.input);
    const ok = c.check(out, inputCopy);
    console.log(`  ${ok ? "✅" : "❌"} ${c.name}`);
    if (!ok) {
      console.log(`     desc: ${c.desc}`);
      console.log(`     input : ${JSON.stringify(c.input)}`);
      console.log(`     output: ${JSON.stringify(out)}`);
      fail++;
    } else {
      pass++;
    }
  }

  console.log(`\n=== ${pass}/${cases.length} 通过 ===`);
  process.exit(fail === 0 ? 0 : 1);
}

main();
