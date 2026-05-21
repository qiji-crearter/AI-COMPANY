import { useNavigate } from "@/lib/router";

export function AiCompanyCosts() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: "24px" }}>
      <h1 style={{ marginBottom: "24px", fontSize: "24px", fontWeight: 600 }}>API 消耗分析</h1>
      <p style={{ color: "#666" }}>消耗分析功能正在集成中。请使用 Paperclip 内置的 <a href="/costs" style={{ color: "#1565c0" }}>成本页面</a> 查看详细数据。</p>
      <button
        onClick={() => navigate("/ai-company")}
        style={{ marginTop: "16px", padding: "8px 16px", background: "#f0f0f0", border: "1px solid #ddd", borderRadius: "6px", cursor: "pointer" }}
      >
        ← 返回 Dashboard
      </button>
    </div>
  );
}
