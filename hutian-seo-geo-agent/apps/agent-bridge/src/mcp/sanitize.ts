/**
 * T4.2 · MCP inputSchema → OpenAI tools 兼容清洗
 *
 * MCP 工具的 inputSchema 来自 Python pydantic 模型，常见噪声：
 *  - 顶层带 `title: "RunDiagnosisInput"`（pydantic 自动加的类名，OpenAI 不需要）
 *  - `Optional[T]` 派生成 `anyOf: [{type:"T"}, {type:"null"}]`（OpenAI strict 模式拒绝 anyOf）
 *  - 嵌套模型派生 `$defs` + `$ref`（OpenAI strict 模式拒绝 $ref）
 *  - 缺 `additionalProperties` 字段（OpenAI strict 默认要 false）
 *
 * 清洗规则（T4.2 出口门禁要求）：
 *  1. 顶层 type 必须 = "object"，缺则补；缺 properties 默认 {}
 *  2. 递归剥 `title`（pydantic 类名噪声，对 LLM 无意义）
 *  3. `anyOf: [{...}, {type:"null"}]` → 收敛为第一个非 null 类型（Optional 语义）
 *  4. `$ref: "#/$defs/Foo"` → 用 $defs[Foo] 内联替换，删 $defs
 *  5. 缺 `additionalProperties` 默认 false（OpenAI strict 模式要求）
 *
 * 设计：
 *  - 纯函数 + 不可变（输入深拷贝，避免污染 MCP 返回）
 *  - 不抛异常：遇到无法解析的 $ref 退化为空对象，不阻塞派生
 *  - 可单测：导出 sanitizeForOpenAI 主入口 + 内部 sanitizeNode 便于断言
 */

export type JsonSchema = Record<string, any>;

/**
 * 入口：清洗 MCP inputSchema 为 OpenAI tools 兼容格式。
 * 不修改入参，返回新对象。
 */
export function sanitizeForOpenAI(input: unknown): JsonSchema {
  const root = deepClone(input) ?? {};
  const defs = extractDefs(root);
  const cleaned = sanitizeNode(root, defs) as JsonSchema;
  enforceTopObject(cleaned);
  delete cleaned.$defs;
  return cleaned;
}

/** 递归清洗单个节点 */
function sanitizeNode(node: unknown, defs: Record<string, JsonSchema>): unknown {
  if (Array.isArray(node)) {
    return node.map((item) => sanitizeNode(item, defs));
  }
  if (node === null || typeof node !== "object") {
    return node;
  }
  const obj = node as JsonSchema;

  // $ref 解引用：{"$ref": "#/$defs/Foo"} → $defs.Foo（再递归洗一次）
  if (typeof obj.$ref === "string") {
    const resolved = resolveRef(obj.$ref, defs);
    if (resolved) {
      return sanitizeNode(resolved, defs);
    }
    return { type: "object", properties: {} };
  }

  // anyOf 含 null：Optional 语义 → 取非 null 分支
  if (Array.isArray(obj.anyOf)) {
    const nonNull = obj.anyOf.find((branch: any) => branch?.type !== "null");
    if (nonNull) {
      return sanitizeNode(nonNull, defs);
    }
    // 全是 null 或空：退化 object
    return { type: "object", properties: {} };
  }

  const out: JsonSchema = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === "title") continue;          // 剥 title
    if (key === "$defs") continue;          // 顶层 $defs 已 extractDefs 收走
    if (key === "$ref") continue;           // 已处理
    if (key === "anyOf") continue;          // 已处理
    out[key] = sanitizeNode(value, defs);
  }
  return out;
}

/** 顶层补全：type=object、properties 默认 {}、additionalProperties 默认 false */
function enforceTopObject(root: JsonSchema): void {
  if (root.type !== "object") root.type = "object";
  if (!root.properties || typeof root.properties !== "object") {
    root.properties = {};
  }
  if (typeof root.additionalProperties !== "boolean") {
    root.additionalProperties = false;
  }
  if (Array.isArray(root.required) === false) {
    // 缺 required 视为空数组（OpenAI strict 模式要求是数组）
    root.required = [];
  }
}

function extractDefs(root: JsonSchema): Record<string, JsonSchema> {
  if (root.$defs && typeof root.$defs === "object") {
    const defs = root.$defs as Record<string, JsonSchema>;
    return defs;
  }
  return {};
}

function resolveRef(ref: string, defs: Record<string, JsonSchema>): JsonSchema | undefined {
  // 形如 "#/$defs/Foo"
  const m = /^#\/\$defs\/(.+)$/.exec(ref);
  if (!m) return undefined;
  return defs[m[1]];
}

function deepClone<T>(x: T): T | null {
  if (x === null || x === undefined) return null;
  try {
    return JSON.parse(JSON.stringify(x)) as T;
  } catch {
    return null;
  }
}
