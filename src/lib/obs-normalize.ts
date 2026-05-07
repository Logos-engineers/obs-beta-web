import type { ObsSection, ObsTreeNode } from "@/types/obs";

type RawRecord = Record<string, unknown>;
type FlatItem = {
  text: string;
  level: number;
  role: string;
  answer: string | null;
};

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function fillBlank(text: string, answer?: unknown): string {
  const answerText = asText(answer);
  if (!text) return "";
  return answerText ? text.replace("( )", `(${answerText})`) : text;
}

function isQuestionLike(text: string): boolean {
  return /[?？]$/.test(text) || text.endsWith("까요") || text.endsWith("까요?");
}

function extractFlatItems(section: RawRecord): FlatItem[] {
  const items = Array.isArray(section.items) ? section.items : null;

  if (items && items.length > 0 && typeof items[0] === "object" && items[0] && "children" in (items[0] as RawRecord)) {
    return [];
  }

  if (items) {
    return items
      .map<FlatItem | null>((item) => {
        if (!item || typeof item !== "object") return null;
        const record = item as RawRecord;
        const text = asText(record.text);
        if (!text) return null;
        return {
          text,
          level: Number(record.level ?? 1) || 1,
          role: asText(record.role) || "QUESTION",
          answer: asText(record.answer) || null,
        };
      })
      .filter((item): item is FlatItem => item !== null);
  }

  const questions = Array.isArray(section.questions) ? section.questions : [];
  return questions
    .map<FlatItem | null>((item) => {
      if (typeof item === "string") {
        const text = asText(item);
        return text ? { text, level: 1, role: "QUESTION", answer: null } : null;
      }
      if (!item || typeof item !== "object") return null;
      const record = item as RawRecord;
      const text = asText(record.text);
      if (!text) return null;
      return {
        text,
        level: Number(record.level ?? 1) || 1,
        role: asText(record.role) || "QUESTION",
        answer: asText(record.answer) || null,
      };
    })
    .filter((item): item is FlatItem => item !== null);
}

const CIRCLED_NUMBERS = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];

function formatNumber(depth: number, index: number): string {
  if (depth <= 0) return `${index}.`;
  if (depth === 1) return `(${index})`;
  if (depth === 2) return `${index})`;
  if (depth === 3) return CIRCLED_NUMBERS[index - 1] ?? `${index}.`;
  if (depth === 4) return `${String.fromCharCode(96 + index)}.`;
  return `${index}.`;
}

function assignNumbers(nodes: ObsTreeNode[], depth: number): void {
  nodes.forEach((node, idx) => {
    node.number = node.numbered === false ? "" : formatNumber(depth, idx + 1);
    assignNumbers(node.children, depth + 1);
  });
}

function buildTree(flatItems: FlatItem[]): ObsTreeNode[] {
  const roots: ObsTreeNode[] = [];
  const stack: ObsTreeNode[] = [];

  flatItems.forEach((item) => {
    const text = fillBlank(item.text, item.answer);
    if (!text) return;

    if (item.role === "NOTE") {
      const target = stack[Math.min(stack.length, item.level) - 1] ?? stack[stack.length - 1];
      if (target) target.notes.push(text);
      return;
    }

    const node: ObsTreeNode = {
      number: "",
      text,
      answer: item.answer ?? null,
      numbered: true,
      children: [],
      notes: [],
    };

    while (stack.length >= item.level) stack.pop();

    if (item.level <= 1 || stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }

    stack.push(node);
  });

  return roots;
}

function extractIntroPrompts(section: RawRecord): string[] {
  return extractFlatItems(section)
    .map((item) => fillBlank(item.text, item.answer))
    .filter(Boolean);
}

function normalizeApplication(section: RawRecord): ObsSection {
  const existingItems = Array.isArray(section.items) ? section.items : [];
  const normalizedItems =
    existingItems.length > 0 && typeof existingItems[0] === "object" && existingItems[0] && "children" in (existingItems[0] as RawRecord)
      ? (existingItems as ObsTreeNode[])
      : buildTree(extractFlatItems(section));

  assignNumbers(normalizedItems, 0);
  return {
    type: "application",
    items: normalizedItems,
  };
}

export function normalizeObsSections(rawSections: unknown): ObsSection[] {
  const source = Array.isArray(rawSections) ? rawSections : [];
  const normalized: ObsSection[] = [];
  const introPrompts: string[] = [];
  let pendingPoint: Extract<ObsSection, { type: "point" }> | null = null;

  source.forEach((section) => {
    if (!section || typeof section !== "object") return;
    const record = section as RawRecord;
    const type = asText(record.type);

    if (type === "intro") {
      introPrompts.push(...extractIntroPrompts(record));
      normalized.push({
        type: "intro",
        text: asText(record.text),
      });
      return;
    }

    if (type !== "point") return;

    const title = fillBlank(asText(record.title), record.answer);
    const answer = asText(record.answer) || null;
    const items =
      Array.isArray(record.items) &&
      record.items.length > 0 &&
      typeof record.items[0] === "object" &&
      record.items[0] &&
      "children" in (record.items[0] as RawRecord)
        ? (record.items as ObsTreeNode[])
        : buildTree(extractFlatItems(record));

    if (isQuestionLike(title)) {
      pendingPoint = {
        type: "point",
        number: normalized.filter((s) => s.type === "point").length + 1,
        title,
        answer,
        reference: asText(record.reference),
        items,
      };
      normalized.push(pendingPoint);
      return;
    }

    const child: ObsTreeNode = {
      number: "",
      text: title,
      answer,
      reference: asText(record.reference) || null,
      children: items,
      notes: [],
    };

    if (!pendingPoint) {
      pendingPoint = {
        type: "point",
        number: normalized.filter((s) => s.type === "point").length + 1,
        title: introPrompts.shift() || title,
        answer: null,
        reference: "",
        items: [],
      };
      normalized.push(pendingPoint);
    }

    pendingPoint.items.push(child);
  });

  source.forEach((section) => {
    if (!section || typeof section !== "object") return;
    const record = section as RawRecord;
    if (asText(record.type) === "application") {
      normalized.push(normalizeApplication(record));
    }
  });

  normalized.forEach((section) => {
    if (section.type === "point") assignNumbers(section.items, 1);
  });

  return normalized;
}
