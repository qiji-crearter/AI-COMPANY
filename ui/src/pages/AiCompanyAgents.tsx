import { useNavigate } from "@/lib/router";

export function AiCompanyAgents() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: "24px" }}>
      <h1 style={{ marginBottom: "24px", fontSize: "24px", fontWeight: 600 }}>AI 员工列表</h1>
      <p style={{ color: "#666" }}>员工管理功能正在集成中。使用 CLI 命令 <code>ai-company agent list</code> 查看员工。</p>
      <button
        onClick={() => navigate("/ai-company")}
        style={{ marginTop: "16px", padding: "8px 16px", background: "#f0f0f0", border: "1px solid #ddd", borderRadius: "6px", cursor: "pointer" }}
      >
        ← 返回 Dashboard
      </button>
    </div>
  );
}
