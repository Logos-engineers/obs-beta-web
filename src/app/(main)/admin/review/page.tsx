"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAdmin, readSession } from "@/lib/session";
import { createObsContent, publishObsContent } from "@/lib/api";
import type { AnalyzeResult, ObsQuiz, ObsSection, ObsTreeNode } from "@/types/obs";

type PointSection = Extract<ObsSection, { type: "point" }>;
type ApplicationSection = Extract<ObsSection, { type: "application" }>;

function createEmptyNode(): ObsTreeNode {
  return {
    number: "",
    text: "",
    answer: null,
    numbered: true,
    children: [],
    notes: [],
  };
}

function ordinalLabel(num: number): string {
  const labels = ["", "첫", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉", "열"];
  return labels[num] ? `${labels[num]}번째 질문` : `${num}번째 질문`;
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

function renumberNodes(nodes: ObsTreeNode[], depth: number): ObsTreeNode[] {
  return nodes.map((node, index) => ({
    ...node,
    number: node.numbered === false ? "" : formatNumber(depth, index + 1),
    children: renumberNodes(node.children, depth + 1),
  }));
}

function renumberSections(sections: ObsSection[]): ObsSection[] {
  let pointCount = 0;
  return sections.map((section) => {
    if (section.type === "point") {
      pointCount += 1;
      return {
        ...section,
        number: pointCount,
        items: renumberNodes(section.items, 1),
      };
    }
    if (section.type === "application") {
      return {
        ...section,
        items: renumberNodes(section.items, 0),
      };
    }
    return section;
  });
}

function getNodeListAtPath(nodes: ObsTreeNode[], parentPath: number[]): ObsTreeNode[] {
  let current = nodes;
  for (const index of parentPath) {
    current = current[index].children;
  }
  return current;
}

function updateTree(nodes: ObsTreeNode[], mutator: (draft: ObsTreeNode[]) => void, rootDepth: number): ObsTreeNode[] {
  const draft = structuredClone(nodes) as ObsTreeNode[];
  mutator(draft);
  return renumberNodes(draft, rootDepth);
}

function TreeNodeEditor({
  node,
  path,
  rootDepth,
  onItemsChange,
}: {
  node: ObsTreeNode;
  path: number[];
  rootDepth: number;
  onItemsChange: (updater: (items: ObsTreeNode[]) => ObsTreeNode[]) => void;
}) {
  const depth = path.length;
  const canIndent = path[path.length - 1] > 0;
  const canOutdent = path.length > 1;

  const updateCurrentNode = (updater: (draft: ObsTreeNode) => void) => {
    onItemsChange((items) =>
      updateTree(items, (draft) => {
        const siblings = getNodeListAtPath(draft, path.slice(0, -1));
        updater(siblings[path[path.length - 1]]);
      }, rootDepth),
    );
  };

  const withSiblingList = (updater: (siblings: ObsTreeNode[], index: number) => void) => {
    onItemsChange((items) =>
      updateTree(items, (draft) => {
        const siblings = getNodeListAtPath(draft, path.slice(0, -1));
        updater(siblings, path[path.length - 1]);
      }, rootDepth),
    );
  };

  return (
    <div
      style={{
        marginTop: 12,
        marginLeft: depth > 1 ? 18 : 0,
        padding: "12px",
        borderRadius: 14,
        border: "1px solid rgba(13,28,45,0.1)",
        background: depth === 1 ? "#fffdf8" : "#fafbfc",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span
          style={{
            minWidth: node.number ? 36 : 54,
            height: 32,
            padding: "0 10px",
            borderRadius: 9,
            background: node.number ? "#F2F4F7" : "rgba(13,28,45,0.05)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 700,
            color: "rgba(13,28,45,0.8)",
          }}
        >
          {node.number || "무번호"}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(13,28,45,0.5)" }}>
          depth {depth}
        </span>
      </div>

      <label style={fieldLabelStyle}>질문/문장</label>
      <textarea
        rows={depth === 1 ? 3 : 2}
        value={node.text}
        onChange={(e) => updateCurrentNode((draft) => { draft.text = e.target.value; })}
        style={textareaStyle}
      />

      {node.reference !== undefined ? (
        <>
          <label style={fieldLabelStyle}>참조</label>
          <input
            type="text"
            value={node.reference ?? ""}
            onChange={(e) => updateCurrentNode((draft) => { draft.reference = e.target.value || null; })}
            style={inputStyle}
          />
        </>
      ) : null}

      <div style={toolbarRowStyle}>
        <MiniButton onClick={() => withSiblingList((siblings, index) => siblings.splice(index + 1, 0, createEmptyNode()))}>
          같은 레벨 추가
        </MiniButton>
        <MiniButton onClick={() => updateCurrentNode((draft) => draft.children.push(createEmptyNode()))}>
          하위 질문 추가
        </MiniButton>
        <MiniButton onClick={() => updateCurrentNode((draft) => draft.notes.push(""))}>
          해설 추가
        </MiniButton>
      </div>

      <div style={toolbarRowStyle}>
        <MiniButton
          disabled={!canIndent}
          onClick={() =>
            withSiblingList((siblings, index) => {
              if (index <= 0) return;
              const [current] = siblings.splice(index, 1);
              siblings[index - 1].children.push(current);
            })
          }
        >
          들여쓰기
        </MiniButton>
        <MiniButton
          disabled={!canOutdent}
          onClick={() =>
            onItemsChange((items) =>
              updateTree(items, (draft) => {
                const parentPath = path.slice(0, -1);
                const grandParentPath = path.slice(0, -2);
                const childIndex = path[path.length - 1];
                const parentIndex = parentPath[parentPath.length - 1];
                const parentSiblings = getNodeListAtPath(draft, grandParentPath);
                const parentNode = parentSiblings[parentIndex];
                const [current] = parentNode.children.splice(childIndex, 1);
                parentSiblings.splice(parentIndex + 1, 0, current);
              }, rootDepth),
            )
          }
        >
          내어쓰기
        </MiniButton>
        <MiniButton onClick={() => withSiblingList((siblings, index) => { if (index > 0) [siblings[index - 1], siblings[index]] = [siblings[index], siblings[index - 1]]; })}>
          위로
        </MiniButton>
        <MiniButton onClick={() => withSiblingList((siblings, index) => { if (index < siblings.length - 1) [siblings[index], siblings[index + 1]] = [siblings[index + 1], siblings[index]]; })}>
          아래로
        </MiniButton>
        <MiniButton
          tone="danger"
          onClick={() => withSiblingList((siblings, index) => siblings.splice(index, 1))}
        >
          삭제
        </MiniButton>
      </div>

      {node.notes.length > 0 ? (
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {node.notes.map((note, noteIndex) => (
            <div
              key={noteIndex}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px dashed rgba(13,28,45,0.18)",
                background: "#f8fafc",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#1A56DB" }}>▶ 해설</span>
                <MiniButton tone="danger" onClick={() => updateCurrentNode((draft) => { draft.notes.splice(noteIndex, 1); })}>
                  해설 삭제
                </MiniButton>
              </div>
              <textarea
                rows={3}
                value={note}
                onChange={(e) =>
                  updateCurrentNode((draft) => {
                    draft.notes[noteIndex] = e.target.value;
                  })
                }
                style={textareaStyle}
              />
            </div>
          ))}
        </div>
      ) : null}

      {node.children.length > 0 ? (
        <div style={{ marginTop: 8 }}>
          {node.children.map((child, index) => (
            <TreeNodeEditor
              key={`${path.join("-")}-${index}`}
              node={child}
              path={[...path, index]}
              rootDepth={rootDepth}
              onItemsChange={onItemsChange}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TreePreview({ nodes }: { nodes: ObsTreeNode[] }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {nodes.map((node, index) => (
        <TreePreviewNode key={`${node.number}-${index}`} node={node} depth={0} />
      ))}
    </div>
  );
}

function TreePreviewNode({ node, depth }: { node: ObsTreeNode; depth: number }) {
  return (
    <div style={{ marginLeft: depth > 0 ? 18 : 0 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 10 }}>
        {node.number ? (
          <span
            style={{
              minWidth: 34,
              height: 30,
              borderRadius: 8,
              background: "#F2F4F7",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              color: "rgba(13,28,45,0.8)",
            }}
          >
            {node.number}
          </span>
        ) : (
          <span
            style={{
              width: 34,
              height: 30,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(13,28,45,0.24)",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ·
          </span>
        )}
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: "rgba(13,28,45,0.82)", fontWeight: depth === 0 ? 700 : 500 }}>
          {node.text}
        </p>
      </div>

      {node.notes.map((note, index) => (
        <div
          key={`${node.number}-note-${index}`}
          style={{
            marginTop: 8,
            marginLeft: 44,
            padding: "10px 12px",
            borderRadius: 12,
            background: "#f8fafc",
            border: "1px solid rgba(13,28,45,0.08)",
            color: "#465467",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: "#1A56DB" }}>▶ </strong>
          {note}
        </div>
      ))}

      {node.children.length > 0 ? (
        <div style={{ marginTop: 6, paddingLeft: 14, borderLeft: "2px dashed rgba(13,28,45,0.12)" }}>
          {node.children.map((child, index) => (
            <TreePreviewNode key={`${child.number}-${index}`} node={child} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MiniButton({
  children,
  onClick,
  disabled,
  tone = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: "8px 10px",
        borderRadius: 10,
        border: `1px solid ${tone === "danger" ? "rgba(220,38,38,0.18)" : "rgba(13,28,45,0.12)"}`,
        background: tone === "danger" ? "rgba(220,38,38,0.06)" : "white",
        color: tone === "danger" ? "#DC2626" : "rgba(13,28,45,0.72)",
        fontSize: 12,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

function SectionCard({
  section,
  index,
  totalSections,
  onChange,
  onMove,
  onDelete,
}: {
  section: ObsSection;
  index: number;
  totalSections: number;
  onChange: (updated: ObsSection) => void;
  onMove: (direction: "up" | "down") => void;
  onDelete: () => void;
}) {
  const panelStyle: React.CSSProperties = {
    display: "grid",
    gap: 16,
  };

  const headerLabel =
    section.type === "intro"
      ? "도입 요약"
      : section.type === "application"
        ? "적용 질문"
        : ordinalLabel(section.number);

  const actionBar = (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <MiniButton disabled={index === 0} onClick={() => onMove("up")}>섹션 위로</MiniButton>
      <MiniButton disabled={index === totalSections - 1} onClick={() => onMove("down")}>섹션 아래로</MiniButton>
      {section.type !== "intro" ? (
        <MiniButton tone="danger" onClick={onDelete}>섹션 삭제</MiniButton>
      ) : null}
    </div>
  );

  if (section.type === "intro") {
    return (
      <div style={cardStyle}>
        <div style={sectionTopStyle}>
          <div>
            <p style={sectionLabelStyle}>{headerLabel}</p>
            <p style={sectionMetaStyle}>도입 문단을 다듬는 영역입니다.</p>
          </div>
          {actionBar}
        </div>
        <textarea
          value={section.text}
          rows={6}
          onChange={(e) => onChange({ ...section, text: e.target.value })}
          style={textareaStyle}
        />
      </div>
    );
  }

  if (section.type === "application") {
    const updateItems = (updater: (items: ObsTreeNode[]) => ObsTreeNode[]) => {
      onChange({ ...section, items: updater(section.items) });
    };

    return (
      <div style={cardStyle}>
        <div style={sectionTopStyle}>
          <div>
            <p style={sectionLabelStyle}>{headerLabel}</p>
            <p style={sectionMetaStyle}>적용 질문 트리를 수정합니다.</p>
          </div>
          {actionBar}
        </div>

        <div style={panelStyle}>
          <div>
            <label style={fieldLabelStyle}>편집기</label>
            <MiniButton onClick={() => updateItems((items) => [...items, createEmptyNode()])}>질문 추가</MiniButton>
            {section.items.map((node, nodeIndex) => (
              <TreeNodeEditor
                key={`application-${nodeIndex}`}
                node={node}
                path={[nodeIndex]}
                rootDepth={0}
                onItemsChange={updateItems}
              />
            ))}
          </div>

          <div style={previewPanelStyle}>
            <p style={previewTitleStyle}>미리보기</p>
            <TreePreview nodes={section.items} />
          </div>
        </div>
      </div>
    );
  }

  const updateItems = (updater: (items: ObsTreeNode[]) => ObsTreeNode[]) => {
    onChange({ ...section, items: updater(section.items) });
  };

  return (
    <div style={cardStyle}>
      <div style={sectionTopStyle}>
        <div>
          <p style={sectionLabelStyle}>{headerLabel}</p>
          <p style={sectionMetaStyle}>질문 카드 제목과 내부 depth를 모두 수정할 수 있습니다.</p>
        </div>
        {actionBar}
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <label style={fieldLabelStyle}>카드 제목</label>
          <textarea
            value={section.title}
            rows={2}
            onChange={(e) => onChange({ ...section, title: e.target.value })}
            style={textareaStyle}
          />
        </div>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
          <div>
            <label style={fieldLabelStyle}>본문 참조</label>
            <input
              type="text"
              value={section.reference}
              onChange={(e) => onChange({ ...section, reference: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={fieldLabelStyle}>빈칸 정답</label>
            <input
              type="text"
              value={section.answer ?? ""}
              onChange={(e) => onChange({ ...section, answer: e.target.value || null })}
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 18, marginTop: 18 }}>
        <div>
          <label style={fieldLabelStyle}>트리 편집기</label>
          <MiniButton onClick={() => updateItems((items) => [...items, createEmptyNode()])}>루트 질문 추가</MiniButton>
          {section.items.map((node, nodeIndex) => (
            <TreeNodeEditor
              key={`point-${section.number}-${nodeIndex}`}
              node={node}
              path={[nodeIndex]}
              rootDepth={1}
              onItemsChange={updateItems}
            />
          ))}
        </div>

        <div style={previewPanelStyle}>
          <p style={previewTitleStyle}>카드 미리보기</p>
          <div
            style={{
              borderRadius: 16,
              border: "1px solid rgba(13,28,45,0.08)",
              background: "#ffffff",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: 16, display: "flex", gap: 12, alignItems: "center", borderBottom: "1px solid rgba(13,28,45,0.06)" }}>
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "rgba(101,97,255,0.12)",
                  color: "#6561FF",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                }}
              >
                Q
              </span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "rgba(13,28,45,0.82)" }}>{headerLabel}</div>
              </div>
            </div>
            <div style={{ padding: 16 }}>
              <TreePreview
                nodes={[
                  {
                    number: `${section.number}`,
                    text: section.title,
                    answer: section.answer,
                    reference: section.reference,
                    children: section.items,
                    notes: [],
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuizCard({ quiz, index, onChange }: {
  quiz: ObsQuiz;
  index: number;
  onChange: (updated: ObsQuiz) => void;
}) {
  return (
    <div style={cardStyle}>
      <p style={sectionLabelStyle}>퀴즈 {index + 1}</p>

      <label style={fieldLabelStyle}>문제 유형</label>
      <input
        type="text"
        value={quiz.questionType}
        onChange={(e) => onChange({ ...quiz, questionType: e.target.value })}
        style={inputStyle}
      />

      <label style={fieldLabelStyle}>문제</label>
      <textarea
        value={quiz.questionText}
        rows={3}
        onChange={(e) => onChange({ ...quiz, questionText: e.target.value })}
        style={textareaStyle}
      />

      <label style={fieldLabelStyle}>정답</label>
      <input
        type="text"
        value={quiz.correctAnswer ?? ""}
        onChange={(e) => onChange({ ...quiz, correctAnswer: e.target.value || null })}
        style={inputStyle}
      />

      <label style={fieldLabelStyle}>해설</label>
      <textarea
        value={quiz.explanation ?? ""}
        rows={2}
        onChange={(e) => onChange({ ...quiz, explanation: e.target.value || null })}
        style={textareaStyle}
      />
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "white",
  borderRadius: 16,
  padding: "18px",
  marginBottom: 14,
  border: "1px solid rgba(13,28,45,0.08)",
  boxShadow: "0 18px 30px rgba(13, 28, 45, 0.04)",
};

const sectionTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 14,
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#1A56DB",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  marginBottom: 6,
  marginTop: 0,
};

const sectionMetaStyle: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.5,
  color: "rgba(13,28,45,0.52)",
  margin: 0,
};

const fieldLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  color: "rgba(13,28,45,0.55)",
  marginBottom: 6,
  marginTop: 10,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(13,28,45,0.14)",
  fontSize: 14,
  color: "#0D1C2D",
  background: "white",
  boxSizing: "border-box" as const,
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical" as const,
  lineHeight: "1.55",
  minHeight: 72,
};

const toolbarRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 10,
};

const previewPanelStyle: React.CSSProperties = {
  marginTop: 12,
  padding: 14,
  borderRadius: 16,
  background: "#f8fafc",
  border: "1px solid rgba(13,28,45,0.08)",
};

const previewTitleStyle: React.CSSProperties = {
  margin: "0 0 10px",
  fontSize: 12,
  fontWeight: 700,
  color: "rgba(13,28,45,0.56)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
};

export default function AdminReviewPage() {
  const router = useRouter();

  const [checked, setChecked] = useState(false);
  const [sections, setSections] = useState<ObsSection[]>([]);
  const [quizzes, setQuizzes] = useState<ObsQuiz[]>([]);
  const [summary, setSummary] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [biblePassage, setBiblePassage] = useState("");
  const [publishedDate, setPublishedDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!isAdmin()) {
      router.replace("/");
      return;
    }

    const raw = sessionStorage.getItem("obs-analyze-result");
    if (!raw) {
      router.replace("/admin");
      return;
    }

    try {
      const data = JSON.parse(raw) as AnalyzeResult;
      setSections(renumberSections(data.sections ?? []));
      setQuizzes(data.quizzes ?? []);
      setSummary(data.summary ?? []);
    } catch {
      router.replace("/admin");
      return;
    }

    setChecked(true);
  }, [router]);

  if (!checked) {
    return <main className="review-loading-screen">불러오는 중...</main>;
  }

  const updateSection = (index: number, updated: ObsSection) => {
    setSections((prev) => renumberSections(prev.map((section, i) => (i === index ? updated : section))));
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    setSections((prev) => {
      const next = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return renumberSections(next);
    });
  };

  const deleteSection = (index: number) => {
    setSections((prev) => renumberSections(prev.filter((_, i) => i !== index)));
  };

  const addPointSection = () => {
    setSections((prev) =>
      renumberSections([
        ...prev,
        {
          type: "point",
          number: 0,
          title: "",
          answer: null,
          reference: "",
          items: [],
        },
      ]),
    );
  };

  const addApplicationSection = () => {
    setSections((prev) =>
      renumberSections([
        ...prev.filter((section) => section.type !== "application"),
        {
          type: "application",
          items: [],
        },
      ]),
    );
  };

  const validateBasicInfo = (): boolean => {
    if (!title.trim()) {
      setErrorMessage("제목을 입력해 주세요.");
      return false;
    }
    if (!biblePassage.trim()) {
      setErrorMessage("성경 본문을 입력해 주세요.");
      return false;
    }
    if (!publishedDate) {
      setErrorMessage("발행일을 선택해 주세요.");
      return false;
    }
    return true;
  };

  const buildRequest = () => ({
    title: title.trim(),
    biblePassage: biblePassage.trim(),
    publishedDate,
    sections: renumberSections(sections),
    summary,
    quizzes: quizzes.map(({ id: _id, ...rest }) => rest),
  });

  const handleSave = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    if (!validateBasicInfo()) return;

    try {
      setSaving(true);
      const saved = await createObsContent(buildRequest());
      sessionStorage.removeItem("obs-analyze-result");
      if (saved.id) {
        router.push(`/admin/complete?id=${saved.id}`);
      } else {
        router.push("/admin");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setErrorMessage("");
    setSuccessMessage("");
    if (!validateBasicInfo()) return;

    try {
      setPublishing(true);
      const saved = await createObsContent(buildRequest());
      await publishObsContent(saved.id, true);
      sessionStorage.removeItem("obs-analyze-result");
      setSuccessMessage("교안이 저장되고 발행되었습니다.");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "발행에 실패했습니다.");
    } finally {
      setPublishing(false);
    }
  };

  const handleReanalyze = () => {
    router.push("/admin");
  };

  const isActionDisabled = saving || publishing;

  return (
    <main className="screen">
      <div style={{ padding: "24px 16px", maxWidth: 980, margin: "0 auto", paddingBottom: 140 }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0D1C2D", marginBottom: 8 }}>
            교안 검토 및 구조 편집
          </h1>
          <p style={{ margin: 0, color: "rgba(13,28,45,0.58)", lineHeight: 1.6, fontSize: 14 }}>
            발행 전에 카드 제목, 질문 depth, 해설 블록까지 직접 정리할 수 있습니다.
          </p>
        </div>

        <div style={cardStyle}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#0D1C2D", marginBottom: 12 }}>
            기본 정보
          </p>

          <label style={fieldLabelStyle}>제목 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="교안 제목을 입력하세요"
            style={inputStyle}
          />

          <label style={fieldLabelStyle}>성경 본문 *</label>
          <input
            type="text"
            value={biblePassage}
            onChange={(e) => setBiblePassage(e.target.value)}
            placeholder="예: 민수기 20:1-13"
            style={inputStyle}
          />

          <label style={fieldLabelStyle}>발행일 *</label>
          <input
            type="date"
            value={publishedDate}
            onChange={(e) => setPublishedDate(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={cardStyle}>
          <div style={sectionTopStyle}>
            <div>
              <p style={sectionLabelStyle}>말씀 핵심 요약</p>
              <p style={sectionMetaStyle}>도입 화면에 노출되는 3개 요약입니다.</p>
            </div>
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ marginBottom: i < 2 ? 12 : 0 }}>
              <label style={fieldLabelStyle}>핵심 {i + 1}</label>
              <input
                type="text"
                value={summary[i] ?? ""}
                onChange={(e) => {
                  const next = [...summary];
                  next[i] = e.target.value;
                  setSummary(next);
                }}
                placeholder={`핵심 메시지 ${i + 1}`}
                style={inputStyle}
              />
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          <MiniButton onClick={addPointSection}>질문 카드 추가</MiniButton>
          <MiniButton onClick={addApplicationSection}>적용 질문 섹션 추가</MiniButton>
        </div>

        {sections.map((section, index) => (
          <SectionCard
            key={`${section.type}-${index}`}
            section={section}
            index={index}
            totalSections={sections.length}
            onChange={(updated) => updateSection(index, updated)}
            onMove={(direction) => moveSection(index, direction)}
            onDelete={() => deleteSection(index)}
          />
        ))}

        {quizzes.length > 0 ? (
          <>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#0D1C2D", margin: "22px 0 12px" }}>
              퀴즈 ({quizzes.length}개)
            </p>
            {quizzes.map((quiz, index) => (
              <QuizCard
                key={index}
                quiz={quiz}
                index={index}
                onChange={(updated) => {
                  setQuizzes((prev) => prev.map((q, i) => (i === index ? updated : q)));
                }}
              />
            ))}
          </>
        ) : null}

        {errorMessage ? (
          <div
            style={{
              background: "rgba(220,38,38,0.08)",
              border: "1px solid rgba(220,38,38,0.3)",
              borderRadius: 10,
              padding: "12px 14px",
              marginTop: 12,
              color: "#DC2626",
              fontSize: 14,
            }}
          >
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div
            style={{
              background: "rgba(22,163,74,0.08)",
              border: "1px solid rgba(22,163,74,0.3)",
              borderRadius: 10,
              padding: "12px 14px",
              marginTop: 12,
              color: "#16A34A",
              fontSize: 14,
            }}
          >
            {successMessage}
          </div>
        ) : null}
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(13,28,45,0.08)",
          padding: "12px 16px",
          display: "flex",
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={() => void handleReanalyze()}
          disabled={isActionDisabled}
          style={{
            flex: "0 0 auto",
            padding: "12px 16px",
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 14,
            border: "1.5px solid rgba(13,28,45,0.16)",
            background: "white",
            color: "rgba(13,28,45,0.72)",
            cursor: isActionDisabled ? "not-allowed" : "pointer",
          }}
        >
          다시 분석
        </button>

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isActionDisabled}
          style={{
            flex: 1,
            padding: "12px 24px",
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 14,
            border: "1.5px solid #1A56DB",
            background: "white",
            color: "#1A56DB",
            cursor: isActionDisabled ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "저장 중..." : "임시 저장"}
        </button>

        <button
          type="button"
          onClick={() => void handlePublish()}
          disabled={isActionDisabled}
          style={{
            flex: 1,
            padding: "12px 24px",
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 14,
            border: "none",
            background: isActionDisabled ? "rgba(26,86,219,0.35)" : "#1A56DB",
            color: "white",
            cursor: isActionDisabled ? "not-allowed" : "pointer",
          }}
        >
          {publishing ? "발행 중..." : "발행"}
        </button>
      </div>
    </main>
  );
}
